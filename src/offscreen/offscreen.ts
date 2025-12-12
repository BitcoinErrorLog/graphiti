/**
 * @fileoverview Offscreen document for Pubky SDK operations.
 * 
 * Chrome Extension service workers cannot access `window` or DOM APIs,
 * which the Pubky SDK requires for initialization. This offscreen document
 * provides that context and acts as a bridge for SDK operations.
 * 
 * Communication with the background service worker happens via Chrome messaging.
 * 
 * @module offscreen/offscreen
 */

import { storage } from '../utils/storage';

// Import Pubky SDK types
type Client = any;

/**
 * Message types for offscreen document communication
 */
export type OffscreenMessageType = 
  | 'SYNC_ANNOTATION'
  | 'SYNC_DRAWING'
  | 'SYNC_ALL_PENDING'
  | 'GET_SYNC_STATUS';

export interface OffscreenMessage {
  type: OffscreenMessageType;
  target: 'offscreen';
  data?: any;
}

export interface OffscreenResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Offscreen document handler for Pubky SDK operations
 */
class OffscreenHandler {
  private client: Client | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the Pubky client
   */
  private async initialize(): Promise<void> {
    try {
      console.log('[Graphiti Offscreen] Initializing Pubky client...');
      
      const { getPubkyClientAsync } = await import('../utils/pubky-client-factory');
      this.client = await getPubkyClientAsync();
      this.isInitialized = true;
      
      console.log('[Graphiti Offscreen] Pubky client initialized successfully');
      
      // Set up message listener
      this.setupMessageListener();
    } catch (error) {
      console.error('[Graphiti Offscreen] Failed to initialize Pubky client:', error);
    }
  }

  /**
   * Ensure client is initialized
   */
  private async ensureClient(): Promise<Client> {
    if (!this.isInitialized || !this.client) {
      await this.initialize();
    }
    if (!this.client) {
      throw new Error('Failed to initialize Pubky client');
    }
    return this.client;
  }

