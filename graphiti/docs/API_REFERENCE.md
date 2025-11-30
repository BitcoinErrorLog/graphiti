# API Reference

This document provides a reference for the main APIs used in Graphiti.

## Storage API

The `storage` singleton provides access to Chrome local storage.

### Session Methods

```typescript
import { storage, Session } from './utils/storage';

// Save session
await storage.saveSession(session: Session): Promise<void>

// Get current session
await storage.getSession(): Promise<Session | null>

// Clear session (sign out)
await storage.clearSession(): Promise<void>
```

### Bookmark Methods

```typescript
import { storage, StoredBookmark } from './utils/storage';

// Save a bookmark
await storage.saveBookmark(bookmark: StoredBookmark): Promise<void>

// Get all bookmarks
await storage.getBookmarks(): Promise<StoredBookmark[]>

// Check if URL is bookmarked
await storage.isBookmarked(url: string): Promise<boolean>

// Get specific bookmark
await storage.getBookmark(url: string): Promise<StoredBookmark | null>

// Remove bookmark
await storage.removeBookmark(url: string): Promise<void>
```

### Tag Methods

```typescript
import { storage, StoredTag } from './utils/storage';

// Save tags for URL (replaces existing)
await storage.saveTags(url: string, tags: string[]): Promise<void>

// Get all tags
await storage.getAllTags(): Promise<StoredTag[]>

// Get tags for specific URL
await storage.getTagsForUrl(url: string): Promise<string[]>
```

### Profile Methods

```typescript
import { storage, ProfileData } from './utils/storage';

// Save profile
await storage.saveProfile(profile: ProfileData): Promise<void>

// Get profile
await storage.getProfile(): Promise<ProfileData | null>

// Cache external profile
await storage.cacheProfile(
  pubkey: string, 
  profile: ProfileData, 
  ttl?: number  // default: 1 hour
): Promise<void>

// Get cached profile
await storage.getCachedProfile(pubkey: string): Promise<ProfileData | null>
```

### Drawing Methods

```typescript
import { storage, Drawing } from './utils/storage';

// Save drawing
await storage.saveDrawing(drawing: Drawing): Promise<void>

// Get drawing for URL
await storage.getDrawing(url: string): Promise<Drawing | null>

// Get all drawings
await storage.getAllDrawings(): Promise<{ [url: string]: Drawing }>

// Delete drawing
await storage.deleteDrawing(url: string): Promise<void>
```

### Settings Methods

```typescript
import { storage } from './utils/storage';

// Get setting with default
await storage.getSetting<T>(key: string, defaultValue: T): Promise<T>

// Set setting
await storage.setSetting<T>(key: string, value: T): Promise<void>
```

---

## Crypto API

Cryptographic utilities for hashing and encoding.

### URL Hash Tags

```typescript
import { generateUrlHashTag } from './utils/crypto';

// Generate deterministic hash tag for URL
const hashTag = await generateUrlHashTag(url: string): Promise<string>
// Returns 10-character UTF-16 encoded hash
```

### Hashing

```typescript
import { sha256, bytesToHex } from './utils/crypto';

// SHA-256 hash
const hash = await sha256(data: Uint8Array): Promise<Uint8Array>

// Convert to hex string
const hexHash = bytesToHex(hash);
```

### Base64URL

```typescript
import { base64UrlEncode, base64UrlDecode } from './utils/crypto';

// Encode
const encoded = base64UrlEncode(bytes: Uint8Array): string

// Decode
const decoded = base64UrlDecode(str: string): Uint8Array
```

### Hex Conversion

```typescript
import { hexToBytes, bytesToHex } from './utils/crypto';

// Hex to bytes
const bytes = hexToBytes(hex: string): Uint8Array

// Bytes to hex
const hex = bytesToHex(bytes: Uint8Array): string
```

---

## Pubky API SDK

SDK for interacting with Pubky homeservers.

```typescript
import { pubkyAPISDK } from './utils/pubky-api-sdk';
```

### Bookmarks

```typescript
// Create bookmark (creates post + bookmark)
const { fullPath, bookmarkId, postUri } = await pubkyAPISDK.createBookmark(
  url: string
): Promise<{ fullPath: string; bookmarkId: string; postUri: string }>

// Delete bookmark
await pubkyAPISDK.deleteBookmark(postUri: string): Promise<void>
```

### Posts

```typescript
// Create link post with tags
const postUri = await pubkyAPISDK.createLinkPost(
  url: string,
  content: string,
  tags: string[]
): Promise<string>

// Search posts by URL
const posts = await pubkyAPISDK.searchPostsByUrl(
  url: string,
  viewerId?: string
): Promise<NexusPost[]>
```

### Tags

```typescript
// Create tags for a post
const tagUrls = await pubkyAPISDK.createTags(
  postUri: string,
  labels: string[]
): Promise<string[]>
```

### Annotations

