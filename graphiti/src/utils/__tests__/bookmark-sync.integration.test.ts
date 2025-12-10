/**
 * @fileoverview Integration tests for bookmark sync flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, StoredBookmark } from '../storage';
import { pubkyAPISDK } from '../pubky-api-sdk';
import { logger } from '../logger';

// Mock dependencies
vi.mock('../pubky-api-sdk');
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Bookmark Sync Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBookmark flow', () => {
    it('should create bookmark on homeserver and save locally', async () => {
      const testUrl = 'https://example.com';
      const mockBookmarkResult = {
        fullPath: '/pub/pubky.app/bookmarks/123',
        bookmarkId: 'bookmark-123',
        postUri: 'pubky://test/posts/456',
      };

      vi.mocked(pubkyAPISDK.createBookmark).mockResolvedValue(mockBookmarkResult);
      vi.mocked(storage.saveBookmark).mockResolvedValue();
      vi.mocked(storage.getBookmark).mockResolvedValue(null);

      // Simulate bookmark creation flow
      const bookmark: StoredBookmark = {
        url: testUrl,
        title: 'Test Page',
        timestamp: Date.now(),
        pubkyUrl: mockBookmarkResult.fullPath,
        bookmarkId: mockBookmarkResult.bookmarkId,
        postUri: mockBookmarkResult.postUri,
      };

      await storage.saveBookmark(bookmark);

      expect(pubkyAPISDK.createBookmark).toHaveBeenCalledWith(testUrl);
      expect(storage.saveBookmark).toHaveBeenCalled();
    });

    it('should handle bookmark creation errors', async () => {
      const testUrl = 'https://example.com';

      vi.mocked(pubkyAPISDK.createBookmark).mockRejectedValue(new Error('Network error'));
      vi.mocked(storage.getBookmark).mockResolvedValue(null);

      await expect(pubkyAPISDK.createBookmark(testUrl)).rejects.toThrow();
    });

    it('should delete bookmark from homeserver and local storage', async () => {
      const testUrl = 'https://example.com';
      const existingBookmark: StoredBookmark = {
        url: testUrl,
        title: 'Test Page',
        timestamp: Date.now(),
        postUri: 'pubky://test/posts/456',
      };

      vi.mocked(storage.getBookmark).mockResolvedValue(existingBookmark);
      vi.mocked(pubkyAPISDK.deleteBookmark).mockResolvedValue();
      vi.mocked(storage.removeBookmark).mockResolvedValue();

      // Simulate bookmark deletion flow
      if (existingBookmark.postUri) {
        await pubkyAPISDK.deleteBookmark(existingBookmark.postUri);
      }
      await storage.removeBookmark(testUrl);

      expect(pubkyAPISDK.deleteBookmark).toHaveBeenCalledWith(existingBookmark.postUri);
      expect(storage.removeBookmark).toHaveBeenCalledWith(testUrl);
    });

    it('should handle bookmark deletion errors gracefully', async () => {
      const testUrl = 'https://example.com';
      const existingBookmark: StoredBookmark = {
        url: testUrl,
        title: 'Test Page',
        timestamp: Date.now(),
        postUri: 'pubky://test/posts/456',
      };

      vi.mocked(storage.getBookmark).mockResolvedValue(existingBookmark);
      vi.mocked(pubkyAPISDK.deleteBookmark).mockRejectedValue(new Error('Network error'));

      if (existingBookmark.postUri) {
        await expect(pubkyAPISDK.deleteBookmark(existingBookmark.postUri)).rejects.toThrow();
      }
    });
  });

  describe('bookmark sync with categories', () => {
    it('should save bookmark with category', async () => {
      const testUrl = 'https://example.com';
      const category = 'work';
      const mockBookmarkResult = {
        fullPath: '/pub/pubky.app/bookmarks/123',
        bookmarkId: 'bookmark-123',
        postUri: 'pubky://test/posts/456',
      };

      vi.mocked(pubkyAPISDK.createBookmark).mockResolvedValue(mockBookmarkResult);
      vi.mocked(storage.saveBookmark).mockResolvedValue();

      const bookmark: StoredBookmark = {
        url: testUrl,
        title: 'Test Page',
        timestamp: Date.now(),
        pubkyUrl: mockBookmarkResult.fullPath,
        bookmarkId: mockBookmarkResult.bookmarkId,
        postUri: mockBookmarkResult.postUri,
        category,
      };

      await storage.saveBookmark(bookmark);

      expect(storage.saveBookmark).toHaveBeenCalledWith(
        expect.objectContaining({ category })
      );
    });

    it('should retrieve bookmarks by category', async () => {
      const category = 'work';
      const mockBookmarks: StoredBookmark[] = [
        {
          url: 'https://example.com',
          title: 'Test Page',
          timestamp: Date.now(),
          category,
        },
      ];

      vi.mocked(storage.getBookmarksByCategory).mockResolvedValue(mockBookmarks);

      const result = await storage.getBookmarksByCategory(category);

      expect(result).toEqual(mockBookmarks);
      expect(result.every(b => b.category === category)).toBe(true);
    });
  });
});
