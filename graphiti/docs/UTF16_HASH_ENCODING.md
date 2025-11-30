# UTF-16 URL Hash Encoding Specification

This document provides a formal specification of the UTF-16 URL hash encoding used in Graphiti for creating deterministic, collision-resistant URL tags.

## Overview

Graphiti automatically adds a hash tag to every post about a URL. This enables efficient querying of posts about specific URLs via the Nexus API without revealing the actual URL in the tag.

## Algorithm Specification

### Input

- **URL**: Any valid URL string (UTF-8 encoded)

### Output

- **Hash Tag**: A 10-character Unicode string

### Process

```
1. URL (string)
   ↓
2. UTF-8 encode → Uint8Array
   ↓
3. SHA-256 hash → 32 bytes
   ↓
4. Truncate → First 20 bytes (160 bits)
   ↓
5. UTF-16 encode → 10 characters
   ↓
6. Lowercase → Final hash tag
```

### Step-by-Step Details

#### Step 1: UTF-8 Encoding

```typescript
const encoder = new TextEncoder();
const urlBytes = encoder.encode(url);
```

The URL string is encoded to bytes using UTF-8.

#### Step 2: SHA-256 Hash

```typescript
const hashBuffer = await crypto.subtle.digest('SHA-256', urlBytes);
const hashBytes = new Uint8Array(hashBuffer);
```

Generate a 32-byte (256-bit) SHA-256 hash of the URL bytes.

#### Step 3: Truncate to 20 Bytes

```typescript
const truncatedHash = hashBytes.slice(0, 20);
```

Take the first 20 bytes (160 bits) of the hash. This provides sufficient collision resistance while keeping the output compact.

#### Step 4: UTF-16 Encoding

```typescript
let hashTag = '';
for (let i = 0; i < truncatedHash.length; i += 2) {
  // Combine two bytes into a 16-bit value (little-endian)
  const codePoint = truncatedHash[i] | (truncatedHash[i + 1] << 8);
  
  // Convert to character
  hashTag += String.fromCharCode(codePoint);
}
```

Pairs of bytes are combined into 16-bit code points using little-endian byte order. Each pair becomes one UTF-16 character.

- 20 bytes ÷ 2 bytes per character = **10 characters**

#### Step 5: Lowercase

```typescript
hashTag = hashTag.toLowerCase();
```

The result is lowercased for Pubky tag compatibility.

## Reference Implementation

```typescript
export async function generateUrlHashTag(url: string): Promise<string> {
  // Step 1: UTF-8 encode
  const encoder = new TextEncoder();
  const urlBytes = encoder.encode(url);
  
  // Step 2: SHA-256 hash (32 bytes)
  const hashBuffer = await crypto.subtle.digest('SHA-256', urlBytes);
  const hashBytes = new Uint8Array(hashBuffer);
  
  // Step 3: Truncate to 20 bytes
  const truncatedHash = hashBytes.slice(0, 20);
  
  // Step 4: UTF-16 encode
  let hashTag = '';
  for (let i = 0; i < truncatedHash.length; i += 2) {
    const codePoint = truncatedHash[i] | (truncatedHash[i + 1] << 8);
    hashTag += String.fromCharCode(codePoint);
  }
  
  // Step 5: Lowercase
  return hashTag.toLowerCase();
}
```

Source: [`src/utils/crypto.ts`](../src/utils/crypto.ts) lines 131-181

## Properties

### Determinism

**Same URL always produces the same hash.**

This is critical for:
- Finding posts about the same URL
- Consistent tag matching in Nexus queries
- Cross-user coordination

### Character Set

The output consists of arbitrary Unicode characters in the range U+0000 to U+FFFF (Basic Multilingual Plane).

This includes:
- Common characters (letters, numbers)
- Symbols and punctuation
- Non-Latin scripts
- Control characters (lowercased)
- Rare Unicode characters

### Length

**Always exactly 10 characters.**

Each pair of hash bytes produces one UTF-16 character:
- 20 bytes ÷ 2 = 10 characters

### Collision Resistance

**Entropy: 160 bits (2^160 ≈ 1.46×10^48 possible hashes)**

Birthday paradox collision probability:
- 50% chance of collision at ~2^80 URLs ≈ 1.2 septillion URLs
- Effectively zero collision risk for practical use

### Privacy

**One-way function.** The hash does not reveal the original URL.

Only users who have the URL can generate the matching hash to find related posts.

## Comparison with Base64URL Encoding

An alternative approach uses Base64URL encoding:

| Property | UTF-16 | Base64URL |
|----------|--------|-----------|
| Output length | 10 chars | 20 chars |
| Character set | Unicode (U+0000-FFFF) | `a-z, 0-9, -, _` |
| Entropy | 160 bits | 112 bits |
| Visual appearance | Complex Unicode | URL-safe ASCII |
| Pubky compatibility | Yes (lowercase) | Yes |

Graphiti uses UTF-16 for:
- Higher entropy (160 bits vs 112 bits)
- Shorter output (10 chars vs 20 chars)
- Unique visual appearance

## Test Vectors

### Known Hash Values

These test vectors can be used to verify implementations:

| URL | Hash Tag Length | Deterministic |
|-----|-----------------|---------------|
| `https://example.com` | 10 | Yes |
| `https://pubky.app` | 10 | Yes |
| `https://example.com/` | 10 | Yes (different from above) |
| Empty string `""` | 10 | Yes |

**Note:** Trailing slashes produce different hashes.

### Verification Test

```typescript
// These should always be true
const hash1 = await generateUrlHashTag('https://test.com');
const hash2 = await generateUrlHashTag('https://test.com');
expect(hash1).toBe(hash2);  // Deterministic
expect(hash1.length).toBe(10);  // Fixed length
expect(hash1).toBe(hash1.toLowerCase());  // Lowercase
```

## Usage in Graphiti

### Creating Posts

When creating a bookmark or tagged post:

```typescript
// User tags: ["tech", "cool"]
const urlHashTag = await generateUrlHashTag(url);
const allTags = [...userTags, urlHashTag];
// Final tags: ["tech", "cool", "<utf16-hash>"]
```

### Querying Posts

When viewing a page in the sidebar:

```typescript
const urlHashTag = await generateUrlHashTag(currentUrl);
const posts = await nexusClient.streamPosts({
  tags: urlHashTag,
  viewer_id: session.pubky
});
```

## Implementation Notes

### Browser Compatibility

Uses Web Crypto API (`crypto.subtle.digest`), which is:
- ✅ Available in all modern browsers
- ✅ Available in Chrome extensions
- ✅ Available in service workers
- ⚠️ Requires HTTPS in web pages (not extensions)

### Async Operation

`generateUrlHashTag` is async because `crypto.subtle.digest` is async.

```typescript
// Always await the result
const hash = await generateUrlHashTag(url);
```

### Error Handling

The function throws on failure. Callers should handle errors:

```typescript
try {
  const hash = await generateUrlHashTag(url);
} catch (error) {
  logger.error('Failed to generate URL hash', error);
  throw error;
}
```

## See Also

- [`src/utils/crypto.ts`](../src/utils/crypto.ts) - Implementation
- [`src/utils/__tests__/crypto.test.ts`](../src/utils/__tests__/crypto.test.ts) - Unit tests
- [FEATURES.md](../FEATURES.md) - Feature documentation

