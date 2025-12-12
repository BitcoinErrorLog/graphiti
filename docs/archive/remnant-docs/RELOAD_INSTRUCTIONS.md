# How to Reload Extension After Build

## Step 1: Build the Extension
```bash
npm run build
```

## Step 2: Reload in Chrome

1. **Open Chrome Extensions Page:**
   - Go to `chrome://extensions/`
   - OR right-click extension icon → "Manage extension"

2. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in top-right (if not already on)

3. **Reload the Extension:**
   - Find "Graphiti - Pubky URL Tagger" in the list
   - Click the **circular reload icon** (🔄) on the extension card
   - Wait for it to finish reloading

4. **Reload the Webpage:**
   - Go to any webpage you want to test
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux) for hard refresh
   - This clears the page cache and reloads content scripts

## Step 3: Test Annotations

1. Select some text on the page
2. Look for the purple "Add Annotation" button near your selection
3. If it doesn't appear:
   - Open DevTools Console (F12)
   - Check for errors
   - Type: `window.__graphitiContentScriptLoaded` (should be `true`)
   - Check: `chrome.storage.local.get('annotationsEnabled', console.log)`

## Troubleshooting

**Button still doesn't appear:**
- Make sure extension is enabled (toggle should be ON)
- Check console for errors
- Try a different webpage
- Restart Chrome completely

**Extension shows errors:**
- Check `chrome://extensions/` for error messages
- Look at the extension's "Errors" button if available
- Rebuild: `npm run build`
