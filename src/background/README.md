# Background Service Worker

The background script runs as a Chrome Extension service worker, handling extension lifecycle and coordinating between components.

## File

- `background.ts` - Main service worker entry point

## Responsibilities

### Message Handling

Processes messages from popup, content scripts, and sidepanel:

- `OPEN_SIDE_PANEL` - Opens the sidepanel
- `TOGGLE_DRAWING_MODE` - Toggles drawing on current tab
- `SAVE_DRAWING` - Saves drawing data
- `GET_DRAWING` - Retrieves drawing for URL
- `CREATE_ANNOTATION` - Creates new annotation
- `GET_ANNOTATIONS` - Fetches annotations for URL
- `HIGHLIGHT_ANNOTATION` - Highlights annotation on page

### Keyboard Commands

Handles extension shortcuts defined in manifest.json:

- `toggle-drawing` (Alt+D) - Toggle drawing mode
- `_execute_action` (Alt+P) - Open popup

### Side Panel Management

Controls the Chrome side panel:

```typescript
chrome.sidePanel.setOptions({
  tabId: sender.tab?.id,
  path: 'sidepanel.html',
  enabled: true,
});
```

### Extension Lifecycle

- `chrome.runtime.onInstalled` - Initialization on install/update
- Keeps service worker alive for message handling

## Message Protocol

All messages follow this pattern:

```typescript
interface Message {
  type: string;
  [key: string]: any;
}

// Send from content/popup
chrome.runtime.sendMessage({ type: 'MESSAGE_TYPE', data: ... });

// Handle in background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MESSAGE_TYPE') {
    // Handle...
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});
```

## Service Worker Limitations & Offscreen API

**Important:** Service workers don't have access to `window` or DOM APIs.

The Pubky SDK requires `window` for initialization, so we use the **Chrome Offscreen API** to run SDK operations:

### Offscreen Document Architecture

```
┌──────────────────────┐     Messages     ┌──────────────────────┐
│  Background Service  │ ◄──────────────► │  Offscreen Document  │
│      Worker          │                  │   (has DOM access)   │
│                      │                  │                      │
│  - Message routing   │                  │  - Pubky SDK init    │
│  - Storage ops       │                  │  - Annotation sync   │
│  - Local saves       │                  │  - Drawing sync      │
└──────────────────────┘                  └──────────────────────┘
```

### How It Works

1. **Local save first** - Data is saved locally immediately for instant feedback
2. **Offscreen sync** - Background creates offscreen document for SDK operations
3. **Automatic retry** - Periodic alarm retries failed syncs

### Related Files

- `src/offscreen/offscreen.ts` - Offscreen document handler
- `src/offscreen/offscreen.html` - Offscreen HTML shell
- `src/utils/offscreen-bridge.ts` - Bridge for communicating with offscreen

### Sync Status

The popup displays sync status and allows manual sync:
- `src/popup/components/SyncStatus.tsx` - Sync status component

## See Also

- [Manifest](../../manifest.json) - Command definitions
- [Content Script](../content/README.md) - Page-injected code
- [Offscreen API Docs](https://developer.chrome.com/docs/extensions/reference/api/offscreen)