  /**
   * Set up message listener for communication with background
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // Only handle messages targeted at offscreen document
      if (message.target !== 'offscreen') {
        return false;
      }

      console.log('[Graphiti Offscreen] Received message:', message.type);

      // Handle async operations
      this.handleMessage(message)
        .then(sendResponse)
        .catch((error) => {
          console.error('[Graphiti Offscreen] Error handling message:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep channel open for async response
    });

    console.log('[Graphiti Offscreen] Message listener registered');
  }

  /**
   * Handle incoming messages from background
   */
  private async handleMessage(message: OffscreenMessage): Promise<OffscreenResponse> {
    switch (message.type) {
      case 'SYNC_ANNOTATION':
        return this.syncAnnotation(message.data);
      
      case 'SYNC_DRAWING':
        return this.syncDrawing(message.data);
      
      case 'SYNC_ALL_PENDING':
        return this.syncAllPending();
      
      case 'GET_SYNC_STATUS':
        return this.getSyncStatus();
      
      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  }

  /**
   * Sync a single annotation to Pubky
   */
  private async syncAnnotation(data: {
    url: string;
    selectedText: string;
    comment: string;
    metadata: {
      prefix: string;
      exact: string;
      suffix: string;
    };
  }): Promise<OffscreenResponse> {
    try {
      const client = await this.ensureClient();
      const session = await storage.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      // Import the specs builder
      const { PubkySpecsBuilder, PubkyAppPostKind } = await import('pubky-app-specs');
      const { generateUrlHashTag } = await import('../utils/crypto');
      
      const builder = new PubkySpecsBuilder(session.pubky);
      
      // Create content with annotation details
      const content = JSON.stringify({
        type: 'annotation',
        url: data.url,
        selectedText: data.selectedText,
        comment: data.comment,
        metadata: data.metadata,
      });

      // Create post
      const result = builder.createPost(
        content,
        PubkyAppPostKind.Short,
        null,
        null,
        []
      );

      const post = result.post.toJson();
      const fullPath = result.meta.url;

      // Write to homeserver
      const response = await client.fetch(fullPath, {
        method: 'PUT',
        body: JSON.stringify(post),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create tags
      const urlHashTag = await generateUrlHashTag(data.url);
      const annotationTag = 'pubky:annotation';
      
      for (const label of [urlHashTag, annotationTag]) {
        const tagResult = builder.createTag(fullPath, label);
        const tag = tagResult.tag.toJson();
        
        await client.fetch(tagResult.meta.url, {
          method: 'PUT',
          body: JSON.stringify(tag),
        });
      }

      console.log('[Graphiti Offscreen] Annotation synced:', fullPath);
      
      return { success: true, data: { postUri: fullPath } };
    } catch (error) {
      console.error('[Graphiti Offscreen] Failed to sync annotation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Sync a single drawing to Pubky
   */
  private async syncDrawing(data: {
    url: string;
    canvasData: string;
    timestamp: number;
    author: string;
  }): Promise<OffscreenResponse> {
    try {
      const client = await this.ensureClient();
      const session = await storage.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      // Generate URL hash for filename
      let hash = 0;
      for (let i = 0; i < data.url.length; i++) {
        const char = data.url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const urlHash = Math.abs(hash).toString(36);
      
      const path = `/pub/graphiti.dev/drawings/${urlHash}.json`;
      const fullPath = `pubky://${session.pubky}${path}`;

      // Prepare drawing data
      const drawingData = {
        url: data.url,
        canvasData: data.canvasData,
        timestamp: data.timestamp,
        author: data.author,
      };

      // Upload to homeserver
      const response = await client.fetch(fullPath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drawingData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[Graphiti Offscreen] Drawing synced:', fullPath);
      
      return { success: true, data: { pubkyUrl: fullPath } };
    } catch (error) {
      console.error('[Graphiti Offscreen] Failed to sync drawing:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Sync all pending annotations and drawings
   */
  private async syncAllPending(): Promise<OffscreenResponse> {
    try {
      const session = await storage.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { annotationStorage } = await import('../utils/annotations');
      
      let annotationsSynced = 0;
      let drawingsSynced = 0;

      // Sync pending annotations
      const allAnnotations = await annotationStorage.getAllAnnotations();
      for (const url in allAnnotations) {
        for (const annotation of allAnnotations[url]) {
          // Sync if: no postUri AND (has author OR we can assign current session as author)
          if (!annotation.postUri) {
            // If annotation was created while logged out, assign current session as author
            if (!annotation.author || annotation.author === '') {
              annotation.author = session.pubky;
              await annotationStorage.saveAnnotation(annotation);
            }
            
            const result = await this.syncAnnotation({
              url: annotation.url,
              selectedText: annotation.selectedText,
              comment: annotation.comment,
              metadata: {
                prefix: annotation.prefix || '',
                exact: annotation.exact || annotation.selectedText,
                suffix: annotation.suffix || '',
              },
            });
            
            if (result.success && result.data?.postUri) {
              annotation.postUri = result.data.postUri;
              await annotationStorage.saveAnnotation(annotation);
              annotationsSynced++;
            }
          }
        }
      }

      // Sync pending drawings
      const allDrawings = await storage.getAllDrawings();
      for (const url in allDrawings) {
        const drawing = allDrawings[url];
        if (!drawing.pubkyUrl && drawing.author) {
          const result = await this.syncDrawing({
            url: drawing.url,
            canvasData: drawing.canvasData,
            timestamp: drawing.timestamp,
            author: drawing.author,
          });
          
          if (result.success && result.data?.pubkyUrl) {
            drawing.pubkyUrl = result.data.pubkyUrl;
            await storage.saveDrawing(drawing);
            drawingsSynced++;
          }
        }
      }

      console.log('[Graphiti Offscreen] Sync complete:', { annotationsSynced, drawingsSynced });
      
      return { 
        success: true, 
        data: { annotationsSynced, drawingsSynced }
      };
    } catch (error) {
      console.error('[Graphiti Offscreen] Failed to sync all pending:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get sync status (pending items count)
   */
  private async getSyncStatus(): Promise<OffscreenResponse> {
    try {
      const { annotationStorage } = await import('../utils/annotations');
      
      let pendingAnnotations = 0;
      let pendingDrawings = 0;

      // Count pending annotations
      const allAnnotations = await annotationStorage.getAllAnnotations();
      for (const url in allAnnotations) {
        for (const annotation of allAnnotations[url]) {
          if (!annotation.postUri && annotation.author) {
            pendingAnnotations++;
          }
        }
      }

      // Count pending drawings
      const allDrawings = await storage.getAllDrawings();
      for (const url in allDrawings) {
        const drawing = allDrawings[url];
        if (!drawing.pubkyUrl && drawing.author) {
          pendingDrawings++;
        }
      }

      return { 
        success: true, 
        data: { 
          pendingAnnotations, 
          pendingDrawings,
          hasPending: pendingAnnotations > 0 || pendingDrawings > 0
        }
      };
    } catch (error) {
      console.error('[Graphiti Offscreen] Failed to get sync status:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Initialize the offscreen handler
new OffscreenHandler();

console.log('[Graphiti Offscreen] Offscreen document loaded');

