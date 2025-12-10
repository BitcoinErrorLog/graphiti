# Bookmark Fix - Final Solution

## The Problem

Bookmarks were successfully writing to the homeserver but **NOT appearing in Pubky App** or being indexed by Nexus.

### Root Cause

We were bookmarking **HTTP URLs directly**:
```json
{
  "uri": "https://bsky.app/",
  "created_at": 1761150267211000
}
```

But according to the [official pubky-app-specs example](https://www.npmjs.com/package/pubky-app-specs) and Nexus architecture, **bookmarks must point to Pubky content (posts), not external HTTP URLs**.

## The Correct Pattern

According to the Pubky App specs and the official SDK example:

```javascript
// From node_modules/pubky-app-specs/example.js
let { bookmark, meta } = specsBuilder.createBookmark(
  `pubky://${RIO}/pub/pubky.app/posts/0033SREKPC4N0`  // ← Pubky POST URI!
);
```

### How Social Content Works in Pubky

1. **External HTTP URLs** → Create a **Link Post** (kind: 'link')
2. **Social interactions** (bookmarks, tags) → Reference the **Post URI**, not the HTTP URL
3. **Nexus** → Indexes the social graph (posts, bookmarks of posts, tags of posts)

## The Solution

### Creating a Bookmark

**Before (Wrong):**
```typescript
// Directly bookmark HTTP URL
createBookmark("https://example.com")
// ❌ Nexus can't index this - it's not social content
```

**After (Correct):**
```typescript
// Step 1: Create a link post with the URL
const post = createPost("https://example.com", "link", ...)
// → pubky://user/pub/pubky.app/posts/ABC123

// Step 2: Bookmark the POST (not the URL)
createBookmark("pubky://user/pub/pubky.app/posts/ABC123")
// ✅ Nexus indexes this as social activity
```

### Code Changes

**`src/utils/pubky-api-sdk.ts`:**
```typescript
async createBookmark(url: string): Promise<{ fullPath, bookmarkId, postUri }> {
  // Step 1: Create link post with HTTP URL
  const postResult = builder.createPost(url, PubkyAppPostKind.Link, ...);
  const postUri = postResult.meta.url;
  
  // Write post to homeserver
  await this.pubky.fetch(postUri, {
    method: 'PUT',
    body: JSON.stringify(post),
    credentials: 'include',
  });
  
  // Step 2: Create bookmark pointing to the POST
  const bookmarkResult = builder.createBookmark(postUri);  // ← Post URI!
  
  // Write bookmark to homeserver
  await this.pubky.fetch(bookmarkPath, {
    method: 'PUT',
    body: JSON.stringify(bookmark),
    credentials: 'include',
  });
  
  return { fullPath, bookmarkId, postUri };
}
```

**`src/utils/storage.ts`:**
```typescript
export interface StoredBookmark {
  url: string;         // Original HTTP URL
  title: string;
  timestamp: number;
  pubkyUrl?: string;   // Bookmark path on homeserver
  bookmarkId?: string; // Bookmark ID
  postUri?: string;    // ← NEW: Post URI that bookmark points to
}
```

**`src/popup/App.tsx`:**
```typescript
// Store the post URI with the bookmark
const { fullPath, bookmarkId, postUri } = await pubkyAPISDK.createBookmark(url);
const bookmark = { url, title, pubkyUrl: fullPath, bookmarkId, postUri };
await storage.saveBookmark(bookmark);

// When deleting, use the post URI to find the bookmark
const existingBookmark = await storage.getBookmark(url);
if (existingBookmark.postUri) {
  await pubkyAPISDK.deleteBookmark(existingBookmark.postUri);
}
```

## What Gets Created

When you bookmark `https://bsky.app/`:

### 1. Link Post Created
```
Path: pubky://user/pub/pubky.app/posts/00F7K3Q0Z9X2G
Data: {
  "content": "https://bsky.app/",
  "kind": "link",
  "parent": null,
  "embed": null,
  "attachments": []
}
```

### 2. Bookmark Created (pointing to the post)
```
Path: pubky://user/pub/pubky.app/bookmarks/PCEHTX26BNN
Data: {
  "uri": "pubky://user/pub/pubky.app/posts/00F7K3Q0Z9X2G",  ← Post URI!
  "created_at": 1761150267211000
}
```

## Why This Works

1. ✅ **Post** contains the HTTP URL and appears in Nexus as social content
2. ✅ **Bookmark** references the post, creating a social relationship
3. ✅ **Nexus** indexes both the post and the bookmark relationship
4. ✅ **Pubky App** can display bookmarks from the Nexus API
5. ✅ **Tags** can also reference the same post URI

## Architecture

```
HTTP URL (https://example.com)
    ↓
Link Post (pubky://.../posts/ABC)  ← Indexed by Nexus
    ↓
Bookmark (pubky://.../bookmarks/XYZ) → points to Post  ← Indexed by Nexus
    ↓
Appears in Pubky App ✅
```

## Testing

After reloading the extension:

1. **Bookmark a page** → Check debug logs:
   ```
   ✅ "Creating link post first"
   ✅ "Link post created" { postUri: "pubky://.../posts/..." }
   ✅ "Creating bookmark for post"
   ✅ "Bookmark written to homeserver successfully"
   ```

2. **Check Pubky App** → Bookmark should appear (Nexus indexes it fast)

3. **Remove bookmark** → Both bookmark and post are tracked locally for deletion

## References

- [pubky-app-specs NPM](https://www.npmjs.com/package/pubky-app-specs)
- [Pubky Nexus GitHub](https://github.com/pubky/pubky-nexus)
- [Pubky App GitHub](https://github.com/pubky/pubky-app)
- Official SDK Example: `node_modules/pubky-app-specs/example.js` line 39

## Summary

**The key insight:** Pubky is a **social protocol**. External HTTP URLs become social content by creating **posts** (kind: 'link'). Social interactions (bookmarks, tags) reference these **posts**, not the external URLs. This allows Nexus to build and index the social graph.

Bookmarks now work exactly as designed in the Pubky ecosystem! 🎉



