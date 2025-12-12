/**
 * @fileoverview Pubky Client singleton factory
 * 
 * Provides a single shared instance of the Pubky Client across the extension
 * to prevent memory leaks and ensure consistent state.
 */

import { logger } from './logger';

// Type for Pubky Client (using any until SDK exports proper types)
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
    const pubkyModule = await import('@synonymdev/pubky');
    // SDK exports Client as default or named export - handle both
    const Client = (pubkyModule as any).Client || (pubkyModule as any).default?.Client || pubkyModule.default;
    
    // Configure log level if available
    if ('setLogLevel' in pubkyModule && typeof (pubkyModule as any).setLogLevel === 'function') {
      const setLogLevel = (pubkyModule as any).setLogLevel;
      if (process.env.NODE_ENV === 'production') {
        setLogLevel('error');
      } else {
        setLogLevel('debug');
      }
    }
    
    clientInstance = new Client();
    logger.info('PubkyClientFactory', 'Pubky Client singleton initialized');
    return clientInstance;
  })();
  
  return initializationPromise;
}

/**
 * Get or create the singleton Pubky Client instance (async version)
 * Use this when you need to ensure the SDK is fully loaded
 * @param useTestnet - If true, use TestnetClient instead of Client (defaults to env var)
 * @returns Promise that resolves to the shared Pubky Client instance
 */
export async function getPubkyClientAsync(useTestnet?: boolean): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Check environment variable if useTestnet not explicitly provided
  const shouldUseTestnet = useTestnet ?? ((import.meta as any).env?.VITE_PUBKY_NETWORK === 'testnet');
  
  initializationPromise = (async () => {
    const pubkyModule = await import('@synonymdev/pubky');
    
    // Configure log level if available
    if ('setLogLevel' in pubkyModule && typeof (pubkyModule as any).setLogLevel === 'function') {
      const setLogLevel = (pubkyModule as any).setLogLevel;
      if (process.env.NODE_ENV === 'production') {
        setLogLevel('error');
      } else {
        setLogLevel('debug');
      }
    }
    
    // Use TestnetClient if requested, otherwise use regular Client
    // SDK exports Client as default or named export - handle both
    const ClientClass = shouldUseTestnet && 'TestnetClient' in pubkyModule
      ? (pubkyModule as any).TestnetClient
      : ((pubkyModule as any).Client || (pubkyModule as any).default?.Client || pubkyModule.default);
    
    clientInstance = new ClientClass();
    logger.info('PubkyClientFactory', `Pubky Client singleton initialized (${shouldUseTestnet ? 'testnet' : 'mainnet'})`);
    return clientInstance;
  })();
  
  return initializationPromise;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPubkyClient(): void {
  clientInstance = null;
  initializationPromise = null;
}

