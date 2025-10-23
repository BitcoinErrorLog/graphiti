import { logger } from '../utils/logger';
import { storage } from '../utils/storage';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { annotationStorage, Annotation } from '../utils/annotations';

/**
 * Background service worker for the extension
 */

logger.info('Background', 'Service worker initialized');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Background', 'Extension installed/updated', { reason: details.reason });
  
  if (details.reason === 'install') {
    // First time installation
    logger.info('Background', 'First time installation - showing welcome');
  } else if (details.reason === 'update') {
    // Extension updated
    logger.info('Background', 'Extension updated', { 
      previousVersion: details.previousVersion 
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Background', 'Message received', { message, sender: sender.id });

  if (message.type === 'OPEN_SIDE_PANEL') {
    // Open side panel for the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
        logger.info('Background', 'Side panel opened', { tabId: tabs[0].id });
      }
    });
    sendResponse({ success: true });
  }

  if (message.type === 'CREATE_ANNOTATION') {
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

  if (message.type === 'GET_ANNOTATIONS') {
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

  if (message.type === 'SHOW_ANNOTATION') {
    // Open side panel and notify it to show the annotation
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
        // Notify sidebar to scroll to the annotation
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'SCROLL_TO_ANNOTATION',
            annotationId: message.annotationId,
          });
        }, 500);
      }
    });
    sendResponse({ success: true });
  }

  if (message.type === 'OPEN_PUBKY_PROFILE') {
    // Open profile renderer in new tab
    openPubkyProfile(message.url);
    sendResponse({ success: true });
  }

  if (message.type === 'SAVE_DRAWING') {
    // Handle drawing save
    handleSaveDrawing(message.url, message.canvasData)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        logger.error('Background', 'Failed to save drawing', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_DRAWING') {
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

  return true; // Keep message channel open for async response
});

/**
 * Handle annotation creation
 * Note: Pubky SDK initialization fails in service worker context due to window dependency
 * For now, we save locally and the sync happens through the popup when it's opened
 */
async function handleCreateAnnotation(annotation: Annotation): Promise<any> {
  try {
    logger.info('Background', 'Processing annotation', { id: annotation.id });

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

    // Save annotation locally first
    await annotationStorage.saveAnnotation(annotation);

    // Try to create Pubky post
    // Note: This may fail in service worker context, so we handle it gracefully
    try {
      const postUri = await pubkyAPISDK.createAnnotationPost(
        annotation.url,
        annotation.selectedText,
        annotation.comment,
        {
          startPath: annotation.startPath,
          endPath: annotation.endPath,
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset,
        }
      );

      // Update annotation with post URI
      annotation.postUri = postUri;
      await annotationStorage.saveAnnotation(annotation);

      logger.info('Background', 'Annotation synced to Pubky', { 
        id: annotation.id, 
        postUri 
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
        postUri, 
        author: session.pubky 
      };
    } catch (pubkyError) {
      // Pubky sync failed, but we have it locally
      logger.warn('Background', 'Failed to sync to Pubky, annotation saved locally', pubkyError);
      
      return { 
        success: true,  // Local save succeeded
        warning: 'Annotation saved locally but not yet synced to Pubky network',
        author: session.pubky 
      };
    }
  } catch (error) {
    logger.error('Background', 'Failed to process annotation', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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
            startPath: data.metadata.startPath,
            endPath: data.metadata.endPath,
            startOffset: data.metadata.startOffset,
            endOffset: data.metadata.endOffset,
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
    logger.error('Background', 'Failed to get annotations', error as Error);
    return [];
  }
}

/**
 * Handle drawing save
 */
async function handleSaveDrawing(url: string, canvasData: string): Promise<any> {
  try {
    logger.info('Background', 'Saving drawing', { url });

    // Get current session
    const session = await storage.getSession();
    if (!session) {
      logger.warn('Background', 'Not authenticated, saving drawing locally only');
    }

    // Create drawing object
    const drawing = {
      id: `drawing-${Date.now()}`,
      url,
      canvasData,
      timestamp: Date.now(),
      author: session?.pubky || '',
    };

    // Save drawing locally
    await storage.saveDrawing(drawing);

    logger.info('Background', 'Drawing saved locally', { url });

    // Note: Syncing to Pubky will happen when popup opens and calls DrawingSync
    return { 
      success: true,
      message: 'Drawing saved locally. Will sync to Pubky when you open the extension popup.'
    };
  } catch (error) {
    logger.error('Background', 'Failed to save drawing', error as Error);
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
    logger.error('Background', 'Failed to get drawing', error as Error);
    return null;
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
chrome.commands.onCommand.addListener((command) => {
  logger.info('Background', 'Command received', { command });
  
  if (command === 'toggle-sidepanel') {
    // Open the side panel - must be synchronous to preserve user gesture
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }, () => {
          if (chrome.runtime.lastError) {
            logger.error('Background', 'Failed to toggle side panel', new Error(chrome.runtime.lastError.message));
          } else {
            logger.info('Background', 'Side panel opened via keyboard shortcut', { 
              tabId: tab.id,
              windowId: tab.windowId 
            });
          }
        });
      }
    });
  }
  
  if (command === 'open-annotations') {
    // Open side panel and switch to annotations tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }, () => {
          if (chrome.runtime.lastError) {
            logger.error('Background', 'Failed to open annotations', new Error(chrome.runtime.lastError.message));
          } else {
            // Send message to sidebar to switch to annotations tab
            setTimeout(() => {
              chrome.runtime.sendMessage({
                type: 'SWITCH_TO_ANNOTATIONS',
              }).catch(() => {
                // Sidebar might not be ready yet, that's ok
              });
            }, 500);
            
            logger.info('Background', 'Side panel opened to annotations via keyboard shortcut', { 
              tabId: tab.id,
              windowId: tab.windowId 
            });
          }
        });
      }
    });
  }

  if (command === 'toggle-drawing') {
    // Toggle drawing mode on the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:') && !tab.url.startsWith('chrome-extension://')) {
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

// Handle errors
self.addEventListener('error', (event) => {
  logger.error('Background', 'Unhandled error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  logger.error('Background', 'Unhandled promise rejection', new Error(event.reason));
});

logger.info('Background', 'Service worker ready');

