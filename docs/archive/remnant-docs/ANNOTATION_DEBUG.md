# Annotation Feature Debug Guide

## How Annotations Should Work

1. **Select text** on any webpage
2. A purple **"Add Annotation"** button should appear near your selection
3. Click the button to open the annotation modal
4. Enter your comment and submit

## Troubleshooting

### Check if Content Script is Loaded

1. Open any webpage
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Type: `window.__graphitiContentScriptLoaded`
5. Should return `true` if loaded

### Check if Annotations are Enabled

1. Open extension popup
2. Look for "Annotations" toggle switch
3. Make sure it's ON (enabled)

Or in console:
```javascript
chrome.storage.local.get('annotationsEnabled', (result) => {
  console.log('Annotations enabled:', result.annotationsEnabled !== false);
});
```

### Check Console for Errors

1. Open DevTools Console
2. Look for errors starting with `[Graphiti]`
3. Check for:
   - "Content script loaded" message
   - "Annotation manager initialized" message
   - Any red error messages

### Test Selection

1. Select some text (at least 1 character, max 1000 characters)
2. Check console for:
   - "handleTextSelection called"
   - "Text selected" with length
   - "Showing annotation button"
   - "Annotation button added to DOM"

### Common Issues

**Button doesn't appear:**
- Content script not loaded → Reload extension
- Annotations disabled → Enable in popup
- Text too short/long → Select 1-1000 characters
- Selection collapsed → Make sure you actually selected text

**Button appears but clicking does nothing:**
- Check console for errors
- Try clicking the button directly (not just the text)

### Manual Test

1. Open any webpage (e.g., example.com)
2. Open DevTools Console
3. Select some text
4. You should see debug logs like:
   ```
   [Graphiti] [DEBUG] ContentScript: handleTextSelection called
   [Graphiti] [DEBUG] ContentScript: Text selected {length: 10, preview: "..."}
   [Graphiti] [INFO] ContentScript: Showing annotation button
   [Graphiti] [INFO] ContentScript: Annotation button added to DOM
   ```

### Keyboard Shortcut

Press `Alt+Shift+A` (Mac: `Option+Shift+A`) to toggle annotations on/off.
