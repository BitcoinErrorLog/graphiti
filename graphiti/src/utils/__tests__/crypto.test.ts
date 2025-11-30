/**
 * Crypto Utilities Tests
 * 
 * Comprehensive tests for cryptographic functions including:
 * - Hex/Bytes conversions
 * - SHA-256 hashing
 * - Base64URL encoding/decoding
 * - Auth token parsing
 * - UTF-16 URL hash tag generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hexToBytes,
  bytesToHex,
  sha256,
  base64UrlEncode,
  base64UrlDecode,
  decryptAuthToken,
  parseAuthToken,
  generateUrlHashTag,
  generateClientSecret,
} from '../crypto';

// Mock the logger to prevent console output during tests
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Crypto Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Hex/Bytes Conversion Tests
  // ============================================
  describe('hexToBytes', () => {
    it('should convert hex string to Uint8Array', () => {
      const hex = 'deadbeef';
      const result = hexToBytes(hex);
      expect(result).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle empty string', () => {
      const result = hexToBytes('');
      expect(result).toEqual(new Uint8Array([]));
    });

    it('should handle lowercase hex', () => {
      const result = hexToBytes('abcdef');
      expect(result).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should handle uppercase hex', () => {
      const result = hexToBytes('ABCDEF');
      expect(result).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should convert all zeros', () => {
      const result = hexToBytes('00000000');
      expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('should convert all ones (ff)', () => {
      const result = hexToBytes('ffffffff');
      expect(result).toEqual(new Uint8Array([255, 255, 255, 255]));
    });
  });

  describe('bytesToHex', () => {
    it('should convert Uint8Array to hex string', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const result = bytesToHex(bytes);
      expect(result).toBe('deadbeef');
    });

    it('should handle empty array', () => {
      const result = bytesToHex(new Uint8Array([]));
      expect(result).toBe('');
    });

    it('should pad single-digit hex values with zero', () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x0f]);
      const result = bytesToHex(bytes);
      expect(result).toBe('01020f');
    });

    it('should be reversible with hexToBytes', () => {
      const original = 'deadbeef1234567890abcdef';
      const bytes = hexToBytes(original);
      const result = bytesToHex(bytes);
      expect(result).toBe(original);
    });
  });

  // ============================================
  // SHA-256 Tests
  // ============================================
  describe('sha256', () => {
    it('should generate correct hash for known input', async () => {
      // SHA-256 of "hello" is known
      const input = new TextEncoder().encode('hello');
      const result = await sha256(input);
      const hexResult = bytesToHex(result);
      
      // Expected SHA-256 hash of "hello"
      expect(hexResult).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should return 32 bytes (256 bits)', async () => {
      const input = new TextEncoder().encode('test');
      const result = await sha256(input);
      expect(result.length).toBe(32);
    });

    it('should produce different hashes for different inputs', async () => {
      const input1 = new TextEncoder().encode('hello');
      const input2 = new TextEncoder().encode('world');
      
      const hash1 = await sha256(input1);
      const hash2 = await sha256(input2);
      
      expect(bytesToHex(hash1)).not.toBe(bytesToHex(hash2));
    });

    it('should produce same hash for same input (deterministic)', async () => {
      const input = new TextEncoder().encode('consistent');
      
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);
      
      expect(bytesToHex(hash1)).toBe(bytesToHex(hash2));
    });

    it('should handle empty input', async () => {
      const input = new TextEncoder().encode('');
      const result = await sha256(input);
      const hexResult = bytesToHex(result);
      
      // SHA-256 of empty string
      expect(hexResult).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  // ============================================
  // Base64URL Encoding/Decoding Tests
  // ============================================
  describe('base64UrlEncode', () => {
    it('should encode bytes to base64url', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = base64UrlEncode(bytes);
      expect(result).toBe('SGVsbG8');
    });

    it('should use URL-safe characters (- instead of +)', () => {
      // Find input that produces + in standard base64
      const bytes = new Uint8Array([0xfb, 0xef]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('+');
    });

    it('should use URL-safe characters (_ instead of /)', () => {
      // Find input that produces / in standard base64
      const bytes = new Uint8Array([0xff, 0xff]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('/');
    });

    it('should not include padding characters', () => {
      const bytes = new Uint8Array([0x01]);
      const result = base64UrlEncode(bytes);
      expect(result).not.toContain('=');
    });

    it('should handle empty input', () => {
      const result = base64UrlEncode(new Uint8Array([]));
      expect(result).toBe('');
    });
  });

  describe('base64UrlDecode', () => {
    it('should decode base64url to bytes', () => {
      const encoded = 'SGVsbG8'; // "Hello"
      const result = base64UrlDecode(encoded);
      expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should handle URL-safe characters', () => {
      const encoded = 'abc-def_ghi';
      const result = base64UrlDecode(encoded);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should handle missing padding', () => {
      // Input without padding that would normally need it
      const encoded = 'YQ'; // 'a' without padding
      const result = base64UrlDecode(encoded);
      expect(result).toEqual(new Uint8Array([0x61]));
    });

    it('should be reversible with base64UrlEncode', () => {
      const original = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toEqual(original);
    });
  });

  // ============================================
  // Auth Token Decryption Tests
  // ============================================
  describe('decryptAuthToken', () => {
    it('should XOR decrypt the token with secret', () => {
      const encrypted = new Uint8Array([0x05, 0x07, 0x09]);
      const secret = new Uint8Array([0x01, 0x02, 0x03]);
      const result = decryptAuthToken(encrypted, secret);
      
      // XOR: 0x05^0x01=0x04, 0x07^0x02=0x05, 0x09^0x03=0x0a
      expect(result).toEqual(new Uint8Array([0x04, 0x05, 0x0a]));
    });

    it('should cycle through secret for longer tokens', () => {
      const encrypted = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
      const secret = new Uint8Array([0x01, 0x02]);
      const result = decryptAuthToken(encrypted, secret);
      
      // Secret cycles: 0x01, 0x02, 0x01, 0x02, 0x01, 0x02
      expect(result).toEqual(new Uint8Array([0x00, 0x00, 0x02, 0x06, 0x04, 0x04]));
    });

    it('should return original when XORed with zeros', () => {
      const encrypted = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const secret = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const result = decryptAuthToken(encrypted, secret);
      expect(result).toEqual(encrypted);
    });

    it('should be reversible (encrypt = decrypt)', () => {
      const original = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const secret = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
      
      const encrypted = decryptAuthToken(original, secret);
      const decrypted = decryptAuthToken(encrypted, secret);
      
      expect(decrypted).toEqual(original);
    });
  });

  // ============================================
  // Auth Token Parsing Tests
  // ============================================
  describe('parseAuthToken', () => {
    it('should parse a valid auth token structure', () => {
      // Create a mock token with the expected structure:
      // - 64 bytes signature
      // - 10 bytes namespace "PUBKY:AUTH"
      // - 1 byte version
      // - 8 bytes timestamp (big-endian)
      // - 32 bytes pubky
      // - rest: capabilities
      
      const tokenParts = [
        new Uint8Array(64).fill(0x01), // signature
        new TextEncoder().encode('PUBKY:AUTH'), // namespace (10 bytes)
        new Uint8Array([0x01]), // version
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 100]), // timestamp (100 as bigint)
        new Uint8Array(32).fill(0xab), // pubky
        new TextEncoder().encode('read,write'), // capabilities
      ];
      
      const tokenBytes = new Uint8Array(
        tokenParts.reduce((acc, part) => acc + part.length, 0)
      );
      
      let offset = 0;
      for (const part of tokenParts) {
        tokenBytes.set(part, offset);
        offset += part.length;
      }
      
      const result = parseAuthToken(tokenBytes);
      
      expect(result.namespace).toBe('PUBKY:AUTH');
      expect(result.version).toBe(1);
      expect(result.timestamp).toBe(100n);
      expect(result.capabilities).toEqual(['read', 'write']);
    });

    it('should throw on invalid token format', () => {
      const invalidToken = new Uint8Array(10); // Too short
      expect(() => parseAuthToken(invalidToken)).toThrow('Invalid auth token format');
    });
  });

  // ============================================
  // Client Secret Generation Tests
  // ============================================
  describe('generateClientSecret', () => {
    it('should generate 32-byte secret', () => {
      const secret = generateClientSecret();
      expect(secret.length).toBe(32);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateClientSecret();
      const secret2 = generateClientSecret();
      expect(bytesToHex(secret1)).not.toBe(bytesToHex(secret2));
    });
  });

  // ============================================
  // UTF-16 URL Hash Tag Generation Tests
  // ============================================
  describe('generateUrlHashTag', () => {
    /**
     * UTF-16 Encoding Test Suite
     * 
     * The generateUrlHashTag function uses a unique UTF-16 encoding approach:
     * 1. SHA-256 hash the URL (32 bytes)
     * 2. Take first 20 bytes (160 bits)
     * 3. Combine byte pairs into 16-bit UTF-16 code points (little-endian)
     * 4. Convert to lowercase
     * 5. Result: 10 Unicode characters
     */

    it('should generate a 10-character hash tag', async () => {
      const url = 'https://example.com';
      const result = await generateUrlHashTag(url);
      expect(result.length).toBe(10);
    });

    it('should be deterministic (same URL = same hash)', async () => {
      const url = 'https://pubky.app';
      
      const hash1 = await generateUrlHashTag(url);
      const hash2 = await generateUrlHashTag(url);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different URLs', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://different.com';
      
      const hash1 = await generateUrlHashTag(url1);
      const hash2 = await generateUrlHashTag(url2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should return lowercase characters', async () => {
      const url = 'https://TEST.COM/PATH';
      const result = await generateUrlHashTag(url);
      
      // All characters should be their lowercase form
      expect(result).toBe(result.toLowerCase());
    });

    it('should treat trailing slashes as different URLs', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://example.com/';
      
      const hash1 = await generateUrlHashTag(url1);
      const hash2 = await generateUrlHashTag(url2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', async () => {
      const result = await generateUrlHashTag('');
      expect(result.length).toBe(10);
    });

    it('should handle URLs with special characters', async () => {
      const url = 'https://example.com/path?query=value&foo=bar#hash';
      const result = await generateUrlHashTag(url);
      expect(result.length).toBe(10);
    });

    it('should handle Unicode URLs', async () => {
      const url = 'https://例え.jp/パス';
      const result = await generateUrlHashTag(url);
      expect(result.length).toBe(10);
    });

    it('should use UTF-16 encoding (10 chars from 20 bytes)', async () => {
      // The function takes 20 bytes and creates 10 UTF-16 characters
      // Each pair of bytes becomes one 16-bit character
      const url = 'https://test.com';
      const result = await generateUrlHashTag(url);
      
      // Verify we get exactly 10 characters (20 bytes / 2 bytes per char)
      expect([...result].length).toBe(10);
    });

    // Test vectors for known URLs
    describe('Test Vectors', () => {
      it('should produce consistent hash for https://pubky.app', async () => {
        const url = 'https://pubky.app';
        const hash = await generateUrlHashTag(url);
        
        // This is a known test vector - the hash should always be the same
        // for this URL. We verify:
        // 1. Correct length
        expect(hash.length).toBe(10);
        
        // 2. Consistent on multiple calls
        const hash2 = await generateUrlHashTag(url);
        expect(hash).toBe(hash2);
      });

      it('should produce consistent hash for https://example.com', async () => {
        const url = 'https://example.com';
        const hash = await generateUrlHashTag(url);
        
        expect(hash.length).toBe(10);
        
        // Verify determinism
        const hash2 = await generateUrlHashTag(url);
        expect(hash).toBe(hash2);
      });
    });

    // Collision resistance tests
    describe('Collision Resistance', () => {
      it('should not have collisions for similar URLs', async () => {
        const hashes = new Set<string>();
        const urls = [
          'https://example.com',
          'https://example.com/',
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/ab',
          'https://example.com?a=1',
          'https://example.com?a=2',
          'http://example.com',
          'https://Example.com',
          'https://example.org',
        ];

        for (const url of urls) {
          const hash = await generateUrlHashTag(url);
          hashes.add(hash);
        }

        // All URLs should produce unique hashes
        expect(hashes.size).toBe(urls.length);
      });

      it('should not have collisions for 100 random URLs', async () => {
        const hashes = new Set<string>();
        
        for (let i = 0; i < 100; i++) {
          const url = `https://example.com/path/${i}/${Math.random()}`;
          const hash = await generateUrlHashTag(url);
          hashes.add(hash);
        }

        // All 100 URLs should have unique hashes
        expect(hashes.size).toBe(100);
      });
    });

    // Edge cases
    describe('Edge Cases', () => {
      it('should handle very long URLs', async () => {
        const url = 'https://example.com/' + 'a'.repeat(10000);
        const result = await generateUrlHashTag(url);
        expect(result.length).toBe(10);
      });

      it('should handle URLs with only numbers', async () => {
        const url = 'https://12345.67890';
        const result = await generateUrlHashTag(url);
        expect(result.length).toBe(10);
      });

      it('should handle data URLs', async () => {
        const url = 'data:text/html,<h1>Hello</h1>';
        const result = await generateUrlHashTag(url);
        expect(result.length).toBe(10);
      });

      it('should handle file URLs', async () => {
        const url = 'file:///path/to/file.txt';
        const result = await generateUrlHashTag(url);
        expect(result.length).toBe(10);
      });
    });
  });
});

