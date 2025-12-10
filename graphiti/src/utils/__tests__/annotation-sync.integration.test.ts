/**
 * @fileoverview Integration tests for annotation sync flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnotationSync } from '../annotation-sync';
import { storage } from '../storage';
import { pubkyAPISDK } from '../pubky-api-sdk';
import { logger } from '../logger';
import { Annotation } from '../annotations';

// Mock dependencies
vi.mock('../storage');
vi.mock('../pubky-api-sdk');
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AnnotationSync Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncPendingAnnotations', () => {
    it('should sync unsynced annotations to homeserver', async () => {
      const mockAnnotations: Annotation[] = [
        {
          id: 'annotation-1',
          url: 'https://example.com',
          selectedText: 'Test text',
          comment: 'Test comment',
          startPath: '/html/body/p[1]',
          endPath: '/html/body/p[1]',
          startOffset: 0,
          endOffset: 9,
          timestamp: Date.now(),
          author: 'test-pubky-id',
          color: '#ffff00',
        },
      ];

      vi.mocked(storage.getAllAnnotations).mockResolvedValue(mockAnnotations);
      vi.mocked(pubkyAPISDK.createLinkPost).mockResolvedValue('pubky://test/posts/123');
      vi.mocked(storage.updateAnnotation).mockResolvedValue();

      await AnnotationSync.syncPendingAnnotations();

      expect(pubkyAPISDK.createLinkPost).toHaveBeenCalled();
      expect(storage.updateAnnotation).toHaveBeenCalled();
    });

    it('should skip annotations that are already synced', async () => {
      const mockAnnotations: Annotation[] = [
        {
          id: 'annotation-1',
          url: 'https://example.com',
          selectedText: 'Test text',
          comment: 'Test comment',
          startPath: '/html/body/p[1]',
          endPath: '/html/body/p[1]',
          startOffset: 0,
          endOffset: 9,
          timestamp: Date.now(),
          author: 'test-pubky-id',
          color: '#ffff00',
          postUri: 'pubky://test/posts/123', // Already synced
        },
      ];

      vi.mocked(storage.getAllAnnotations).mockResolvedValue(mockAnnotations);

      await AnnotationSync.syncPendingAnnotations();

      expect(pubkyAPISDK.createLinkPost).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const mockAnnotations: Annotation[] = [
        {
          id: 'annotation-1',
          url: 'https://example.com',
          selectedText: 'Test text',
          comment: 'Test comment',
          startPath: '/html/body/p[1]',
          endPath: '/html/body/p[1]',
          startOffset: 0,
          endOffset: 9,
          timestamp: Date.now(),
          author: 'test-pubky-id',
          color: '#ffff00',
        },
      ];

      vi.mocked(storage.getAllAnnotations).mockResolvedValue(mockAnnotations);
      vi.mocked(pubkyAPISDK.createLinkPost).mockRejectedValue(new Error('Network error'));

      await expect(AnnotationSync.syncPendingAnnotations()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should skip annotations without author', async () => {
      const mockAnnotations: Annotation[] = [
        {
          id: 'annotation-1',
          url: 'https://example.com',
          selectedText: 'Test text',
          comment: 'Test comment',
          startPath: '/html/body/p[1]',
          endPath: '/html/body/p[1]',
          startOffset: 0,
          endOffset: 9,
          timestamp: Date.now(),
          // No author
          color: '#ffff00',
        },
      ];

      vi.mocked(storage.getAllAnnotations).mockResolvedValue(mockAnnotations);

      await AnnotationSync.syncPendingAnnotations();

      expect(pubkyAPISDK.createLinkPost).not.toHaveBeenCalled();
    });
  });
});
