/**
 * @fileoverview Integration tests for drawing sync flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingSync } from '../drawing-sync';
import { storage } from '../storage';
import { pubkyAPISDK } from '../pubky-api-sdk';
import { logger } from '../logger';

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

describe('DrawingSync Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncPendingDrawings', () => {
    it('should sync unsynced drawings to homeserver', async () => {
      const mockDrawings = {
        'https://example.com': {
          id: 'drawing-1',
          url: 'https://example.com',
          canvasData: 'data:image/png;base64,test',
          timestamp: Date.now(),
          author: 'test-pubky-id',
        },
      };

      vi.mocked(storage.getAllDrawings).mockResolvedValue(mockDrawings);
      vi.mocked(pubkyAPISDK.uploadFile).mockResolvedValue('/pub/graphiti.dev/drawings/hash.json');
      vi.mocked(storage.updateDrawing).mockResolvedValue();

      await DrawingSync.syncPendingDrawings();

      expect(pubkyAPISDK.uploadFile).toHaveBeenCalled();
      expect(storage.updateDrawing).toHaveBeenCalled();
    });

    it('should skip drawings that are already synced', async () => {
      const mockDrawings = {
        'https://example.com': {
          id: 'drawing-1',
          url: 'https://example.com',
          canvasData: 'data:image/png;base64,test',
          timestamp: Date.now(),
          author: 'test-pubky-id',
          pubkyUrl: '/pub/graphiti.dev/drawings/hash.json', // Already synced
        },
      };

      vi.mocked(storage.getAllDrawings).mockResolvedValue(mockDrawings);

      await DrawingSync.syncPendingDrawings();

      expect(pubkyAPISDK.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const mockDrawings = {
        'https://example.com': {
          id: 'drawing-1',
          url: 'https://example.com',
          canvasData: 'data:image/png;base64,test',
          timestamp: Date.now(),
          author: 'test-pubky-id',
        },
      };

      vi.mocked(storage.getAllDrawings).mockResolvedValue(mockDrawings);
      vi.mocked(pubkyAPISDK.uploadFile).mockRejectedValue(new Error('Network error'));

      await expect(DrawingSync.syncPendingDrawings()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should skip drawings without author', async () => {
      const mockDrawings = {
        'https://example.com': {
          id: 'drawing-1',
          url: 'https://example.com',
          canvasData: 'data:image/png;base64,test',
          timestamp: Date.now(),
          // No author
        },
      };

      vi.mocked(storage.getAllDrawings).mockResolvedValue(mockDrawings);

      await DrawingSync.syncPendingDrawings();

      expect(pubkyAPISDK.uploadFile).not.toHaveBeenCalled();
    });
  });
});
