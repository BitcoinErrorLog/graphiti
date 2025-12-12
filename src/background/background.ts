import { logger } from '../utils/logger';
import { storage, Drawing } from '../utils/storage';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { annotationStorage, Annotation } from '../utils/annotations';
import { offscreenBridge } from '../utils/offscreen-bridge';
import { 
  validateAnnotation, 
  validateUrl, 
  validateCanvasData,
  sanitizeForDisplay 
} from '../utils/validation';
import ErrorHandler from '../utils/error-handler';
import { MESSAGE_TYPES, ALARM_NAMES, COMMAND_NAMES, TIMING_CONSTANTS, UI_CONSTANTS } from '../utils/constants';
import { toError } from '../utils/type-guards';
import { measureOperation } from '../utils/performance-monitor';

/**
 * Background service worker for the extension
 * 
 * Uses chrome.offscreen API for Pubky SDK operations that require DOM/window access.
 */

logger.info('Background', 'Service worker initialized');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Background', 'Extension installed/updated', { reason: details.reason });
  
  if (details.reason === 'install') {
    // First time installation
    logger.info('Background', 'First time installation - showing welcome');
    
    // Create periodic sync alarm
    chrome.alarms.create(ALARM_NAMES.SYNC_PENDING_CONTENT, { 
      periodInMinutes: TIMING_CONSTANTS.SYNC_ALARM_INTERVAL_MINUTES 
    });
    logger.info('Background', 'Sync alarm created');
  } else if (details.reason === 'update') {
    // Extension updated
    logger.info('Background', 'Extension updated', { 
      previousVersion: details.previousVersion 
    });
    
    // Ensure alarm exists
    chrome.alarms.get(ALARM_NAMES.SYNC_PENDING_CONTENT, (alarm) => {
      if (!alarm) {
        chrome.alarms.create(ALARM_NAMES.SYNC_PENDING_CONTENT, { 
          periodInMinutes: TIMING_CONSTANTS.SYNC_ALARM_INTERVAL_MINUTES 
        });
        logger.info('Background', 'Sync alarm recreated after update');
      }
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Background', 'Message received', { message, sender: sender.id });

  if (message.type === 'OPEN_SIDE_PANEL') {
    // Note: sidePanel.open() requires user gesture - the popup should call it directly
    // This handler exists for backwards compatibility but may fail without user gesture
    logger.info('Background', 'OPEN_SIDE_PANEL received - popup should call sidePanel.open() directly');
    sendResponse({ success: true });
  }

  if (message.type === 'OPEN_SIDE_PANEL_FOR_ANNOTATION') {
    // Open sidepanel in response to annotation click (user gesture preserved)
    // Must call sidePanel.open() immediately to preserve user gesture context
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.sidePanel.open({ tabId }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Background', 'Failed to open sidepanel', new Error(chrome.runtime.lastError.message));
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          logger.info('Background', 'Sidepanel opened for annotation', { 
            annotationId: message.annotationId,
            tabId 
          });
          
          // Send scroll message after a short delay to allow sidepanel to load
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'SCROLL_TO_ANNOTATION',
              annotationId: message.annotationId,
            }).catch(() => {
              // Sidepanel might not be ready yet, that's okay
              logger.debug('Background', 'Sidepanel not ready for scroll message yet');
            });
          }, 300);
          
          sendResponse({ success: true });
        }
      });
    } else {
      logger.warn('Background', 'No tab ID available for opening sidepanel');
      sendResponse({ success: false, error: 'No tab ID available' });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === MESSAGE_TYPES.CREATE_ANNOTATION) {
    // Handle annotation creation
    handleCreateAnnotation(message.annotation)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to handle annotation creation', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === MESSAGE_TYPES.GET_ANNOTATIONS) {
    // Handle annotation retrieval
    handleGetAnnotations(message.url)
      .then((annotations) => {
        sendResponse({ annotations });
      })
      .catch((error) => {
        logger.error('Background', 'Failed to get annotations', error);
        sendResponse({ annotations: [] });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.SHOW_ANNOTATION) {
    // Note: sidePanel.open() requires user gesture - can't open from content script click
    // Just notify sidebar to scroll to the annotation (if it's already open)
    chrome.runtime.sendMessage({
      type: 'SCROLL_TO_ANNOTATION',
      annotationId: message.annotationId,
    });
    logger.info('Background', 'Scroll to annotation requested', { annotationId: message.annotationId });
    sendResponse({ success: true });
  }

  if (message.type === MESSAGE_TYPES.OPEN_PUBKY_PROFILE) {
    // Open profile renderer in new tab
    openPubkyProfile(message.url);
    sendResponse({ success: true });
  }

  if (message.type === MESSAGE_TYPES.SAVE_DRAWING) {
    // Handle drawing save
    const drawing = message.drawing || message;
    handleSaveDrawing(drawing.url, drawing.canvasData)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to save drawing', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === MESSAGE_TYPES.GET_DRAWING) {
    // Handle drawing retrieval
    handleGetDrawing(message.url)
      .then((drawing) => {
        sendResponse({ drawing });
      })
      .catch((error) => {
        logger.error('Background', 'Failed to get drawing', error);
        sendResponse({ drawing: null });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.GET_SYNC_STATUS) {
    // Get sync status via offscreen
    handleGetSyncStatus()
      .then((status) => {
        sendResponse(status);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to get sync status', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.SYNC_ALL_PENDING) {
    // Sync all pending content via offscreen
    handleSyncAllPending()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to sync all pending', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.GET_STORAGE_QUOTA) {
    // Get storage quota information
    storage.checkStorageQuota()
      .then((quota) => {
        sendResponse(quota);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to get storage quota', error);
        sendResponse({ hasSpace: true, usedMB: 0, quotaMB: 5, percentUsed: 0 });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.SHOW_TOAST) {
    // Show toast notification (for content scripts)
    // Use chrome.notifications API as fallback since content scripts can't access popup toast system
    const { message: toastMessage } = message;
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl,
        title: 'Graphiti',
        message: toastMessage,
      }, () => {
        if (chrome.runtime.lastError) {
          logger.warn('Background', 'Failed to show notification', new Error(chrome.runtime.lastError.message));
        }
      });
    } catch (error) {
      logger.warn('Background', 'Failed to show notification', toError(error));
    }
    
    sendResponse({ success: true });
    return true;
  }

  return true; // Keep message channel open for async response
});

/**
 * Handle annotation creation
 * Uses chrome.offscreen API to run Pubky SDK operations
 */
async function handleCreateAnnotation(annotation: Annotation): Promise<any> {
  return measureOperation('background:handleCreateAnnotation', async () => {
    try {
      logger.info('Background', 'Processing annotation', { id: annotation.id });

    // Validate annotation data
    const validation = validateAnnotation({
      url: annotation.url,
      selectedText: annotation.selectedText,
      comment: annotation.comment,
    });

    if (!validation.valid) {
      logger.warn('Background', 'Annotation validation failed', { error: validation.error });
      return {
        success: false,
        error: validation.error || 'Invalid annotation data'
      };
    }

    // Sanitize text content for safety
    annotation.selectedText = sanitizeForDisplay(annotation.selectedText);
    annotation.comment = sanitizeForDisplay(annotation.comment);

    // Get current session
    const session = await storage.getSession();
    if (!session) {
      logger.warn('Background', 'Not authenticated, saving annotation locally only');
      // Still save locally
      await annotationStorage.saveAnnotation(annotation);
      return { 
        success: false, 
        error: 'Not authenticated. Annotation saved locally only.' 
      };
    }

    // Set author from session
    annotation.author = session.pubky;

    // Save annotation locally first (immediate feedback)
    await annotationStorage.saveAnnotation(annotation);

    // Try to sync via offscreen document (has access to window/DOM for Pubky SDK)
    if (offscreenBridge.isAvailable()) {
      try {
        logger.info('Background', 'Syncing annotation via offscreen document');
        
        const result = await offscreenBridge.syncAnnotation({
          url: annotation.url,
          selectedText: annotation.selectedText,
          comment: annotation.comment,
          metadata: {
            prefix: annotation.prefix || '',
            exact: annotation.exact || annotation.selectedText,
            suffix: annotation.suffix || '',
          },
        });

        if (result.success && result.postUri) {
          // Update annotation with post URI
          annotation.postUri = result.postUri;
          await annotationStorage.saveAnnotation(annotation);

          logger.info('Background', 'Annotation synced to Pubky via offscreen', { 
            id: annotation.id, 
            postUri: result.postUri 
          });

          // Notify other tabs
          const tabs = await chrome.tabs.query({ url: annotation.url });
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'ANNOTATION_CREATED',
                annotation,
              }).catch(() => {
                // Ignore errors if tab is not ready
              });
            }
          }

          return { 
            success: true, 
            postUri: result.postUri, 
            author: session.pubky 
          };
        } else {
          // Offscreen sync failed, but we have it locally
          logger.warn('Background', 'Offscreen sync failed, annotation saved locally', { error: result.error });
          
          return { 
            success: true,  // Local save succeeded
            warning: 'Annotation saved locally but not yet synced to Pubky network',
            author: session.pubky 
          };
        }
      } catch (offscreenError) {
        logger.warn('Background', 'Offscreen sync error, annotation saved locally', offscreenError);
        
        return { 
          success: true,  // Local save succeeded
          warning: 'Annotation saved locally but not yet synced to Pubky network',
          author: session.pubky 
        };
      }
    } else {
      // Offscreen API not available, fall back to local save only
      logger.warn('Background', 'Offscreen API not available, annotation saved locally only');
      
      return { 
        success: true,  // Local save succeeded
        warning: 'Annotation saved locally. Will sync when extension popup is opened.',
        author: session.pubky 
      };
    }
    } catch (error) {
      logger.error('Background', 'Failed to process annotation', toError(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

/**
 * Handle annotation retrieval
 */
async function handleGetAnnotations(url: string): Promise<Annotation[]> {
  try {
    logger.info('Background', 'Getting annotations for URL', { url });

    // Get local annotations
    const localAnnotations = await annotationStorage.getAnnotationsForUrl(url);

    // Get session (optional for public viewing)
    const session = await storage.getSession();

    // Search for annotation posts from all users via Nexus
    const posts = await pubkyAPISDK.searchAnnotationsByUrl(url, session?.pubky);

    // Parse posts into annotations
    const remoteAnnotations: Annotation[] = [];
    for (const post of posts) {
      try {
        const content = post.details?.content || post.content || '';
        const data = JSON.parse(content);
        
        if (data.type === 'annotation') {
          const annotation: Annotation = {
            id: post.details?.id || post.id || '',
            url: data.url,
            selectedText: data.selectedText,
            comment: data.comment,
            prefix: data.metadata?.prefix || '',
            exact: data.metadata?.exact || data.selectedText,
            suffix: data.metadata?.suffix || '',
            // Legacy support
            startPath: data.metadata?.startPath,
            endPath: data.metadata?.endPath,
            startOffset: data.metadata?.startOffset,
            endOffset: data.metadata?.endOffset,
            timestamp: post.details?.indexed_at || Date.now(),
            author: post.details?.author || post.author_id || '',
            postUri: post.details?.uri || '',
            color: 'rgba(163, 230, 53, 0.25)',
          };
          remoteAnnotations.push(annotation);
        }
      } catch (parseError) {
        logger.warn('Background', 'Failed to parse annotation post', parseError);
      }
    }

    // Combine local and remote, removing duplicates
    const allAnnotations = [...localAnnotations];
    const localIds = new Set(localAnnotations.map(a => a.id));
    
    for (const remote of remoteAnnotations) {
      if (!localIds.has(remote.id)) {
        allAnnotations.push(remote);
        // Save remote annotation locally for faster future access
        await annotationStorage.saveAnnotation(remote);
      }
    }

    logger.info('Background', 'Annotations retrieved', { 
      total: allAnnotations.length,
      local: localAnnotations.length,
      remote: remoteAnnotations.length 
    });

    return allAnnotations;
  } catch (error) {
      logger.error('Background', 'Failed to get annotations', toError(error));
    return [];
  }
}

/**
 * Handle drawing save
 * Uses chrome.offscreen API to sync to Pubky
 */
async function handleSaveDrawing(url: string, canvasData: string): Promise<any> {
  try {
    logger.info('Background', 'Saving drawing', { url });

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      logger.warn('Background', 'Drawing URL validation failed', { error: urlValidation.error });
      return {
        success: false,
        error: urlValidation.error || 'Invalid URL'
      };
    }

    // Validate canvas data
    const canvasValidation = validateCanvasData(canvasData);
    if (!canvasValidation.valid) {
      logger.warn('Background', 'Drawing canvas data validation failed', { error: canvasValidation.error });
      return {
        success: false,
        error: canvasValidation.error || 'Invalid drawing data'
      };
    }

    // Get current session
    const session = await storage.getSession();
    if (!session) {
      logger.warn('Background', 'Not authenticated, saving drawing locally only');
    }

    // Create drawing object with validated URL
    const drawing = {
      id: `drawing-${Date.now()}`,
      url: urlValidation.sanitized || url,
      canvasData,
      timestamp: Date.now(),
      author: session?.pubky || '',
    };

    // Save drawing locally first (immediate)
    await storage.saveDrawing(drawing);

    logger.info('Background', 'Drawing saved locally', { url });

    // Try to sync via offscreen if authenticated
    if (session && offscreenBridge.isAvailable()) {
      try {
        logger.info('Background', 'Syncing drawing via offscreen document');
        
        const result = await offscreenBridge.syncDrawing({
          url: drawing.url,
          canvasData: drawing.canvasData,
          timestamp: drawing.timestamp,
          author: drawing.author,
        });

        if (result.success && result.pubkyUrl) {
          // Update drawing with pubky URL
          const updatedDrawing: Drawing = {
            ...drawing,
            pubkyUrl: result.pubkyUrl,
          };
          await storage.saveDrawing(updatedDrawing);

          logger.info('Background', 'Drawing synced to Pubky via offscreen', { 
            url, 
            pubkyUrl: result.pubkyUrl 
          });

          return { 
            success: true,
            message: 'Drawing saved and synced to Pubky!',
            pubkyUrl: result.pubkyUrl
          };
        } else {
          logger.warn('Background', 'Offscreen drawing sync failed', { error: result.error });
        }
      } catch (offscreenError) {
        logger.warn('Background', 'Offscreen drawing sync error', offscreenError);
      }
    }

    return { 
      success: true,
      message: session ? 'Drawing saved locally. Will sync when possible.' : 'Drawing saved locally.'
    };
  } catch (error) {
      logger.error('Background', 'Failed to save drawing', toError(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle drawing retrieval
 */
async function handleGetDrawing(url: string): Promise<any> {
  try {
    logger.info('Background', 'Getting drawing for URL', { url });

    // Get drawing from local storage
    const drawing = await storage.getDrawing(url);

    if (drawing) {
      logger.info('Background', 'Drawing found', { url });
      return drawing;
    } else {
      logger.debug('Background', 'No drawing found for URL', { url });
      return null;
    }
  } catch (error) {
      logger.error('Background', 'Failed to get drawing', toError(error));
    return null;
  }
}

/**
 * Get sync status via offscreen document
 */
async function handleGetSyncStatus(): Promise<any> {
  try {
    logger.info('Background', 'Getting sync status');

    if (!offscreenBridge.isAvailable()) {
      // Fall back to local check
      const annotations = await annotationStorage.getAllAnnotations();
      const drawings = await storage.getAllDrawings();
      
      let pendingAnnotations = 0;
      for (const url in annotations) {
        for (const annotation of annotations[url]) {
          if (!annotation.postUri && annotation.author) {
            pendingAnnotations++;
          }
        }
      }
      
      let pendingDrawings = 0;
      for (const url in drawings) {
        if (!drawings[url].pubkyUrl && drawings[url].author) {
          pendingDrawings++;
        }
      }

      return {
        success: true,
        pendingAnnotations,
        pendingDrawings,
        hasPending: pendingAnnotations > 0 || pendingDrawings > 0,
        offscreenAvailable: false,
      };
    }

    const status = await offscreenBridge.getSyncStatus();
    return {
      ...status,
      offscreenAvailable: true,
    };
  } catch (error) {
      logger.error('Background', 'Failed to get sync status', toError(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync all pending content via offscreen document
 */
async function handleSyncAllPending(): Promise<any> {
  try {
    logger.info('Background', 'Syncing all pending content');

    if (!offscreenBridge.isAvailable()) {
      return {
        success: false,
        error: 'Offscreen API not available. Please open the extension popup to sync.',
      };
    }

    const result = await offscreenBridge.syncAllPending();
    
    if (result.success) {
      logger.info('Background', 'All pending content synced', {
        annotationsSynced: result.annotationsSynced,
        drawingsSynced: result.drawingsSynced,
      });
    }

    return result;
  } catch (error) {
      logger.error('Background', 'Failed to sync all pending', toError(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Open a Pubky profile in the profile renderer
 */
function openPubkyProfile(url: string) {
  logger.info('Background', 'Opening Pubky profile', { url });

  // Get the extension's profile renderer URL
  const rendererUrl = chrome.runtime.getURL(`src/profile/profile-renderer.html?url=${encodeURIComponent(url)}`);

  // Open in new tab
  chrome.tabs.create({
    url: rendererUrl,
  });
}

/**
 * Handle navigation to pubky:// URLs in omnibox/address bar
 */
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  const url = details.url;
  
  // Check if it's a pubky:// URL
  if (url.startsWith('pubky://') && details.frameId === 0) {
    logger.info('Background', 'Intercepting pubky URL from omnibox', { url });
    
    // Cancel the navigation and open our profile renderer instead
    // We can't cancel navigation directly, so we'll redirect
    openPubkyProfile(url);
  }
});

// Handle keyboard commands
// NOTE: Must NOT use async/await here to preserve user gesture context
logger.info('Background', 'Registering keyboard command listener');
chrome.commands.onCommand.addListener((command) => {
  logger.info('Background', 'Command received', { command });
  
  if (command === COMMAND_NAMES.TOGGLE_SIDEPANEL) {
    logger.info('Background', 'toggle-sidepanel command triggered');
    // Open the side panel - must call open() immediately to preserve user gesture
    // Using windowId instead of tabId since it's available synchronously
    chrome.windows.getCurrent((window) => {
      if (!window?.id) {
        logger.warn('Background', 'No current window found for side panel toggle');
        return;
      }

      logger.info('Background', 'Opening side panel', { windowId: window.id });
      chrome.sidePanel.open({ windowId: window.id }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Background', 'Failed to open side panel', new Error(chrome.runtime.lastError.message));
        } else {
          logger.info('Background', 'Side panel opened via keyboard shortcut', { windowId: window.id });
        }
      });
    });
  }
  
  if (command === COMMAND_NAMES.OPEN_ANNOTATIONS) {
    logger.info('Background', 'open-annotations command triggered');
    // Open side panel and switch to annotations tab
    // Must call open() immediately to preserve user gesture
    chrome.windows.getCurrent((window) => {
      if (!window?.id) {
        logger.warn('Background', 'No current window found for annotations');
        return;
      }

      logger.info('Background', 'Opening side panel for annotations', { windowId: window.id });
      chrome.sidePanel.open({ windowId: window.id }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Background', 'Failed to open annotations', new Error(chrome.runtime.lastError.message));
        } else {
          logger.info('Background', 'Side panel opened, switching to annotations tab');
          // Send message to sidebar to switch to annotations tab
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'SWITCH_TO_ANNOTATIONS',
            }).catch(() => {
              // Sidebar might not be ready yet, that's ok
            });
          }, UI_CONSTANTS.DELAYS.SIDE_PANEL_SWITCH);
          
          logger.info('Background', 'Side panel opened to annotations via keyboard shortcut', { 
            windowId: window.id
          });
        }
      });
    });
  }

  if (command === COMMAND_NAMES.TOGGLE_DRAWING) {
    logger.info('Background', 'toggle-drawing command triggered');
    // Toggle drawing mode on the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      logger.info('Background', 'Active tab for drawing', { tabId: tab?.id, url: tab?.url });
      
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:') && !tab.url.startsWith('chrome-extension://')) {
        logger.info('Background', 'Sending TOGGLE_DRAWING_MODE to tab', { tabId: tab.id });
        chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_DRAWING_MODE',
        }, (response) => {
          if (chrome.runtime.lastError) {
            logger.error('Background', 'Failed to toggle drawing mode - content script may not be ready', new Error(chrome.runtime.lastError.message));
            // Try to notify user
            chrome.notifications?.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Drawing Mode',
              message: 'Please refresh the page to use drawing mode on this site.'
            });
          } else {
            logger.info('Background', 'Drawing mode toggled via keyboard shortcut', { 
              tabId: tab.id,
              active: response?.active 
            });
          }
        });
      } else {
        logger.warn('Background', 'Cannot use drawing mode on this page', { url: tab?.url });
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Drawing Mode',
          message: 'Drawing mode is not available on this page. Try a regular website.'
        });
      }
    });
  }
});

