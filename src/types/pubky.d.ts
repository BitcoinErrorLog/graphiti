/**
 * TypeScript type definitions for @synonymdev/pubky SDK
 * 
 * These definitions provide type safety for the Pubky SDK.
 * Update as needed when SDK types are officially exported.
 */

declare module '@synonymdev/pubky' {
  export type Client = any;
  export type AuthRequest = any;
  export type PublicKey = any;
  /**
   * Main Pubky Client class
   */
  /**
   * Main Pubky Client class
   */
  export class Client {
    constructor();
    
    /**
     * Fetch data from a Pubky path
     */
    fetch(path: string, init?: RequestInit): Promise<Response>;
    
    /**
     * List items at a path
     */
    list(
      path: string,
      cursor?: unknown,
      recursive?: boolean,
      limit?: number
    ): Promise<string[]>;
    
    /**
     * Create an authentication request
     */
    authRequest(relay: string, capabilities: string): AuthRequest;
    
    /**
     * Put data to a path
     */
    put(path: string, data: unknown): Promise<void>;
    
    /**
     * Delete data at a path
     */
    delete(path: string): Promise<void>;
  }

  /**
   * Testnet Client (if available)
   */
  export class TestnetClient extends Client {}

  /**
   * Authentication request object
   */
  export interface AuthRequest {
    /**
     * Get the authentication token
     */
    token(): string;
    
    /**
     * Get the authorization URL (pubkyauth:// URL)
     */
    url(): string;
    
    /**
     * Wait for user approval and get the response (PublicKey)
     */
    response(): Promise<PublicKey>;
  }

  /**
   * Public Key object
   */
  export interface PublicKey {
    /**
     * Get z32 encoded public key
     */
    z32(): string;
  }

  /**
   * Session interface
   */
  export interface Session {
    publicKey: string;
    capabilities: string[];
  }

  /**
   * Validate capabilities string format
   * @param capabilities - Capabilities string to validate
   * @returns Validated capabilities string
   * @throws Error if capabilities are invalid
   */
  export function validateCapabilities(capabilities: string): string;

  /**
   * Set logging level for SDK
   * @param level - Log level: 'debug' | 'info' | 'warn' | 'error'
   */
  export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;

  /**
   * Create a recovery file for key backup
   * @param passphrase - User-provided passphrase for encryption
   * @returns Promise resolving to recovery file data
   */
  export function createRecoveryFile(passphrase: string): Promise<ArrayBuffer>;
}

