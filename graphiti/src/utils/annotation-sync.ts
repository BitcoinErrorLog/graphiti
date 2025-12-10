/**
 * Helper to sync annotations to Pubky from popup/sidepanel context
 * This works around the limitation that Pubky SDK can't initialize in service workers
 */

import { logger } from './logger';
import { pubkyAPISDK } from './pubky-api-sdk';
import { annotationStorage } from './annotations';

export class AnnotationSync {
  /**
   * Sync any unsynced annotations to Pubky
   * Call this from popup/sidepanel when they open
   */
  static async syncPendingAnnotations(): Promise<void> {
    try {
      logger.info('AnnotationSync', 'Checking for unsynced annotations');
      
      const allAnnotations = await annotationStorage.getAllAnnotations();
      let syncCount = 0;

      // Find annotations without postUri (not synced to Pubky yet)
      for (const url in allAnnotations) {
        for (const annotation of allAnnotations[url]) {
          if (!annotation.postUri && annotation.author) {
            try {
              logger.info('AnnotationSync', 'Syncing annotation to Pubky', { id: annotation.id });
              
              const postUri = await pubkyAPISDK.createAnnotationPost(
                annotation.url,
                annotation.selectedText,
                annotation.comment,
                {
                  prefix: annotation.prefix || '',
                  exact: annotation.exact || annotation.selectedText,
                  suffix: annotation.suffix || '',
                }
              );

              // Update annotation with post URI
              annotation.postUri = postUri;
              await annotationStorage.saveAnnotation(annotation);
              
              syncCount++;
              logger.info('AnnotationSync', 'Annotation synced successfully', { 
                id: annotation.id, 
                postUri 
              });
            } catch (error) {
              logger.error('AnnotationSync', 'Failed to sync annotation', error as Error, {
                id: annotation.id
              });
              // Continue with next annotation
            }
          }
        }
      }

      if (syncCount > 0) {
        logger.info('AnnotationSync', 'Sync complete', { count: syncCount });
      }
    } catch (error) {
      logger.error('AnnotationSync', 'Failed to sync annotations', error as Error);
    }
  }
}