```typescript
// Create annotation post
const postUri = await pubkyAPISDK.createAnnotationPost(
  url: string,
  selectedText: string,
  comment: string,
  metadata: {
    startPath: string;
    endPath: string;
    startOffset: number;
    endOffset: number;
  }
): Promise<string>

// Search annotations by URL
const annotations = await pubkyAPISDK.searchAnnotationsByUrl(
  url: string,
  viewerId?: string
): Promise<NexusPost[]>
```

### File Operations

```typescript
// Upload file to homeserver
const path = await pubkyAPISDK.uploadFile(
  path: string,
  content: string,
  contentType?: string
): Promise<string>

// Get file content
const content = await pubkyAPISDK.getFile(
  pubky: string,
  path: string
): Promise<string>

// Delete file
await pubkyAPISDK.deleteFile(path: string): Promise<void>
```

---

## Nexus Client API

Client for querying the Nexus indexing service.

```typescript
import { nexusClient, NexusPost, NexusUser } from './utils/nexus-client';
```

### Posts

```typescript
// Get specific post
const post = await nexusClient.getPost(
  authorId: string,
  postId: string,
  viewerId?: string
): Promise<NexusPost>

// Stream posts with filters
const { data, cursor } = await nexusClient.streamPosts({
  source?: 'all' | 'following' | 'followers' | 'friends' | 'bookmarks' | 'author';
  viewer_id?: string;
  observer_id?: string;
  author_id?: string;
  tags?: string;
  kind?: string;
  limit?: number;
  skip?: number;
}): Promise<{ data: NexusPost[]; cursor?: string }>

// Search posts by tag
const posts = await nexusClient.searchPostsByTag(
  tag: string,
  options?: {
    observer_id?: string;
    sorting?: 'latest' | 'oldest';
    limit?: number;
  }
): Promise<NexusPost[]>
```

### Users

```typescript
// Get user profile
const user = await nexusClient.getUser(
  userId: string,
  viewerId?: string,
  depth?: number
): Promise<NexusUser>
```

---

## Logger API

Debug logging with persistence.

```typescript
import { logger, LogLevel } from './utils/logger';

// Log at different levels
logger.debug(context: string, message: string, data?: any)
logger.info(context: string, message: string, data?: any)
logger.warn(context: string, message: string, data?: any)
logger.error(context: string, message: string, error?: Error, data?: any)

// Get all logs
const logs = await logger.getLogs(): Promise<LogEntry[]>

// Export logs as JSON
const json = await logger.exportLogs(): Promise<string>

// Clear logs
await logger.clearLogs(): Promise<void>
```

---

## Tag Colors API

Consistent tag coloring.

```typescript
import { getTagColor, getTagStyle } from './utils/tag-colors';

// Get color for tag
const color = getTagColor(tag: string): string
// Returns hex color like "#DC2626"

// Get style object for React
const style = getTagStyle(tag: string): { backgroundColor: string; color: string }
// Returns { backgroundColor: "#DC2626", color: "#FFFFFF" }
```

---

## Chrome Extension APIs Used

### Storage

```typescript
chrome.storage.local.get(keys)
chrome.storage.local.set(data)
chrome.storage.local.remove(keys)
```

### Tabs

```typescript
chrome.tabs.query({ active: true, currentWindow: true })
chrome.tabs.sendMessage(tabId, message)
```

### Runtime

```typescript
chrome.runtime.sendMessage(message)
chrome.runtime.onMessage.addListener(handler)
chrome.runtime.getURL(path)
```

### Side Panel

```typescript
chrome.sidePanel.open({ tabId })
chrome.sidePanel.setOptions({ path, enabled })
```

### Commands

```typescript
chrome.commands.onCommand.addListener(handler)
```

---

## Type Definitions

### Session

```typescript
interface Session {
  pubky: string;
  homeserver: string;
  sessionId: string;
  capabilities: string[];
  timestamp: number;
}
```

### StoredBookmark

```typescript
interface StoredBookmark {
  url: string;
  title: string;
  timestamp: number;
  pubkyUrl?: string;
  bookmarkId?: string;
  postUri?: string;
}
```

### NexusPost

```typescript
interface NexusPost {
  details: {
    id: string;
    author: string;
    content: string;
    kind: string;
    uri: string;
    indexed_at: number;
    attachments?: string[];
  };
  author?: {
    id: string;
    name?: string;
    image?: string;
  };
  tags?: Array<{
    label: string;
    taggers: string[];
  }>;
}
```

### ProfileData

```typescript
interface ProfileData {
  name: string;
  bio?: string;
  image?: string;
  status?: string;
  links?: Array<{
    title: string;
    url: string;
  }>;
}
```

### Drawing

```typescript
interface Drawing {
  id: string;
  url: string;
  canvasData: string;  // Base64 PNG
  timestamp: number;
  author: string;
  pubkyUrl?: string;
}
```

---

## See Also

- [Architecture](ARCHITECTURE.md)
- [Testing](TESTING.md)
- [UTF-16 Encoding](UTF16_HASH_ENCODING.md)

