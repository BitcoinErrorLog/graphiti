# Fix: "Cannot use import statement outside a module" Error

## The Problem
Chrome is showing: `Uncaught SyntaxError: Cannot use import statement outside a module` in `content.js:2`

This means Chrome is loading an **old cached version** of the extension.

## Solution

### 1. Rebuild the Extension
The extension has been rebuilt. Now you need to reload it in Chrome.

### 2. Reload Extension in Chrome

1. Open `chrome://extensions/`
2. Find "Graphiti - Pubky URL Tagger"
3. Click the **reload icon** (circular arrow) on the extension card
4. OR toggle the extension OFF and then ON again

### 3. Reload the Web Page
- Go to any webpage (e.g., example.com)
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) to hard refresh
- This clears the page cache and forces Chrome to load the new content script

### 4. Verify It's Fixed

Open DevTools Console (F12) and check:
```javascript
// Should return true
window.__graphitiContentScriptLoaded

// Should NOT show any import errors
// Should show: [Graphiti] [INFO] ContentScript: Bootstrapping managers
```

### 5. Test Annotations

1. Make sure "Annotations" toggle is ON in the extension popup
2. Select text on the page
3. Annotation button should appear

## Why This Happens

Chrome caches extension files. When you rebuild locally, Chrome doesn't automatically know to reload the new files. You must manually reload the extension.
