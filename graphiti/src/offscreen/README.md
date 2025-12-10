# Offscreen Document

The offscreen document provides DOM/window context for operations that cannot run in the service worker.

## Purpose

Chrome Extension service workers don't have access to `window` or DOM APIs. The Pubky SDK (`@synonymdev/pubky`) requires these APIs for initialization. The offscreen document solves this by providing a hidden document context where the SDK can run.

## Files

| File | Purpose |
|------|---------|
| `offscreen.html` | HTML shell for the offscreen document |
| `offscreen.ts` | Handles SDK operations and messaging |

## How It Works

1. **Background requests SDK operation** via Chrome messaging
2. **Offscreen bridge** creates offscreen document if not exists
3. **Offscreen handler** initializes Pubky SDK and performs operation
4. **Result returned** to background via message response

## Message Types

| Type | Description |
|------|-------------|
| `SYNC_ANNOTATION` | Sync single annotation to Pubky |
| `SYNC_DRAWING` | Sync single drawing to Pubky |
| `SYNC_ALL_PENDING` | Sync all unsynced content |
| `GET_SYNC_STATUS` | Get counts of pending syncs |

## Message Format

All messages to the offscreen document must include `target: 'offscreen'`:

```typescript
// From background
chrome.runtime.sendMessage({
  target: 'offscreen',
  type: 'SYNC_ANNOTATION',
  data: { url, selectedText, comment, metadata }
});

// Response
{ success: true, data: { postUri: 'pubky://...' } }
// or
{ success: false, error: 'Error message' }
```

## Lifecycle

- **Created on demand** when SDK operation is needed
- **Persists** for 30 seconds of inactivity (Chrome default)
- **Recreated** if closed and operation is needed

## Using the Bridge

The `offscreen-bridge.ts` utility provides a clean API:

```typescript
import { offscreenBridge } from '../utils/offscreen-bridge';

// Check availability
if (offscreenBridge.isAvailable()) {
  // Sync annotation
  const result = await offscreenBridge.syncAnnotation({
    url: 'https://example.com',
    selectedText: 'Hello world',
    comment: 'My annotation',
    metadata: { prefix: '', exact: 'Hello world', suffix: '' }
  });
  
  if (result.success) {
    console.log('Synced:', result.postUri);
  }
}

// Get sync status
const status = await offscreenBridge.getSyncStatus();
console.log('Pending:', status.pendingAnnotations, status.pendingDrawings);

// Sync all pending
const syncResult = await offscreenBridge.syncAllPending();
console.log('Synced:', syncResult.annotationsSynced, syncResult.drawingsSynced);
```

## Chrome Offscreen API

The offscreen API requires:
- `"offscreen"` permission in manifest.json
- `chrome.offscreen.createDocument()` to create the document
- Only ONE offscreen document can exist at a time

See: https://developer.chrome.com/docs/extensions/reference/api/offscreen

## See Also

- [Background Service Worker](../background/README.md)
- [Annotation Sync](../utils/annotation-sync.ts)
- [Drawing Sync](../utils/drawing-sync.ts)

