/**
 * @fileoverview Pubky Client singleton factory
 * 
 * Provides a single shared instance of the Pubky Client across the extension
 * to prevent memory leaks and ensure consistent state.
 */

import { logger } from './logger';

type Client = any;

let clientInstance: Client | null = null;

let initializationPromise: Promise<Client> | null = null;

/**
 * Get or create the singleton Pubky Client instance
 * Note: This is synchronous but may return null if not yet initialized
 * Use getPubkyClientAsync() for guaranteed initialization
 * @returns The shared Pubky Client instance or null if not initialized
 */
export function getPubkyClient(): Client | null {
  return clientInstance;
}

/**
 * Initialize the Pubky Client singleton
 * Call this before using getPubkyClient() if you need synchronous access
 */
export async function initializePubkyClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    const { Client } = await import('@synonymdev/pubky');
    clientInstance = new Client();
    logger.info('PubkyClientFactory', 'Pubky Client singleton initialized');
    return clientInstance;
  })();
  
  return initializationPromise;
}

/**
 * Get or create the singleton Pubky Client instance (async version)
 * Use this when you need to ensure the SDK is fully loaded
 * @returns Promise that resolves to the shared Pubky Client instance
 */
export async function getPubkyClientAsync(): Promise<Client> {
  return initializePubkyClient();
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPubkyClient(): void {
  clientInstance = null;
  initializationPromise = null;
}

