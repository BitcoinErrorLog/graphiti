# Offscreen Document

The offscreen document provides DOM/window context for Pubky SDK operations that cannot run in the service worker environment.

## Overview

Chrome Extension service workers don't have access to `window` or DOM APIs. The Pubky SDK (`@synonymdev/pubky`) requires these APIs for initialization. The offscreen document solves this by providing a hidden document context where the SDK can run.

## Purpose

The offscreen document enables:
- **Pubky SDK Operations** - Initialize and use the Pubky Client
- **Annotation Syncing** - Sync annotations to homeserver
- **Drawing Syncing** - Sync drawings to homeserver
- **Bulk Operations** - Sync all pending content at once

## Architecture

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

## Files

| File | Purpose |
|------|---------|
| `offscreen.html` | HTML shell for the offscreen document |
| `offscreen.ts` | Handles SDK operations and messaging |

## How It Works

1. **Background requests SDK operation** via Chrome messaging
2. **Offscreen bridge** (`src/utils/offscreen-bridge.ts`) creates offscreen document if not exists
3. **Offscreen handler** initializes Pubky SDK and performs operation
4. **Result returned** to background via message response

## Message Types

All messages to the offscreen document must include `target: 'offscreen'`:

| Type | Description | Request Data | Response |
|------|-------------|--------------|----------|
| `SYNC_ANNOTATION` | Sync single annotation to Pubky | `{ url, selectedText, comment, metadata }` | `{ success: true, data: { postUri } }` |
| `SYNC_DRAWING` | Sync single drawing to Pubky | `{ url, canvasData, timestamp, author }` | `{ success: true, data: { pubkyUrl } }` |
| `SYNC_ALL_PENDING` | Sync all unsynced content | None | `{ success: true, data: { annotationsSynced, drawingsSynced } }` |
| `GET_SYNC_STATUS` | Get counts of pending syncs | None | `{ success: true, data: { pendingAnnotations, pendingDrawings } }` |

## Message Format

```typescript
// Request from background
chrome.runtime.sendMessage({
  target: 'offscreen',
  type: 'SYNC_ANNOTATION',
  data: { 
    url: 'https://example.com',
    selectedText: 'Hello world',
    comment: 'My annotation',
    metadata: { prefix: '', exact: 'Hello world', suffix: '' }
  }
}, (response) => {
  if (response.success) {
    console.log('Synced:', response.data.postUri);
  }
});

// Response
{ 
  success: true, 
  data: { postUri: 'pubky://...' } 
}
// or
{ 
  success: false, 
  error: 'Error message' 
}
```

## Lifecycle

- **Created on demand** when SDK operation is needed
- **Persists** for 30 seconds of inactivity (Chrome default)
- **Recreated** if closed and operation is needed
- **Single instance** - Only one offscreen document can exist at a time

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
    console.log('Synced:', result.data.postUri);
  }
}

// Get sync status
const status = await offscreenBridge.getSyncStatus();
console.log('Pending:', status.pendingAnnotations, status.pendingDrawings);

// Sync all pending
const syncResult = await offscreenBridge.syncAllPending();
console.log('Synced:', syncResult.annotationsSynced, syncResult.drawingsSynced);
```

## Pubky SDK Integration

The offscreen document uses the Pubky Client singleton:

```typescript
import { getPubkyClientAsync } from '../utils/pubky-client-factory';

// Initialize SDK
const client = await getPubkyClientAsync();

// Use SDK
const response = await client.fetch(path, { method: 'PUT', body: data });
```

## Data Storage Paths

Annotations sync to:
```
/pub/pubky.app/posts/<post-id>.json
```

Drawings sync to:
```
/pub/graphiti.dev/drawings/<url-hash>.json
```

## Error Handling

All operations include error handling:
- Try-catch blocks around SDK calls
- Error responses returned to caller
- Logging for debugging
- Graceful degradation

## Chrome Offscreen API

The offscreen API requires:
- `"offscreen"` permission in manifest.json
- `chrome.offscreen.createDocument()` to create the document
- Only ONE offscreen document can exist at a time
- Document closes after 30 seconds of inactivity

**API Reference:**
- [Chrome Offscreen API Docs](https://developer.chrome.com/docs/extensions/reference/api/offscreen)

## Limitations

1. **Single Instance** - Only one offscreen document can exist
2. **Lifecycle** - Document may close after inactivity
3. **No UI** - Document is hidden, no user interaction
4. **Resource Usage** - Uses memory even when idle

## Debugging

To debug the offscreen document:
1. Open `chrome://extensions`
2. Find Graphiti extension
3. Click "Inspect views: offscreen.html"
4. Console will show offscreen document logs

## See Also

- [Background Service Worker](../background/README.md) - Message sender
- [Offscreen Bridge](../utils/offscreen-bridge.ts) - Bridge utility
- [Annotation Sync](../utils/annotation-sync.ts) - Annotation syncing
- [Drawing Sync](../utils/drawing-sync.ts) - Drawing syncing
- [Pubky Client Factory](../utils/pubky-client-factory.ts) - SDK singleton
