# Graphiti Architecture

This document describes the system architecture of the Graphiti Chrome Extension.

## Overview

Graphiti is a Chrome Extension built on Manifest V3 that enables users to interact with web pages through drawing, annotations, bookmarks, and tags, all synchronized via the Pubky decentralized network.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │     Popup        │  │    Side Panel    │  │  Profile Page    │   │
│  │                  │  │                  │  │                  │   │
│  │  - Auth UI       │  │  - Feed viewer   │  │  - Profile       │   │
│  │  - Quick actions │  │  - Post list     │  │    rendering     │   │
│  │  - Profile edit  │  │  - Annotations   │  │                  │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘   │
│           │                     │                                    │
│           └─────────┬───────────┘                                    │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Background Script                          │   │
│  │                  (Service Worker)                             │   │
│  │                                                               │   │
│  │   - Message routing                                           │   │
│  │   - Keyboard shortcuts                                        │   │
│  │   - Side panel control                                        │   │
│  │   - Storage coordination                                      │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
│                               │                                      │
│           ┌───────────────────┼───────────────────┐                  │
│           ▼                   ▼                   ▼                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │  Content       │  │  Content       │  │  Content       │         │
│  │  Script        │  │  Script        │  │  Script        │         │
│  │  (Tab 1)       │  │  (Tab 2)       │  │  (Tab N)       │         │
│  │                │  │                │  │                │         │
│  │  - Drawing     │  │  - Drawing     │  │  - Drawing     │         │
│  │  - Annotations │  │  - Annotations │  │  - Annotations │         │
│  │  - URL links   │  │  - URL links   │  │  - URL links   │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
        ┌───────────────────────────────────────────────┐
        │                External Services               │
        │                                               │
        │  ┌─────────────────┐  ┌─────────────────┐    │
        │  │  Nexus API      │  │  Pubky          │    │
        │  │                 │  │  Homeserver     │    │
        │  │  - Post search  │  │                 │    │
        │  │  - User lookup  │  │  - Data storage │    │
        │  │  - Social graph │  │  - Auth         │    │
        │  └─────────────────┘  └─────────────────┘    │
        │                                               │
        └───────────────────────────────────────────────┘
```

## Component Details

### Background Script (Service Worker)

**Location:** `src/background/background.ts`

The background script is the central coordinator:

- Handles Chrome extension lifecycle events
- Routes messages between popup, content scripts, and sidepanel
- Manages keyboard shortcuts (Alt+D for drawing, etc.)
- Controls sidepanel opening/closing
- Cannot access `window` or DOM (service worker limitation)

### Content Scripts

**Location:** `src/content/content.ts`

Injected into every web page:

- **DrawingManager**: Canvas overlay for drawing
- **AnnotationManager**: Text selection and highlighting
- **URL Linkifier**: Converts `pubky://` URLs to clickable buttons

### Popup

**Location:** `src/popup/`

Extension popup (400x500px):

- **AuthView**: QR code authentication
- **MainView**: Logged-in interface with quick actions
- **DebugPanel**: Log viewer
- **ProfileEditor**: Profile editing form

### Side Panel

**Location:** `src/sidepanel/`

Feed viewer:

- **PostCard**: Displays posts about current URL
- **AnnotationCard**: Displays annotations
- **EmptyState**: Empty feed message

### Utilities

**Location:** `src/utils/`

Shared modules:

| Module | Responsibility |
|--------|---------------|
| `auth.ts` / `auth-sdk.ts` | Authentication flow |
| `crypto.ts` | Hashing, encoding, tokens |
| `storage.ts` | Chrome storage wrapper |
| `pubky-api-sdk.ts` | Homeserver operations |
| `nexus-client.ts` | Nexus API queries |
| `logger.ts` | Debug logging |

## Data Flow

### Authentication Flow

```
1. User clicks "Sign In"
2. Popup generates client secret
3. Popup creates pubkyauth:// URL with QR code
4. User scans with Pubky Ring mobile app
5. Mobile app sends encrypted token to relay
6. Popup polls relay, receives token
7. Popup decrypts token, extracts credentials
8. Session stored in chrome.storage.local
```

### Bookmark Flow

```
1. User clicks bookmark button
2. Popup sends CREATE_BOOKMARK to background
3. Background/Popup creates Link Post on homeserver
4. Background/Popup creates Bookmark referencing post
5. Both indexed by Nexus
6. Local storage updated
```

### Drawing Flow

```
1. User presses Alt+D
2. Background sends TOGGLE_DRAWING to content script
3. Content script shows canvas overlay
4. User draws
5. User saves (Save & Exit or Alt+D)
6. Content script sends drawing data to background
7. Background saves to chrome.storage.local
8. Optional: Sync to homeserver
```

### Feed Loading Flow

```
1. Sidepanel opens
2. Gets current tab URL
3. Generates URL hash tag
4. Queries Nexus API for posts with tag
5. Renders PostCard for each result
6. Also fetches annotations
```

## Storage Architecture

### Local Storage (chrome.storage.local)

| Key | Data Type | Purpose |
|-----|-----------|---------|
| `session` | Session | Current auth session |
| `bookmarks` | StoredBookmark[] | Local bookmarks |
| `tags` | StoredTag[] | Local tags |
| `profile` | ProfileData | Local profile |
| `pubky_drawings` | {[url]: Drawing} | Drawings by URL |
| `pubky_annotations` | Annotation[] | Local annotations |
| `debugLogs` | LogEntry[] | Debug logs |

### Homeserver Storage (Pubky)

| Path | Data Type | Purpose |
|------|-----------|---------|
| `/pub/pubky.app/profile.json` | ProfileData | User profile |
| `/pub/pubky.app/posts/{id}` | Post | Social posts |
| `/pub/pubky.app/bookmarks/{id}` | Bookmark | Bookmarks |
| `/pub/pubky.app/tags/{id}` | Tag | Tags |
| `/pub/graphiti.dev/drawings/{hash}` | Drawing | Drawings |

## Message Protocol

Communication between components uses Chrome messaging:

```typescript
// Send message
chrome.runtime.sendMessage({
  type: 'MESSAGE_TYPE',
  data: { ... }
});

// Handle in background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MESSAGE_TYPE') {
    // Handle
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async
});
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `OPEN_SIDE_PANEL` | Popup → Background | Open sidepanel |
| `TOGGLE_DRAWING_MODE` | Background → Content | Toggle drawing |
| `SAVE_DRAWING` | Content → Background | Save drawing |
| `GET_DRAWING` | Content → Background | Load drawing |
| `CREATE_ANNOTATION` | Content → Background | Create annotation |
| `GET_ANNOTATIONS` | Background → Content | Load annotations |
| `HIGHLIGHT_ANNOTATION` | Sidepanel → Content | Highlight text |

## Build System

Built with Vite:

```
src/                    →    dist/
├── background/         →    ├── background.js
├── content/            →    ├── content.js
├── popup/              →    ├── popup.html
│   └── main.tsx        →    └── assets/popup-*.js
├── sidepanel/          →    ├── sidepanel.html
│   └── main.tsx        →    └── assets/sidepanel-*.js
└── utils/              →    └── assets/*.js (shared chunks)
```

## Security Considerations

1. **Auth tokens** encrypted with client secret
2. **URLs hashed** for privacy in tags
3. **Service worker isolation** prevents DOM access
4. **Content Security Policy** in manifest
5. **Local-first storage** - data stays local unless synced

## See Also

- [FEATURES.md](../FEATURES.md) - Feature documentation
- [Testing Documentation](TESTING.md)
- [UTF-16 Encoding](UTF16_HASH_ENCODING.md)

