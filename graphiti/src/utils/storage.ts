/**
 * @fileoverview Chrome storage wrapper for managing extension state.
 * 
 * This module provides a singleton Storage class that handles:
 * - Session management (authentication state)
 * - Bookmark operations
 * - Tag operations
 * - Profile caching
 * - Drawing storage
 * - Settings persistence
 * 
 * All data is stored in `chrome.storage.local` for persistence
 * across browser sessions.
 * 
 * @module utils/storage
 */

import { logger } from './logger';
import ErrorHandler from './error-handler';
import { STORAGE_CONSTANTS, TIMING_CONSTANTS } from './constants';
import { getStorageValue, setStorageValue, removeStorageValue } from './storage-helpers';
import { toError } from './type-guards';

/**
 * User session data from Pubky authentication.
 */
export interface Session {
  /** User's Pubky ID (public key) */
  pubky: string;
  /** Homeserver URL */
  homeserver: string;
  /** Unique session identifier */
  sessionId: string;
  /** Granted capabilities (e.g., ["read", "write"]) */
  capabilities: string[];
  /** Session creation timestamp (ms since epoch) */
  timestamp: number;
}

/**
 * Stored bookmark data.
 * 
 * Bookmarks reference Pubky posts, not HTTP URLs directly.
 * The postUri field contains the actual bookmarked content.
 */
export interface StoredBookmark {
  /** Original HTTP URL that was bookmarked */
  url: string;
  /** Page title at bookmark time */
  title: string;
  /** Bookmark creation timestamp (ms since epoch) */
  timestamp: number;
  /** Full path to bookmark on homeserver */
  pubkyUrl?: string;
  /** Bookmark ID for deletion */
  bookmarkId?: string;
  /** Post URI that the bookmark points to (the actual social content) */
  postUri?: string;
}

/**
 * Stored tag data.
 * 
 * Tags are normalized to lowercase and trimmed.
 */
export interface StoredTag {
  /** URL that the tag is associated with */
  url: string;
  /** Tag label (normalized to lowercase) */
  label: string;
  /** Tag creation timestamp (ms since epoch) */
  timestamp: number;
  /** Full path to tag on homeserver */
  pubkyUrl?: string;
}

/**
 * Pubky App standard profile.json structure.
 * 
 * This matches the official Pubky App data model for interoperability.
 * @see https://github.com/pubky/pubky-app
 */
export interface ProfileData {
  /** Display name */
  name: string;
  /** User biography */
  bio?: string;
  /** Avatar image URL */
  image?: string;
  /** Status text (may include emoji) */
  status?: string;
  /** Social links */
  links?: Array<{
    /** Link display title */
    title: string;
    /** Link URL */
    url: string;
  }>;
}

/**
 * Cached profile data with TTL.
 */
export interface CachedProfile {
  /** Profile data */
  data: ProfileData;
  /** Cache creation timestamp (ms since epoch) */
  cachedAt: number;
  /** Time to live in milliseconds */
  ttl: number;
}

/**
 * Drawing data for graffiti feature.
 */
export interface Drawing {
  /** Unique drawing identifier */
  id: string;
  /** Page URL where drawing was created */
  url: string;
  /** Canvas data as base64-encoded PNG */
  canvasData: string;
  /** Drawing creation timestamp (ms since epoch) */
  timestamp: number;
  /** Author's Pubky ID */
  author: string;
  /** Full path to drawing on homeserver (after sync) */
  pubkyUrl?: string;
}

/**
 * Storage singleton for managing extension data.
 * 
 * Provides methods for CRUD operations on sessions, bookmarks,
 * tags, profiles, drawings, and settings.
 * 
 * @example
 * import { storage } from './storage';
 * 
 * // Session management
 * await storage.saveSession(session);
 * const session = await storage.getSession();
 * 
 * // Bookmarks
 * await storage.saveBookmark(bookmark);
 * const isBookmarked = await storage.isBookmarked(url);
 */
class Storage {
  private static instance: Storage;

  private constructor() {}

  /**
   * Gets the singleton Storage instance.
   * @returns {Storage} Storage singleton
   */
  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  // Session management
  async saveSession(session: Session): Promise<void> {
    try {
      await setStorageValue(STORAGE_CONSTANTS.KEYS.SESSION, session);
      logger.info('Storage', 'Session saved', { pubky: session.pubky });
    } catch (error) {
      logger.error('Storage', 'Failed to save session', toError(error));
      throw error;
    }
  }

  async getSession(): Promise<Session | null> {
    return await getStorageValue<Session>(STORAGE_CONSTANTS.KEYS.SESSION, null);
  }