logger.info('Background', 'Command listeners registered');

// Handle errors
self.addEventListener('error', (event) => {
  ErrorHandler.handle(event.error, {
    context: 'Background',
    data: { type: 'unhandled_error' },
    showNotification: true,
  });
});

self.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handle(new Error(event.reason), {
    context: 'Background',
    data: { type: 'unhandled_rejection' },
    showNotification: true,
  });
});

// Handle periodic sync alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAMES.SYNC_PENDING_CONTENT) {
    logger.info('Background', 'Sync alarm triggered, checking for pending content');
    
    try {
      // Check if user is authenticated
      const session = await storage.getSession();
      if (!session) {
        logger.debug('Background', 'No session, skipping sync');
        return;
      }
      
      // Check if offscreen API is available
      if (!offscreenBridge.isAvailable()) {
        logger.debug('Background', 'Offscreen API not available, skipping background sync');
        return;
      }
      
      // Get sync status
      const status = await offscreenBridge.getSyncStatus();
      
      if (!status.success) {
        logger.warn('Background', 'Failed to get sync status', { error: status.error });
        return;
      }
      
      if (!status.hasPending) {
        logger.debug('Background', 'No pending content to sync');
        return;
      }
      
      logger.info('Background', 'Found pending content, syncing via offscreen', {
        pendingAnnotations: status.pendingAnnotations,
        pendingDrawings: status.pendingDrawings
      });
      
      // Sync all pending content via offscreen document
      const syncResult = await offscreenBridge.syncAllPending();
      
      if (syncResult.success) {
        logger.info('Background', 'Background sync completed', {
          annotationsSynced: syncResult.annotationsSynced,
          drawingsSynced: syncResult.drawingsSynced
        });
      } else {
        logger.warn('Background', 'Background sync failed', { error: syncResult.error });
      }
      
    } catch (error) {
      logger.error('Background', 'Error during alarm sync', toError(error));
    }
  }
});

logger.info('Background', 'Service worker ready');

