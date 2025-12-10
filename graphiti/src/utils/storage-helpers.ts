/**
 * @fileoverview Helper utilities for Chrome storage operations.
 * 
 * Provides common patterns for storage operations to reduce duplication.
 * 
 * @module utils/storage-helpers
 */

import { logger } from './logger';
import { toError } from './type-guards';

/**
 * Safely get a value from Chrome storage
 */
export async function getStorageValue<T>(
  key: string,
  defaultValue: T | null = null
): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? defaultValue;
  } catch (error) {
    logger.error('StorageHelpers', `Failed to get storage value: ${key}`, toError(error));
    return defaultValue;
  }
}

/**
 * Safely set a value in Chrome storage
 */
export async function setStorageValue<T>(
  key: string,
  value: T
): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
    logger.debug('StorageHelpers', `Storage value set: ${key}`);
  } catch (error) {
    logger.error('StorageHelpers', `Failed to set storage value: ${key}`, toError(error));
    throw error;
  }
}

/**
 * Safely remove a value from Chrome storage
 */
export async function removeStorageValue(key: string): Promise<void> {
  try {
    await chrome.storage.local.remove(key);
    logger.debug('StorageHelpers', `Storage value removed: ${key}`);
  } catch (error) {
    logger.error('StorageHelpers', `Failed to remove storage value: ${key}`, toError(error));
    throw error;
  }
}

/**
 * Get multiple storage values at once
 */
export async function getStorageValues<T extends Record<string, any>>(
  keys: (keyof T)[]
): Promise<Partial<T>> {
  try {
    const result = await chrome.storage.local.get(keys as string[]);
    return result as Partial<T>;
  } catch (error) {
    logger.error('StorageHelpers', 'Failed to get storage values', toError(error));
    return {} as Partial<T>;
  }
}

/**
 * Set multiple storage values at once
 */
export async function setStorageValues<T extends Record<string, any>>(
  values: T
): Promise<void> {
  try {
    await chrome.storage.local.set(values);
    logger.debug('StorageHelpers', 'Multiple storage values set', { keys: Object.keys(values) });
  } catch (error) {
    logger.error('StorageHelpers', 'Failed to set storage values', toError(error));
    throw error;
  }
}

