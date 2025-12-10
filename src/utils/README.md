# Utility Modules

Shared utility functions and classes used across the extension.

## Module Index

### Authentication

| Module | Purpose |
|--------|---------|
| `auth-sdk.ts` | Authentication via official Pubky SDK (uses `@synonymdev/pubky`) |

**Homeserver Resolution:** The homeserver URL is derived from the user's public key: `'pubky://' + publicKey.z32()`. This ensures proper routing via the Pubky DHT without hardcoded URLs.

### Storage

| Module | Purpose |
|--------|---------|
| `storage.ts` | Chrome storage wrapper (sessions, bookmarks, tags, drawings) |
| `annotations.ts` | Annotation-specific storage |
| `annotation-sync.ts` | Annotation sync to Pubky |
| `drawing-sync.ts` | Drawing sync to Pubky |

### API Clients

| Module | Purpose |
|--------|---------|
| `pubky-api.ts` | Basic Pubky API client |
| `pubky-api-sdk.ts` | Full Pubky SDK integration |
| `nexus-client.ts` | Nexus API for querying posts/users |

### Cryptography

| Module | Purpose |
|--------|---------|
| `crypto.ts` | SHA-256, Base64URL, UTF-16 hash encoding, auth tokens |

### Validation

| Module | Purpose |
|--------|---------|
| `validation.ts` | Centralized input validation for URLs, text, tags, profiles |

### UI Utilities

| Module | Purpose |
|--------|---------|
| `tag-colors.ts` | Consistent tag coloring |
| `logger.ts` | Debug logging system |

### Profile

| Module | Purpose |
|--------|---------|
| `profile-generator.ts` | Profile HTML generation |
| `profile-manager.ts` | Profile data management |
| `image-handler.ts` | Image processing |

### Protocol

| Module | Purpose |
|--------|---------|
| `pubky-specs.ts` | Pubky App data specifications |

## Key APIs

### Storage Singleton

```typescript
import { storage } from './storage';

// Sessions
await storage.saveSession(session);
const session = await storage.getSession();
await storage.clearSession();

// Bookmarks
await storage.saveBookmark(bookmark);
const isBookmarked = await storage.isBookmarked(url);
await storage.removeBookmark(url);

// Tags
await storage.saveTags(url, ['tag1', 'tag2']);
const tags = await storage.getTagsForUrl(url);

// Drawings
await storage.saveDrawing(drawing);
const drawing = await storage.getDrawing(url);
```

### Crypto Functions

```typescript
import { sha256, generateUrlHashTag, base64UrlEncode } from './crypto';

// Hash URL for tags
const hashTag = await generateUrlHashTag('https://example.com');

// SHA-256 hash
const hash = await sha256(data);

// Base64URL encoding
const encoded = base64UrlEncode(bytes);
```

### Logger

```typescript
import { logger } from './logger';

logger.debug('Context', 'Debug message', { data });
logger.info('Context', 'Info message');
logger.warn('Context', 'Warning message');
logger.error('Context', 'Error message', error);
```

### Tag Colors

```typescript
import { getTagColor, getTagStyle } from './tag-colors';

const color = getTagColor('javascript');  // '#2563EB'
const style = getTagStyle('javascript');  // { backgroundColor, color }
```

### Validation

```typescript
import { 
  validateUrl, 
  validateAnnotation,
  validateProfile,
  validateTags,
  parseAndValidateTags,
  VALIDATION_LIMITS 
} from './validation';

// Validate URL
const urlResult = validateUrl('https://example.com');
if (!urlResult.valid) {
  console.error(urlResult.error);
}

// Validate annotation data
const annotationResult = validateAnnotation({
  url: 'https://example.com',
  selectedText: 'Some text',
  comment: 'My comment',
});

// Validate profile data
const profileResult = validateProfile({
  name: 'John Doe',
  bio: 'Hello world',
  links: [{ title: 'Twitter', url: 'https://twitter.com/john' }],
});

// Parse and validate tags from user input
const tagResult = parseAndValidateTags('hello, world, test');
if (tagResult.valid) {
  console.log(tagResult.sanitizedTags); // ['hello', 'world', 'test']
}

// Access validation limits
console.log(VALIDATION_LIMITS.COMMENT_MAX_LENGTH); // 2000
```

### Pubky API SDK

```typescript
import { pubkyAPISDK } from './pubky-api-sdk';

// Create bookmark (creates post + bookmark)
const { fullPath, postUri } = await pubkyAPISDK.createBookmark(url);

// Create post with tags
await pubkyAPISDK.createLinkPost(url, content, tags);

// Search posts by URL
const posts = await pubkyAPISDK.searchPostsByUrl(url, viewerId);
```

### Nexus Client

```typescript
import { nexusClient } from './nexus-client';

// Get user profile
const user = await nexusClient.getUser(userId);

// Stream posts
const { data } = await nexusClient.streamPosts({
  source: 'following',
  observer_id: userId,
  limit: 20,
});

// Search by tag
const posts = await nexusClient.searchPostsByTag('javascript');
```

## Testing

Unit tests are in `__tests__/` directory:

```bash
npm test
```

## See Also

- [Testing Documentation](../../docs/TESTING.md)
- [UTF-16 Encoding Spec](../../docs/UTF16_HASH_ENCODING.md)

