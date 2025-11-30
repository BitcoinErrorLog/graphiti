/**
 * Utilities for managing annotations in storage
 */

import { logger } from './logger';

export interface Annotation {
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  // Text-quote anchoring (new format)
  prefix?: string;
  exact?: string;
  suffix?: string;
  // Legacy path-based anchoring (deprecated, for migration)
  startPath?: string;
  endPath?: string;
  startOffset?: number;
  endOffset?: number;
  timestamp: number;
  author: string;
  postUri?: string;
  color: string;
}

export interface StoredAnnotations {
  [url: string]: Annotation[];
}

class AnnotationStorage {
  private static readonly STORAGE_KEY = 'pubky_annotations';
  private saveLock: Promise<void> = Promise.resolve();

  /**
   * Get all annotations for a specific URL
   */
  async getAnnotationsForUrl(url: string): Promise<Annotation[]> {
    try {
      const result = await chrome.storage.local.get(AnnotationStorage.STORAGE_KEY);
      const stored: StoredAnnotations = result[AnnotationStorage.STORAGE_KEY] || {};
      return stored[url] || [];
    } catch (error) {
      logger.error('AnnotationStorage', 'Failed to get annotations', error as Error);
      return [];
    }
  }

  /**
   * Save an annotation (with mutex lock to prevent race conditions)
   */
  async saveAnnotation(annotation: Annotation): Promise<void> {
    // Wait for any pending save operations to complete
    await this.saveLock;
    
    // Queue this save operation
    this.saveLock = this._saveAnnotation(annotation);
    
    return this.saveLock;
  }

  /**
   * Internal save method (called within lock)
   */
  private async _saveAnnotation(annotation: Annotation): Promise<void> {
    try {
      const result = await chrome.storage.local.get(AnnotationStorage.STORAGE_KEY);
      const stored: StoredAnnotations = result[AnnotationStorage.STORAGE_KEY] || {};
      
      if (!stored[annotation.url]) {
        stored[annotation.url] = [];
      }
      
      // Add or update annotation
      const index = stored[annotation.url].findIndex(a => a.id === annotation.id);
      if (index >= 0) {
        stored[annotation.url][index] = annotation;
      } else {
        stored[annotation.url].push(annotation);
      }
      
      await chrome.storage.local.set({
        [AnnotationStorage.STORAGE_KEY]: stored,
      });
      
      logger.info('AnnotationStorage', 'Annotation saved', { id: annotation.id });
    } catch (error) {
      logger.error('AnnotationStorage', 'Failed to save annotation', error as Error);
      throw error;
    }
  }

  /**
   * Delete an annotation (with mutex lock to prevent race conditions)
   */
  async deleteAnnotation(url: string, annotationId: string): Promise<void> {
    // Wait for any pending save operations to complete
    await this.saveLock;
    
    // Queue this delete operation
    this.saveLock = this._deleteAnnotation(url, annotationId);
    
    return this.saveLock;
  }

  /**
   * Internal delete method (called within lock)
   */
  private async _deleteAnnotation(url: string, annotationId: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(AnnotationStorage.STORAGE_KEY);
      const stored: StoredAnnotations = result[AnnotationStorage.STORAGE_KEY] || {};
      
      if (stored[url]) {
        stored[url] = stored[url].filter(a => a.id !== annotationId);
        
        await chrome.storage.local.set({
          [AnnotationStorage.STORAGE_KEY]: stored,
        });
        
        logger.info('AnnotationStorage', 'Annotation deleted', { id: annotationId });
      }
    } catch (error) {
      logger.error('AnnotationStorage', 'Failed to delete annotation', error as Error);
      throw error;
    }
  }

  /**
   * Get all annotations across all URLs
   */
  async getAllAnnotations(): Promise<StoredAnnotations> {
    try {
      const result = await chrome.storage.local.get(AnnotationStorage.STORAGE_KEY);
      return result[AnnotationStorage.STORAGE_KEY] || {};
    } catch (error) {
      logger.error('AnnotationStorage', 'Failed to get all annotations', error as Error);
      return {};
    }
  }

  /**
   * Clear all annotations (for debugging/testing)
   */
  async clearAllAnnotations(): Promise<void> {
    try {
      await chrome.storage.local.remove(AnnotationStorage.STORAGE_KEY);
      logger.info('AnnotationStorage', 'All annotations cleared');
    } catch (error) {
      logger.error('AnnotationStorage', 'Failed to clear annotations', error as Error);
      throw error;
    }
  }
}

export const annotationStorage = new AnnotationStorage();

