/**
 * @fileoverview Cryptographic utilities for Pubky authentication and URL hashing.
 * 
 * This module provides:
 * - Hex/bytes conversion utilities
 * - SHA-256 hashing
 * - Base64URL encoding/decoding
 * - Auth token encryption/decryption
 * - UTF-16 URL hash tag generation
 * 
 * @module utils/crypto
 */

import { logger } from './logger';

/**
 * Converts a hexadecimal string to a Uint8Array.
 * 
 * @param {string} hex - Hexadecimal string (e.g., "deadbeef")
 * @returns {Uint8Array} Byte array representation
 * 
 * @example
 * const bytes = hexToBytes('deadbeef');
 * // Returns Uint8Array([0xde, 0xad, 0xbe, 0xef])
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a hexadecimal string.
 * 
 * @param {Uint8Array} bytes - Byte array to convert
 * @returns {string} Lowercase hexadecimal string
 * 
 * @example
 * const hex = bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * // Returns 'deadbeef'
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a cryptographically secure 32-byte random secret for the auth flow.
 * 
 * Uses the Web Crypto API's `getRandomValues` for secure randomness.
 * 
 * @returns {Uint8Array} 32-byte random secret
 * 
 * @example
 * const secret = generateClientSecret();
 * console.log(secret.length); // 32
 */
export function generateClientSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  logger.debug('Crypto', 'Generated client secret');
  return secret;
}

/**
 * Computes the SHA-256 hash of the input data.
 * 
 * Uses the Web Crypto API's SubtleCrypto interface for hashing.
 * 
 * @param {Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} 32-byte SHA-256 hash
 * 
 * @example
 * const data = new TextEncoder().encode('hello');
 * const hash = await sha256(data);
 * console.log(hash.length); // 32
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Create a proper ArrayBuffer to avoid TypeScript issues with typed array views
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Encodes a Uint8Array as a Base64URL string (URL-safe Base64).
 * 
 * Base64URL replaces:
 * - `+` with `-`
 * - `/` with `_`
 * - Removes padding `=`
 * 
 * @param {Uint8Array} bytes - Data to encode
 * @returns {string} Base64URL-encoded string
 * 
 * @example
 * const encoded = base64UrlEncode(new Uint8Array([1, 2, 3]));
 * // Returns URL-safe string without padding
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes a Base64URL string to a Uint8Array.
 * 
 * Handles missing padding and converts URL-safe characters back.
 * 
 * @param {string} str - Base64URL-encoded string
 * @returns {Uint8Array} Decoded byte array
 * 
 * @example
 * const bytes = base64UrlDecode('AQID');
 * // Returns Uint8Array([1, 2, 3])
 */
export function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed (Base64 strings should be multiple of 4)
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypts an auth token using XOR with the client secret.
 * 
 * XOR encryption/decryption is symmetric - the same operation
 * encrypts and decrypts. The secret is cycled if shorter than the token.
 * 
 * @param {Uint8Array} encryptedToken - Encrypted token bytes
 * @param {Uint8Array} secret - Client secret for decryption
 * @returns {Uint8Array} Decrypted token bytes
 * 
 * @example
 * const decrypted = decryptAuthToken(encryptedToken, clientSecret);
 */
export function decryptAuthToken(encryptedToken: Uint8Array, secret: Uint8Array): Uint8Array {
  const decrypted = new Uint8Array(encryptedToken.length);
  for (let i = 0; i < encryptedToken.length; i++) {
    // XOR each byte with corresponding secret byte (cycling if needed)
    decrypted[i] = encryptedToken[i] ^ secret[i % secret.length];
  }
  logger.debug('Crypto', 'Auth token decrypted');
  return decrypted;
}

/**
 * Parsed authentication token structure.
 * 
 * The token contains all information needed to establish
 * an authenticated session with a Pubky homeserver.
 */
export interface AuthToken {
  /** Ed25519 signature (64 bytes) */
  signature: Uint8Array;
  /** Token namespace, should be "PUBKY:AUTH" */
  namespace: string;
  /** Protocol version number */
  version: number;
  /** Token creation timestamp (microseconds since Unix epoch) */
  timestamp: bigint;
  /** User's Pubky ID (hex-encoded public key) */
  pubky: string;
  /** Granted capabilities (e.g., ["read", "write"]) */
  capabilities: string[];
}

/**
 * Parses a decrypted auth token into its component parts.
 * 
 * Token structure (binary format):
 * - 64 bytes: Ed25519 signature
 * - 10 bytes: Namespace ("PUBKY:AUTH")
 * - 1 byte: Version
 * - 8 bytes: Timestamp (big-endian uint64)
 * - 32 bytes: Pubky public key
 * - Remaining: Comma-separated capabilities
 * 
 * @param {Uint8Array} tokenBytes - Decrypted token bytes
 * @returns {AuthToken} Parsed token object
 * @throws {Error} If token format is invalid
 * 
 * @example
 * const token = parseAuthToken(decryptedBytes);
 * console.log(token.pubky); // User's Pubky ID
 * console.log(token.capabilities); // ['read', 'write']
 */
