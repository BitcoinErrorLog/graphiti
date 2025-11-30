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

## Service Worker Limitations

**Important:** Service workers don't have access to `window` or DOM APIs.

For operations requiring these (like Pubky SDK initialization), use:
1. Graceful error handling
2. Fallback to content script or popup context
3. Two-phase sync (local first, network later)

## See Also

- [Manifest](../../manifest.json) - Command definitions
- [Content Script](../content/README.md) - Page-injected code

