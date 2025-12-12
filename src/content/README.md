# Content Scripts

Content scripts run in the context of web pages, enabling drawing, annotations, and Pubky URL handling.

## File

- `content.ts` - Main content script

## Components

### DrawingManager

Handles the drawing canvas overlay:

- Creates fixed-position canvas over page
- Renders drawing toolbar (colors, thickness, clear, save)
- Captures mouse events for stroke drawing
- Serializes canvas to base64 PNG
- Communicates with background for storage

**Activation:** `Alt+D` or via popup button

### AnnotationManager

Handles text selection and highlighting:

- Detects text selection
- Shows "Add Annotation" button
- Creates annotation modal
- Renders persistent highlights
- Handles highlight click navigation

**Flow:**
1. User selects text → "Add Annotation" button appears
2. User clicks button → Modal opens
3. User writes comment → Annotation created
4. Highlight rendered → Persists across page loads

### Pubky URL Linkifier

Converts `pubky://` and `pk://` URLs to clickable buttons:

- Scans page for Pubky URLs
- Wraps in styled button elements
- Opens profile renderer on click
- Observes DOM for dynamic content (SPAs)

## Initialization

```typescript
// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // Initialize managers
  annotationManager = new AnnotationManager();
  drawingManager = new DrawingManager();
  
  // Start Pubky URL linkification
  linkifyPubkyURLs();
  observeDOMForPubkyURLs();
}
```

## Message Handling

Listens for messages from background/popup:

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_DRAWING_MODE':
      drawingManager.toggle();
      break;
    case 'HIGHLIGHT_ANNOTATION':
      annotationManager.highlightById(message.annotationId);
      break;
  }
});
```

## Styling

Uses inline styles to avoid CSS conflicts with page styles:

```typescript
const button = document.createElement('button');
button.style.cssText = `
  position: fixed;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  ...
`;
```

## DOM Traversal

Uses TreeWalker for efficient text node traversal:

```typescript
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  {
    acceptNode: (node) => {
      // Skip script/style nodes
      if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  }
);
```

## Security

**XSS Prevention:**
All HTML content is sanitized with DOMPurify before being inserted into the DOM:

```typescript
import DOMPurify from 'dompurify';

// Sanitize before innerHTML
button.innerHTML = DOMPurify.sanitize(htmlContent);
```

This applies even to static templates as a defense-in-depth measure.

## Memory Management

**MutationObserver Cleanup:**
The PubkyURLHandler properly manages its MutationObserver:

```typescript
class PubkyURLHandler {
  private domObserver: MutationObserver | null = null;
  
  cleanup(): void {
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
  }
}
```

This prevents memory leaks on long-running pages.

## Performance

- TreeWalker for efficient DOM traversal
- Debounced DOM observation (500ms)
- Lazy initialization of managers
- Efficient text node filtering

## See Also

- [Drawing Feature](../../FEATURES.md#drawing-mode)
- [Annotation Feature](../../FEATURES.md#text-annotations)
- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitization library
- [Main README](../../README.md) - Getting started guide