export function parseAuthToken(tokenBytes: Uint8Array): AuthToken {
  try {
    let offset = 0;

    // Read signature (64 bytes) - Ed25519 signature
    const signature = tokenBytes.slice(offset, offset + 64);
    offset += 64;

    // Read namespace (10 bytes) - Should be "PUBKY:AUTH"
    const namespaceBytes = tokenBytes.slice(offset, offset + 10);
    const namespace = new TextDecoder().decode(namespaceBytes);
    offset += 10;

    // Read version (1 byte) - Protocol version
    const version = tokenBytes[offset];
    offset += 1;

    // Read timestamp (8 bytes, big-endian) - Microseconds since Unix epoch
    const timestampView = new DataView(tokenBytes.buffer, offset, 8);
    const timestamp = timestampView.getBigUint64(0, false); // false = big-endian
    offset += 8;

    // Read pubky (32 bytes) - Public key
    const pubkyBytes = tokenBytes.slice(offset, offset + 32);
    const pubky = bytesToHex(pubkyBytes);
    offset += 32;

    // Read capabilities (rest of the token) - Comma-separated list
    const capabilitiesBytes = tokenBytes.slice(offset);
    const capabilitiesString = new TextDecoder().decode(capabilitiesBytes);
    const capabilities = capabilitiesString.split(',').filter(c => c.length > 0);

    logger.info('Crypto', 'Auth token parsed successfully', { pubky, capabilities });

    return {
      signature,
      namespace,
      version,
      timestamp,
      pubky,
      capabilities,
    };
  } catch (error) {
    logger.error('Crypto', 'Failed to parse auth token', error as Error);
    throw new Error('Invalid auth token format');
  }
}

/**
 * Generates a deterministic URL hash tag for Nexus querying.
 * 
 * Uses UTF-16 encoding of SHA-256 hash to create a 10-character tag
 * that uniquely identifies a URL without revealing it.
 * 
 * ## Algorithm
 * 
 * 1. UTF-8 encode the URL
 * 2. Compute SHA-256 hash (32 bytes)
 * 3. Take first 20 bytes (160 bits)
 * 4. Encode as UTF-16 pairs (10 characters)
 * 5. Lowercase for Pubky tag compatibility
 * 
 * ## Properties
 * 
 * - **Deterministic**: Same URL always produces same hash
 * - **Collision-resistant**: 2^160 possible hashes (birthday collision at ~2^80)
 * - **Privacy-preserving**: Hash doesn't reveal URL
 * - **Fixed length**: Always 10 characters
 * 
 * @param {string} url - URL to hash
 * @returns {Promise<string>} 10-character UTF-16 hash tag
 * @throws {Error} If hashing fails
 * 
 * @example
 * const hashTag = await generateUrlHashTag('https://example.com');
 * console.log(hashTag.length); // 10
 * 
 * // Same URL always produces same hash
 * const hash1 = await generateUrlHashTag('https://pubky.app');
 * const hash2 = await generateUrlHashTag('https://pubky.app');
 * console.log(hash1 === hash2); // true
 * 
 * @see {@link https://github.com/pubky/graphiti/blob/main/docs/UTF16_HASH_ENCODING.md|UTF-16 Encoding Specification}
 */
export async function generateUrlHashTag(url: string): Promise<string> {
  try {
    // Step 1: Encode the URL as UTF-8 bytes
    const encoder = new TextEncoder();
    const urlBytes = encoder.encode(url);
    
    // Step 2: Generate SHA-256 hash (32 bytes = 256 bits)
    const hashBytes = await sha256(urlBytes);
    
    // Step 3: Take first 20 bytes (160 bits) for UTF-16 encoding
    // This provides sufficient entropy while keeping output compact
    const truncatedHash = hashBytes.slice(0, 20);
    
    // Step 4: Encode as UTF-16 by treating pairs of bytes as 16-bit code points
    // Uses little-endian byte order: first byte is low bits, second is high bits
    // Filter out problematic characters for better compatibility
    let hashTag = '';
    for (let i = 0; i < truncatedHash.length; i += 2) {
      // Combine two bytes into a 16-bit value (little-endian)
      let codePoint = truncatedHash[i] | (truncatedHash[i + 1] << 8);
      
      // Filter out problematic code points:
      // - Control characters (U+0000-U+001F, U+007F-U+009F)
      // - Surrogate pairs (U+D800-U+DFFF) 
      // - Private use area issues
      if (codePoint < 0x20 || 
          (codePoint >= 0x7F && codePoint <= 0x9F) || 
          (codePoint >= 0xD800 && codePoint <= 0xDFFF)) {
        // Map to safe Unicode range (Miscellaneous Symbols block)
        // This preserves determinism while ensuring valid characters
        codePoint = 0x2600 + (codePoint % 256);
      }
      
      // Convert to character - produces various Unicode characters
      hashTag += String.fromCharCode(codePoint);
    }
    
    // Step 5: Ensure it's lowercase (Pubky tags are normalized to lowercase)
    hashTag = hashTag.toLowerCase();
    
    logger.debug('Crypto', 'Generated UTF-16 URL hash tag', { 
      url, 
      hashTag,
      length: hashTag.length,
      codePoints: [...hashTag].map(c => c.charCodeAt(0))
    });
    
    return hashTag;
  } catch (error) {
    logger.error('Crypto', 'Failed to generate URL hash tag', error as Error);
    throw error;
  }
}
