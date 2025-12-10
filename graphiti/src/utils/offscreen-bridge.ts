/**
 * @fileoverview Bridge for communicating with the offscreen document.
 * 
 * Provides functions for the background service worker to:
 * - Create/close the offscreen document
 * - Send messages to the offscreen document for SDK operations
 * - Track sync status
 * 
 * @module utils/offscreen-bridge
 */

import { logger } from './logger';
import { TIMING_CONSTANTS } from './constants';
import { toError } from './type-guards';

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

/**
 * Reasons for creating the offscreen document
 */
type OffscreenReason = chrome.offscreen.Reason;

/**
 * Check if an offscreen document already exists
 */
async function hasOffscreenDocument(): Promise<boolean> {
  // `chrome.offscreen.hasDocument()` is available in Chrome 116+
  if ('getContexts' in chrome.runtime) {
    const contexts = await (chrome.runtime as any).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
    });
    return contexts.length > 0;
  }
  
  // Fallback: try to send a ping message
  try {
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'PING' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create the offscreen document if it doesn't exist
 */
async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    logger.debug('OffscreenBridge', 'Offscreen document already exists');
    return;
  }

  logger.info('OffscreenBridge', 'Creating offscreen document');
  
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['DOM_SCRAPING' as OffscreenReason], // Using DOM_SCRAPING as reason for SDK access
      justification: 'Pubky SDK requires DOM APIs (window) not available in service workers',
    });
    
    // Wait a bit for the document to initialize
    await new Promise(resolve => setTimeout(resolve, TIMING_CONSTANTS.OFFSCREEN_INIT_DELAY));
    
    logger.info('OffscreenBridge', 'Offscreen document created successfully');
  } catch (error) {
    // Document might already exist (race condition)
    if ((error as Error).message?.includes('single offscreen document')) {
      logger.debug('OffscreenBridge', 'Offscreen document already exists (race)');
      return;
    }
    logger.error('OffscreenBridge', 'Failed to create offscreen document', error as Error);
    throw error;
  }
}

/**
 * Close the offscreen document
 */
async function closeOffscreenDocument(): Promise<void> {
  if (!(await hasOffscreenDocument())) {
    return;
  }

  try {
    await chrome.offscreen.closeDocument();
    logger.info('OffscreenBridge', 'Offscreen document closed');
      } catch (error) {
        logger.error('OffscreenBridge', 'Failed to close offscreen document', toError(error));
      }
}

/**
 * Send a message to the offscreen document and wait for response
 */
async function sendToOffscreen<T = any>(
  type: string,
  data?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    await ensureOffscreenDocument();
    
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type,
      data,
    });
    
    return response || { success: false, error: 'No response from offscreen' };
      } catch (error) {
        const errorObj = toError(error);
        logger.error('OffscreenBridge', `Failed to send ${type} to offscreen`, errorObj);
        return { success: false, error: errorObj.message };
      }
}

/**
 * Sync a single annotation via offscreen document
 */
export async function syncAnnotationViaOffscreen(data: {
  url: string;
  selectedText: string;
  comment: string;
  metadata: {
    prefix: string;
    exact: string;
    suffix: string;
  };
}): Promise<{ success: boolean; postUri?: string; error?: string }> {
  const result = await sendToOffscreen<{ postUri: string }>('SYNC_ANNOTATION', data);
  return {
    success: result.success,
    postUri: result.data?.postUri,
    error: result.error,
  };
}

/**
 * Sync a single drawing via offscreen document
 */
export async function syncDrawingViaOffscreen(data: {
  url: string;
  canvasData: string;
  timestamp: number;
  author: string;
}): Promise<{ success: boolean; pubkyUrl?: string; error?: string }> {
  const result = await sendToOffscreen<{ pubkyUrl: string }>('SYNC_DRAWING', data);
  return {
    success: result.success,
    pubkyUrl: result.data?.pubkyUrl,
    error: result.error,
  };
}

/**
 * Sync all pending content via offscreen document
 */
export async function syncAllPendingViaOffscreen(): Promise<{
  success: boolean;
  annotationsSynced?: number;
  drawingsSynced?: number;
  error?: string;
}> {
  const result = await sendToOffscreen<{ annotationsSynced: number; drawingsSynced: number }>(
    'SYNC_ALL_PENDING'
  );
  return {
    success: result.success,
    annotationsSynced: result.data?.annotationsSynced,
    drawingsSynced: result.data?.drawingsSynced,
    error: result.error,
  };
}

/**
 * Get sync status via offscreen document
 */
export async function getSyncStatusViaOffscreen(): Promise<{
  success: boolean;
  pendingAnnotations?: number;
  pendingDrawings?: number;
  hasPending?: boolean;
  error?: string;
}> {
  const result = await sendToOffscreen<{
    pendingAnnotations: number;
    pendingDrawings: number;
    hasPending: boolean;
  }>('GET_SYNC_STATUS');
  return {
    success: result.success,
    pendingAnnotations: result.data?.pendingAnnotations,
    pendingDrawings: result.data?.pendingDrawings,
    hasPending: result.data?.hasPending,
    error: result.error,
  };
}

/**
 * Check if offscreen API is available
 */
export function isOffscreenAvailable(): boolean {
  return typeof chrome !== 'undefined' && 
         typeof chrome.offscreen !== 'undefined' &&
         typeof chrome.offscreen.createDocument === 'function';
}

export const offscreenBridge = {
  ensureOffscreenDocument,
  closeOffscreenDocument,
  syncAnnotation: syncAnnotationViaOffscreen,
  syncDrawing: syncDrawingViaOffscreen,
  syncAllPending: syncAllPendingViaOffscreen,
  getSyncStatus: getSyncStatusViaOffscreen,
  isAvailable: isOffscreenAvailable,
};