  async clearSession(): Promise<void> {
    try {
      await removeStorageValue(STORAGE_CONSTANTS.KEYS.SESSION);
      logger.info('Storage', 'Session cleared');
    } catch (error) {
      logger.error('Storage', 'Failed to clear session', toError(error));
      throw error;
    }
  }

  // Bookmarks
  async saveBookmark(bookmark: StoredBookmark): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      bookmarks.push(bookmark);
      await setStorageValue(STORAGE_CONSTANTS.KEYS.BOOKMARKS, bookmarks);
      logger.info('Storage', 'Bookmark saved', { url: bookmark.url });
    } catch (error) {
      logger.error('Storage', 'Failed to save bookmark', error as Error);
      throw error;
    }
  }

  async getBookmarks(): Promise<StoredBookmark[]> {
    const bookmarks = await getStorageValue<StoredBookmark[]>(STORAGE_CONSTANTS.KEYS.BOOKMARKS, []);
    return bookmarks || [];
  }

  async isBookmarked(url: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.some(b => b.url === url);
  }

  async getBookmark(url: string): Promise<StoredBookmark | null> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.find(b => b.url === url) || null;
  }

  async removeBookmark(url: string): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      const filtered = bookmarks.filter(b => b.url !== url);
      await setStorageValue(STORAGE_CONSTANTS.KEYS.BOOKMARKS, filtered);
      logger.info('Storage', 'Bookmark removed', { url });
    } catch (error) {
      logger.error('Storage', 'Failed to remove bookmark', error as Error);
      throw error;
    }
  }

  // Tags
  async saveTags(url: string, tags: string[]): Promise<void> {
    try {
      const allTags = await this.getAllTags();
      // Remove existing tags for this URL
      const filteredTags = allTags.filter(t => t.url !== url);
      // Add new tags
      const newTags = tags.map(label => ({
        url,
        label: label.toLowerCase().trim(),
        timestamp: Date.now(),
      }));
      await setStorageValue(STORAGE_CONSTANTS.KEYS.TAGS, [...filteredTags, ...newTags]);
      logger.info('Storage', 'Tags saved', { url, tags });
    } catch (error) {
      logger.error('Storage', 'Failed to save tags', error as Error);
      throw error;
    }
  }

  async getAllTags(): Promise<StoredTag[]> {
    const tags = await getStorageValue<StoredTag[]>(STORAGE_CONSTANTS.KEYS.TAGS, []);
    return tags || [];
  }

  async getTagsForUrl(url: string): Promise<string[]> {
    const allTags = await this.getAllTags();
    return allTags
      .filter(t => t.url === url)
      .map(t => t.label);
  }

  // Profile management
  async saveProfile(profile: ProfileData): Promise<void> {
    try {
      await setStorageValue(STORAGE_CONSTANTS.KEYS.PROFILE, profile);
      logger.info('Storage', 'Profile saved', { name: profile.name });
    } catch (error) {
      logger.error('Storage', 'Failed to save profile', error as Error);
      throw error;
    }
  }

  async getProfile(): Promise<ProfileData | null> {
    return await getStorageValue<ProfileData>(STORAGE_CONSTANTS.KEYS.PROFILE, null);
  }

  async cacheProfile(pubkey: string, profile: ProfileData, ttl: number = TIMING_CONSTANTS.PROFILE_CACHE_TTL): Promise<void> {
    try {
      const cached: CachedProfile = {
        data: profile,
        cachedAt: Date.now(),
        ttl,
      };
      const key = `profile_cache_${pubkey}`;
      await chrome.storage.local.set({ [key]: cached });
      logger.debug('Storage', 'Profile cached', { pubkey });
    } catch (error) {
      logger.error('Storage', 'Failed to cache profile', error as Error);
    }
  }

  async getCachedProfile(pubkey: string): Promise<ProfileData | null> {
    try {
      const key = `profile_cache_${pubkey}`;
      const result = await chrome.storage.local.get(key);
      const cached: CachedProfile = result[key];
      
      if (!cached) return null;
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - cached.cachedAt > cached.ttl) {
        // Cache expired, remove it
        await chrome.storage.local.remove(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      logger.error('Storage', 'Failed to get cached profile', error as Error);
      return null;
    }
  }

  // Settings
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      logger.error('Storage', `Failed to get setting: ${key}`, error as Error);
      return defaultValue;
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
      logger.debug('Storage', `Setting saved: ${key}`, { value });
    } catch (error) {
      logger.error('Storage', `Failed to save setting: ${key}`, error as Error);
      throw error;
    }
  }

  // Drawings
  async saveDrawing(drawing: Drawing): Promise<void> {
    try {
      // Check storage quota before saving
      const quotaCheck = await this.checkStorageQuota();
      
      // Warn if storage is getting full, but don't block save unless critical
      if (quotaCheck.percentUsed >= 90) {
        logger.warn('Storage', 'Storage quota critical', {
          percentUsed: quotaCheck.percentUsed.toFixed(1),
          usedMB: quotaCheck.usedMB.toFixed(2),
          quotaMB: quotaCheck.quotaMB.toFixed(2),
        });
        // Still try to save - let Chrome handle the error if truly full
      } else if (quotaCheck.percentUsed >= 75) {
        logger.warn('Storage', 'Storage quota warning', {
          percentUsed: quotaCheck.percentUsed.toFixed(1),
          usedMB: quotaCheck.usedMB.toFixed(2),
          quotaMB: quotaCheck.quotaMB.toFixed(2),
        });
      }
      
      const drawings = await this.getAllDrawings();
      drawings[drawing.url] = drawing;
      
      try {
        await chrome.storage.local.set({ pubky_drawings: drawings });
        logger.info('Storage', 'Drawing saved', { 
          url: drawing.url, 
          storageUsed: `${quotaCheck.usedMB.toFixed(2)}MB`,
          percentUsed: `${quotaCheck.percentUsed.toFixed(1)}%`,
        });
      } catch (setError: any) {
        // Chrome will throw if quota truly exceeded
        if (setError?.message?.includes('quota') || setError?.message?.includes('QUOTA')) {
          ErrorHandler.handleAndThrow(setError, {
            context: 'Storage',
            data: {
              operation: 'saveDrawing',
              usedMB: quotaCheck.usedMB,
              quotaMB: quotaCheck.quotaMB,
              percentUsed: quotaCheck.percentUsed,
            },
            userMessage: `Storage quota exceeded. Used: ${quotaCheck.usedMB.toFixed(2)}MB / ${quotaCheck.quotaMB.toFixed(2)}MB. Please delete some drawings to free up space.`,
          });
        }
        ErrorHandler.handleAndThrow(setError, {
          context: 'Storage',
          data: { operation: 'saveDrawing' },
        });
      }
    } catch (error) {
      logger.error('Storage', 'Failed to save drawing', error as Error);
      throw error;
    }
  }

  /**
   * Check storage quota and usage
   */
  async checkStorageQuota(): Promise<{ hasSpace: boolean; usedMB: number; quotaMB: number; percentUsed: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quotaBytes = chrome.storage.local.QUOTA_BYTES || STORAGE_CONSTANTS.STORAGE_QUOTA_BYTES;
      
      const usedMB = bytesInUse / (1024 * 1024);
      const quotaMB = quotaBytes / (1024 * 1024);
      const percentUsed = (bytesInUse / quotaBytes) * 100;
      
      // Warn if over threshold
      const hasSpace = percentUsed < STORAGE_CONSTANTS.STORAGE_CRITICAL_THRESHOLD;
      
      if (percentUsed > STORAGE_CONSTANTS.STORAGE_WARNING_THRESHOLD) {
        logger.warn('Storage', 'Storage quota warning', { 
          usedMB: usedMB.toFixed(2), 
          quotaMB: quotaMB.toFixed(2),
          percentUsed: percentUsed.toFixed(1)
        });
      }
      
      return {
        hasSpace,
        usedMB,
        quotaMB,
        percentUsed,
      };
    } catch (error) {
      logger.error('Storage', 'Failed to check storage quota', error as Error);
      return { hasSpace: true, usedMB: 0, quotaMB: 5, percentUsed: 0 };
    }
  }

  async getDrawing(url: string): Promise<Drawing | null> {
    try {
      const drawings = await this.getAllDrawings();
      return drawings[url] || null;
    } catch (error) {
      logger.error('Storage', 'Failed to get drawing', error as Error);
      return null;
    }
  }

  async getAllDrawings(): Promise<{ [url: string]: Drawing }> {
    const drawings = await getStorageValue<{ [url: string]: Drawing }>(STORAGE_CONSTANTS.KEYS.DRAWINGS, {});
    return drawings || {};
  }

  async deleteDrawing(url: string): Promise<void> {
    try {
      const drawings = await this.getAllDrawings();
      delete drawings[url];
      await chrome.storage.local.set({ pubky_drawings: drawings });
      logger.info('Storage', 'Drawing deleted', { url });
    } catch (error) {
      logger.error('Storage', 'Failed to delete drawing', error as Error);
      throw error;
    }
  }
}

export const storage = Storage.getInstance();

