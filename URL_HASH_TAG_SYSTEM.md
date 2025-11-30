# URL Hash Tag System

## Overview

The extension automatically adds a **deterministic hash tag** to every post about a URL. This enables the sidebar to show posts from your contacts about the page you're currently viewing.

## Encoding Method

Graphiti uses **UTF-16 encoding** to create URL hash tags. See [docs/UTF16_HASH_ENCODING.md](docs/UTF16_HASH_ENCODING.md) for the complete technical specification.

### Quick Summary

1. SHA-256 hash the URL (32 bytes)
2. Take first 20 bytes (160 bits)
3. Encode as UTF-16 pairs (10 characters)
4. Lowercase for Pubky compatibility

**Properties:**
- Length: 10 characters (exact)
- Entropy: 160 bits (2^160 possible hashes)
- Deterministic: Same URL = same hash

## How It Works

### Automatic Tag Addition

Every link post automatically gets the URL hash tag:

```typescript
// User tags: ["tech", "cool"]
const urlHashTag = await generateUrlHashTag(url);
// Final tags: ["tech", "cool", "<hash>"]
```

### Sidebar Query

When you open the sidebar:

1. Generate hash tag for current page
2. Query Nexus for posts with that tag
3. Display posts about this URL from your network

```typescript
const urlHashTag = await generateUrlHashTag(currentUrl);
const posts = await nexusClient.streamPosts({
  tags: urlHashTag,
  viewer_id: session.pubky,
  limit: 50
});
```

## Benefits

### Consistent URL Matching

Different URL strings generate different hashes. This ensures exact matching without URL normalization complexity.

### Efficient Querying

- **Before:** Content search (slow, unreliable)
- **After:** Tag search via Nexus index (fast, accurate)

### Network Filtering

Using `viewer_id` ensures you see posts from your social graph, not random strangers.

### Privacy-Preserving

The hash doesn't reveal the URL - it's a one-way function. Only people who have the URL can generate the same hash.

## Implementation

See [`src/utils/crypto.ts`](src/utils/crypto.ts) for the `generateUrlHashTag` function.

## Testing

```typescript
const hash1 = await generateUrlHashTag('https://pubky.app');
const hash2 = await generateUrlHashTag('https://pubky.app');
console.log(hash1 === hash2); // true (deterministic)
console.log(hash1.length);    // 10 (fixed length)
```

## Related Documentation

- [UTF-16 Hash Encoding Specification](docs/UTF16_HASH_ENCODING.md)
- [Features - Bookmarks & Tags](FEATURES.md#bookmarks--tags)
