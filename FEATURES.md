# Graphiti Features

Complete documentation of Graphiti extension features.

## Table of Contents

- [Authentication](#authentication)
- [Drawing Mode](#drawing-mode)
- [Text Annotations](#text-annotations)
- [Bookmarks & Tags](#bookmarks--tags)
- [Social Feed](#social-feed)
- [Profile System](#profile-system)
- [Debug Tools](#debug-tools)
- [Technical Architecture](#technical-architecture)

---

## Authentication

### Pubky Ring QR-Code Authentication

Secure authentication using the Pubky Ring mobile app.

**Flow:**
1. Click "Sign In with Pubky Ring" to generate QR code
2. Scan with Pubky Ring mobile app
3. Authentication token is encrypted and transmitted via relay
4. Session is established with your homeserver

**Technical Details:**
- 32-byte cryptographic client secret
- SHA-256 channel ID generation
- `pubkyauth://` URL scheme with relay and capabilities
- 2-second polling interval
- XOR-encrypted token transmission
- Session stored locally with capabilities

---

## Drawing Mode

Draw graffiti directly on any webpage with a persistent canvas overlay.

### How to Use

1. **Activate**: Press `Alt+D` or click the Drawing button in popup
2. **Draw**: Click and drag to create strokes
3. **Customize**: Choose colors and brush thickness in toolbar
4. **Save**: Click "Save & Exit" or press `Alt+D` again

### Features

- **8-color palette**: Red, Cyan, Blue, Orange, Mint, Yellow, Purple, White
- **Adjustable brush**: 2-20px thickness
- **Persistent storage**: Drawings save per URL
- **Pubky sync**: Automatic backup to homeserver at `/pub/graphiti.dev/drawings/`

### Data Storage

```typescript
interface Drawing {
  id: string;           // Unique identifier
  url: string;          // Page URL
  canvasData: string;   // Base64 PNG image
  timestamp: number;    // Creation time
  author: string;       // Pubky ID
  pubkyUrl?: string;    // Homeserver URL after sync
}
```

### Known Limitations

- Drawings are viewport-dependent
- Scrolling disabled during drawing
- Complex SPAs may affect positioning

---

## Text Annotations

Highlight text on webpages and add comments shared as Pubky posts.

### How to Use

1. **Select text** on any webpage
2. **Click "Add Annotation"** button that appears
3. **Write your comment** in the modal
4. **Click "Post Annotation"**

Annotations are visible to all users with the extension!

### Features

- **Persistent highlights**: Yellow background, clickable
- **Network-wide visibility**: Shared via Pubky posts
- **Sidebar integration**: View all annotations for current page
- **Click-to-navigate**: Click annotation card to scroll to highlight

### Architecture

Annotations use a two-phase sync strategy:

1. **Phase 1**: Immediate local save (instant highlight)
2. **Phase 2**: Background sync to Pubky homeserver

This ensures annotations work even if the network is slow.

### Data Structure

```typescript
interface Annotation {
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  startPath: string;     // DOM XPath
  endPath: string;
  startOffset: number;
  endOffset: number;
  timestamp: number;
  author: string;
  postUri?: string;
  color: string;
}
```

### Pubky Integration

Annotations are stored as posts with:
- **Kind**: `short`
- **Content**: JSON with annotation data
- **Tags**: URL hash tag + `pubky:annotation`

---

## Bookmarks & Tags

### Bookmarks

One-click bookmarking with Pubky integration.

**How it works:**
1. Click bookmark button in popup
2. Extension creates a **Link Post** with the URL
3. Extension creates a **Bookmark** pointing to that post
4. Both are indexed by Nexus

**Important Architecture Note:**

Pubky bookmarks must point to **posts**, not external URLs:

```
HTTP URL (https://example.com)
    ↓
Link Post (pubky://.../posts/ABC)  ← Indexed by Nexus
    ↓
Bookmark (pubky://.../bookmarks/XYZ) → references Post
    ↓
Visible in Pubky App ✅
```

### Tags

Add custom tags to any URL.

**Features:**
- Multi-tag support (comma or space separated)
- Auto-normalize: lowercase, trimmed, max 20 chars
- Stored on homeserver with Pubky App schema
- Automatic URL hash tag for discovery

### URL Hash Tags

Every post automatically gets a deterministic hash tag based on the URL. This enables:
- Fast querying via Nexus
- Finding posts about the same URL
- Privacy-preserving (hash doesn't reveal URL)

See [UTF-16 Hash Encoding](docs/UTF16_HASH_ENCODING.md) for technical details.

---

## Social Feed

View what your network is sharing about the current page.

### Features

- **Context-aware**: Shows posts about current URL
- **Social graph**: Posts from users you follow
- **Real-time refresh**: Pull to refresh
- **Rich display**: Author avatars, timestamps, post types
- **Tab navigation**: Switch between Posts and Annotations

### Feed Sources

The sidebar queries Nexus using the URL hash tag:

```typescript
// Generate hash for current page
const urlHashTag = await generateUrlHashTag(currentUrl);

// Query Nexus
const posts = await nexusClient.streamPosts({
  tags: urlHashTag,
  viewer_id: session.pubky,
  limit: 50
});
```

---

## Profile System

### Profile Editor

Edit your Pubky profile directly from the extension.

**Features:**
- **Live data loading**: Fetches current profile from homeserver
- **Emoji picker**: 200+ emojis for status
- **Link management**: Add social links
- **Avatar support**: Set profile image URL

**Profile Fields:**
- Name
- Bio
- Avatar URL
- Status (emoji + text)
- Links (title + URL pairs)

### Pubky URL Rendering

`pubky://` and `pk://` URLs on web pages are automatically converted to clickable buttons.

**Features:**
- Beautiful purple gradient buttons
- Works on dynamic content (SPAs)
- Opens profile renderer on click

---

## Debug Tools

### Debug Panel

Access via the 🔧 button in popup.

**Features:**
- Real-time log viewer
- Filter by level (DEBUG, INFO, WARN, ERROR)
- Context-based filtering
- Export logs as JSON
- Clear all logs

### Log Contexts

- `Auth` - Authentication flow
- `Storage` - Data persistence
- `PubkyAPI` / `PubkyAPISDK` - API operations
- `Crypto` - Cryptographic operations
- `DrawingManager` - Drawing feature
- `AnnotationManager` - Annotation feature
- `Background` - Service worker
- `SidePanel` - Feed operations

### Log Retention

- 1000 logs in memory buffer
- Persisted to Chrome storage
- Survives extension reload

---

## Technical Architecture

### Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Vitest** - Testing
- **Chrome Extension Manifest V3**

### Extension Components

| Component | File | Purpose |
|-----------|------|---------|
| Background | `src/background/background.ts` | Service worker, message handling |
| Content | `src/content/content.ts` | Page injection, drawing, annotations |
| Popup | `src/popup/` | Main UI, auth, quick actions |
| Sidepanel | `src/sidepanel/` | Feed viewer, annotation browser |
| Profile | `src/profile/` | Profile rendering |

### Utility Modules

| Module | Purpose |
|--------|---------|
| `auth.ts` / `auth-sdk.ts` | Authentication |
| `crypto.ts` | Cryptographic functions, URL hashing |
| `storage.ts` | Local storage wrapper |
| `pubky-api-sdk.ts` | Homeserver operations |
| `nexus-client.ts` | Nexus API queries |
| `annotations.ts` | Annotation management |
| `drawing-sync.ts` | Drawing synchronization |
| `logger.ts` | Debug logging |

### Data Storage Locations

| Data Type | Local Storage | Homeserver Path |
|-----------|---------------|-----------------|
| Session | `session` | - |
| Bookmarks | `bookmarks` | `/pub/pubky.app/bookmarks/` |
| Tags | `tags` | `/pub/pubky.app/tags/` |
| Posts | - | `/pub/pubky.app/posts/` |
| Drawings | `pubky_drawings` | `/pub/graphiti.dev/drawings/` |
| Annotations | `pubky_annotations` | As posts with special tags |
| Profile | `profile` | `/pub/pubky.app/profile.json` |
| Logs | `debugLogs` | - |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+P` | Open popup |
| `Alt+D` | Toggle drawing mode |
| `Alt+S` | Toggle sidebar |
| `Alt+A` | Open annotations |

*On Mac, use `Option` instead of `Alt`*

---

## Performance

### Bundle Sizes

- `background.js`: ~1.4 KB
- `popup`: ~21 KB + shared chunks
- `sidepanel`: ~12 KB + shared chunks
- Shared (React): ~233 KB

### Optimizations

- Code splitting for popup/sidepanel
- Lazy loading of components
- Debounced DOM observers
- Indexed local storage lookups
- Background sync for network operations

---

## Privacy & Security

- **Client-side encryption** for auth tokens
- **Local-first** data storage
- **No third-party tracking**
- **URL hashing** for privacy
- **Your keys, your data** via Pubky

All data syncs to your personal Pubky homeserver - no central servers.
