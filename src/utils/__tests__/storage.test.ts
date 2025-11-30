/**
 * Storage Utility Tests
 * 
 * Tests for the Storage singleton class that manages:
 * - Session management
 * - Bookmark operations
 * - Tag operations
 * - Profile caching
 * - Drawing storage
 * - Settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage, Session, StoredBookmark, StoredTag, ProfileData, Drawing } from '../storage';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Storage mock data holder
let mockStorageData: Record<string, any> = {};

// Mock Chrome storage
const mockChromeStorage = {
  local: {
    get: vi.fn((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorageData[keys] });
      }
      if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach((key) => {
          if (key in mockStorageData) result[key] = mockStorageData[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve(mockStorageData);
    }),
    set: vi.fn((data) => {
      Object.assign(mockStorageData, data);
      return Promise.resolve();
    }),
    remove: vi.fn((keys) => {
      if (typeof keys === 'string') {
        delete mockStorageData[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => delete mockStorageData[key]);
      }
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      mockStorageData = {};
      return Promise.resolve();
    }),
  },
};

// Set up global chrome mock
(globalThis as any).chrome = { storage: mockChromeStorage };

describe('Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageData = {};
  });

  // ============================================
  // Session Management Tests
  // ============================================
  describe('Session Management', () => {
    const mockSession: Session = {
      pubky: 'abc123pubky',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session-id-123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    it('should save a session', async () => {
      await storage.saveSession(mockSession);
      
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        session: mockSession,
      });
    });

    it('should retrieve a saved session', async () => {
      mockStorageData.session = mockSession;
      
      const result = await storage.getSession();
      
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      const result = await storage.getSession();
      
      expect(result).toBeNull();
    });

    it('should clear session', async () => {
      mockStorageData.session = mockSession;
      
      await storage.clearSession();
      
      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith('session');
    });
  });

  // ============================================
  // Bookmark Tests
  // ============================================
  describe('Bookmarks', () => {
    const mockBookmark: StoredBookmark = {
      url: 'https://example.com',
      title: 'Example Site',
      timestamp: Date.now(),
      pubkyUrl: 'pubky://abc123/bookmarks/xyz',
      bookmarkId: 'bookmark-id-1',
      postUri: 'pubky://abc123/posts/post-1',
    };

    it('should save a bookmark', async () => {
      await storage.saveBookmark(mockBookmark);
      
      expect(mockStorageData.bookmarks).toEqual([mockBookmark]);
    });

    it('should append to existing bookmarks', async () => {
      const existingBookmark: StoredBookmark = {
        url: 'https://other.com',
        title: 'Other Site',
        timestamp: Date.now() - 1000,
      };
      mockStorageData.bookmarks = [existingBookmark];
      
      await storage.saveBookmark(mockBookmark);
      
      expect(mockStorageData.bookmarks).toHaveLength(2);
      expect(mockStorageData.bookmarks[1]).toEqual(mockBookmark);
    });

    it('should get all bookmarks', async () => {
      mockStorageData.bookmarks = [mockBookmark];
      
      const result = await storage.getBookmarks();
      
      expect(result).toEqual([mockBookmark]);
    });

    it('should return empty array when no bookmarks exist', async () => {
      const result = await storage.getBookmarks();
      
      expect(result).toEqual([]);
    });

    it('should check if URL is bookmarked', async () => {
      mockStorageData.bookmarks = [mockBookmark];
      
      expect(await storage.isBookmarked('https://example.com')).toBe(true);
      expect(await storage.isBookmarked('https://notbookmarked.com')).toBe(false);
    });

    it('should get a specific bookmark by URL', async () => {
      mockStorageData.bookmarks = [mockBookmark];
      
      const result = await storage.getBookmark('https://example.com');
      
      expect(result).toEqual(mockBookmark);
    });

    it('should return null for non-existent bookmark', async () => {
      mockStorageData.bookmarks = [mockBookmark];
      
      const result = await storage.getBookmark('https://notfound.com');
      
      expect(result).toBeNull();
    });

    it('should remove a bookmark', async () => {
      mockStorageData.bookmarks = [mockBookmark];
      
      await storage.removeBookmark('https://example.com');
      
      expect(mockStorageData.bookmarks).toEqual([]);
    });

    it('should only remove matching bookmark', async () => {
      const anotherBookmark: StoredBookmark = {
        url: 'https://keep.com',
        title: 'Keep This',
        timestamp: Date.now(),
      };
      mockStorageData.bookmarks = [mockBookmark, anotherBookmark];
      
      await storage.removeBookmark('https://example.com');
      
      expect(mockStorageData.bookmarks).toEqual([anotherBookmark]);
    });
  });

  // ============================================
  // Tag Tests
  // ============================================
  describe('Tags', () => {
    it('should save tags for a URL', async () => {
      const url = 'https://example.com';
      const tags = ['JavaScript', 'Tutorial'];
      
      await storage.saveTags(url, tags);
      
      expect(mockStorageData.tags).toHaveLength(2);
      expect(mockStorageData.tags[0].label).toBe('javascript');
      expect(mockStorageData.tags[1].label).toBe('tutorial');
    });

    it('should normalize tags to lowercase and trim', async () => {
      const url = 'https://example.com';
      const tags = ['  TAG1  ', 'TaG2'];
      
      await storage.saveTags(url, tags);
      
      expect(mockStorageData.tags[0].label).toBe('tag1');
      expect(mockStorageData.tags[1].label).toBe('tag2');
    });

    it('should replace tags for the same URL', async () => {
      const url = 'https://example.com';
      mockStorageData.tags = [
        { url, label: 'old-tag', timestamp: Date.now() - 1000 },
      ];
      
      await storage.saveTags(url, ['new-tag']);
      
      expect(mockStorageData.tags).toHaveLength(1);
      expect(mockStorageData.tags[0].label).toBe('new-tag');
    });

    it('should preserve tags for other URLs', async () => {
      const otherTag: StoredTag = {
        url: 'https://other.com',
        label: 'other-tag',
        timestamp: Date.now(),
      };
      mockStorageData.tags = [otherTag];
      
      await storage.saveTags('https://example.com', ['new-tag']);
      
      expect(mockStorageData.tags).toHaveLength(2);
    });

    it('should get all tags', async () => {
      const tags: StoredTag[] = [
        { url: 'https://a.com', label: 'tag1', timestamp: Date.now() },
        { url: 'https://b.com', label: 'tag2', timestamp: Date.now() },
      ];
      mockStorageData.tags = tags;
      
      const result = await storage.getAllTags();
      
      expect(result).toEqual(tags);
    });

    it('should get tags for a specific URL', async () => {
      const url = 'https://example.com';
      mockStorageData.tags = [
        { url, label: 'tag1', timestamp: Date.now() },
        { url, label: 'tag2', timestamp: Date.now() },
        { url: 'https://other.com', label: 'other-tag', timestamp: Date.now() },
      ];
      
      const result = await storage.getTagsForUrl(url);
      
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('should return empty array for URL with no tags', async () => {
      mockStorageData.tags = [];
      
      const result = await storage.getTagsForUrl('https://notags.com');
      
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Profile Tests
  // ============================================
  describe('Profile', () => {
    const mockProfile: ProfileData = {
      name: 'Test User',
      bio: 'A test bio',
      image: 'https://example.com/avatar.png',
      status: 'Testing 🧪',
      links: [
        { title: 'Website', url: 'https://example.com' },
      ],
    };

    it('should save a profile', async () => {
      await storage.saveProfile(mockProfile);
      
      expect(mockStorageData.profile).toEqual(mockProfile);
    });

    it('should get a saved profile', async () => {
      mockStorageData.profile = mockProfile;
      
      const result = await storage.getProfile();
      
      expect(result).toEqual(mockProfile);
    });

    it('should return null when no profile exists', async () => {
      const result = await storage.getProfile();
      
      expect(result).toBeNull();
    });

    it('should cache a profile with TTL', async () => {
      const pubkey = 'abc123';
      const ttl = 3600000;
      
      await storage.cacheProfile(pubkey, mockProfile, ttl);
      
      const cacheKey = `profile_cache_${pubkey}`;
      expect(mockStorageData[cacheKey]).toBeDefined();
      expect(mockStorageData[cacheKey].data).toEqual(mockProfile);
      expect(mockStorageData[cacheKey].ttl).toBe(ttl);
    });

    it('should get a cached profile', async () => {
      const pubkey = 'abc123';
      const cacheKey = `profile_cache_${pubkey}`;
      mockStorageData[cacheKey] = {
        data: mockProfile,
        cachedAt: Date.now(),
        ttl: 3600000,
      };
      
      const result = await storage.getCachedProfile(pubkey);
      
      expect(result).toEqual(mockProfile);
    });

    it('should return null for expired cache', async () => {
      const pubkey = 'abc123';
      const cacheKey = `profile_cache_${pubkey}`;
      mockStorageData[cacheKey] = {
        data: mockProfile,
        cachedAt: Date.now() - 7200000, // 2 hours ago
        ttl: 3600000, // 1 hour TTL
      };
      
      const result = await storage.getCachedProfile(pubkey);
      
      expect(result).toBeNull();
    });

    it('should return null for non-existent cache', async () => {
      const result = await storage.getCachedProfile('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  // ============================================
  // Settings Tests
  // ============================================
  describe('Settings', () => {
    it('should get a setting with default value', async () => {
      const result = await storage.getSetting('theme', 'dark');
      
      expect(result).toBe('dark');
    });

    it('should get an existing setting', async () => {
      mockStorageData.theme = 'light';
      
      const result = await storage.getSetting('theme', 'dark');
      
      expect(result).toBe('light');
    });

    it('should save a setting', async () => {
      await storage.setSetting('notifications', true);
      
      expect(mockStorageData.notifications).toBe(true);
    });

    it('should handle complex setting values', async () => {
      const complexValue = { nested: { key: 'value' }, array: [1, 2, 3] };
      
      await storage.setSetting('config', complexValue);
      
      expect(mockStorageData.config).toEqual(complexValue);
    });
  });

  // ============================================
  // Drawing Tests
  // ============================================
  describe('Drawings', () => {
    const mockDrawing: Drawing = {
      id: 'drawing-1',
      url: 'https://example.com',
      canvasData: 'data:image/png;base64,abc123',
      timestamp: Date.now(),
      author: 'user-pubky',
      pubkyUrl: 'pubky://user/drawings/1',
    };

    it('should save a drawing', async () => {
      await storage.saveDrawing(mockDrawing);
      
      expect(mockStorageData.pubky_drawings[mockDrawing.url]).toEqual(mockDrawing);
    });

    it('should overwrite existing drawing for same URL', async () => {
      const existingDrawing = { ...mockDrawing, canvasData: 'old-data' };
      mockStorageData.pubky_drawings = { [mockDrawing.url]: existingDrawing };
      
      await storage.saveDrawing(mockDrawing);
      
      expect(mockStorageData.pubky_drawings[mockDrawing.url].canvasData).toBe('data:image/png;base64,abc123');
    });

    it('should get a drawing by URL', async () => {
      mockStorageData.pubky_drawings = { [mockDrawing.url]: mockDrawing };
      
      const result = await storage.getDrawing(mockDrawing.url);
      
      expect(result).toEqual(mockDrawing);
    });

    it('should return null for non-existent drawing', async () => {
      mockStorageData.pubky_drawings = {};
      
      const result = await storage.getDrawing('https://notfound.com');
      
      expect(result).toBeNull();
    });

    it('should get all drawings', async () => {
      const drawings = {
        'https://a.com': { ...mockDrawing, url: 'https://a.com' },
        'https://b.com': { ...mockDrawing, url: 'https://b.com' },
      };
      mockStorageData.pubky_drawings = drawings;
      
      const result = await storage.getAllDrawings();
      
      expect(result).toEqual(drawings);
    });

    it('should delete a drawing', async () => {
      mockStorageData.pubky_drawings = { [mockDrawing.url]: mockDrawing };
      
      await storage.deleteDrawing(mockDrawing.url);
      
      expect(mockStorageData.pubky_drawings[mockDrawing.url]).toBeUndefined();
    });
  });
});

