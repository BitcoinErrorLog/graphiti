/**
 * Helper to sync drawings to Pubky homeserver
 * Similar to annotation-sync, but for canvas drawings
 */

import { logger } from './logger';
import { pubkyAPISDK } from './pubky-api-sdk';
import { storage, Drawing } from './storage';

export class DrawingSync {
  private static readonly DRAWING_PATH = '/pub/graphiti.dev/drawings/';

  /**
   * Generate a hash for a URL to use as filename
   */
  private static hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Sync any unsynced drawings to Pubky
   * Call this from popup/sidepanel when they open
   */
  static async syncPendingDrawings(): Promise<void> {
    try {
      logger.info('DrawingSync', 'Checking for unsynced drawings');
      
      const allDrawings = await storage.getAllDrawings();
      let syncCount = 0;

      // Find drawings without pubkyUrl (not synced to Pubky yet)
      for (const url in allDrawings) {
        const drawing = allDrawings[url];
        if (!drawing.pubkyUrl && drawing.author) {
          try {
            logger.info('DrawingSync', 'Syncing drawing to Pubky', { url });
            
            const urlHash = this.hashUrl(url);
            const filename = `${urlHash}.json`;
            const path = `${this.DRAWING_PATH}${filename}`;

            // Prepare drawing data for upload
            const drawingData = {
              url: drawing.url,
              canvasData: drawing.canvasData,
              timestamp: drawing.timestamp,
              author: drawing.author,
            };

            // Upload to homeserver
            const pubkyUrl = await pubkyAPISDK.uploadFile(
              path,
              JSON.stringify(drawingData),
              'application/json'
            );

            // Update drawing with pubky URL
            drawing.pubkyUrl = pubkyUrl;
            await storage.saveDrawing(drawing);
            
            syncCount++;
            logger.info('DrawingSync', 'Drawing synced successfully', { 
              url,
              pubkyUrl 
            });
          } catch (error) {
            logger.error('DrawingSync', 'Failed to sync drawing', error as Error, {
              url
            });
            // Continue with next drawing
          }
        }
      }

      if (syncCount > 0) {
        logger.info('DrawingSync', 'Sync complete', { count: syncCount });
      }
    } catch (error) {
      logger.error('DrawingSync', 'Failed to sync drawings', error as Error);
    }
  }

  /**
   * Load drawings from Pubky homeserver
   * This can be used to fetch drawings from followed users
   */
  static async loadRemoteDrawings(pubkyId: string): Promise<Drawing[]> {
    try {
      logger.info('DrawingSync', 'Loading remote drawings', { pubkyId });
      
      const drawings: Drawing[] = [];
      
      // List files in drawings directory
      const files = await pubkyAPISDK.listFiles(
        pubkyId,
        this.DRAWING_PATH
      );

      for (const file of files) {
        try {
          // Fetch drawing data
          const content = await pubkyAPISDK.getFile(
            pubkyId,
            `${this.DRAWING_PATH}${file.name}`
          );

          const data = JSON.parse(content);
          
          const drawing: Drawing = {
            id: `${pubkyId}-${file.name}`,
            url: data.url,
            canvasData: data.canvasData,
            timestamp: data.timestamp,
            author: data.author,
            pubkyUrl: `pubky://${pubkyId}${this.DRAWING_PATH}${file.name}`,
          };

          drawings.push(drawing);
        } catch (error) {
          logger.warn('DrawingSync', 'Failed to load remote drawing', {
            file: file.name,
            error: (error as Error).message
          });
        }
      }

      logger.info('DrawingSync', 'Remote drawings loaded', { 
        count: drawings.length 
      });

      return drawings;
    } catch (error) {
      logger.error('DrawingSync', 'Failed to load remote drawings', error as Error);
      return [];
    }
  }

  /**
   * Delete a drawing from Pubky homeserver
   */
  static async deleteRemoteDrawing(url: string): Promise<void> {
    try {
      const urlHash = this.hashUrl(url);
      const filename = `${urlHash}.json`;
      const path = `${this.DRAWING_PATH}${filename}`;

      await pubkyAPISDK.deleteFile(path);
      
      logger.info('DrawingSync', 'Drawing deleted from homeserver', { url });
    } catch (error) {
      logger.error('DrawingSync', 'Failed to delete remote drawing', error as Error);
      throw error;
    }
  }
}

