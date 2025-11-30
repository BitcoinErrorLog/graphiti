# Drawing Mode Troubleshooting Guide

## Issue: "Could not establish connection. Receiving end does not exist"

This error occurs when the content script hasn't loaded yet or isn't available on the current page.

### Quick Fix - 3 Steps

1. **Reload the extension**:
   - Go to `chrome://extensions`
   - Find "Graphiti - Pubky URL Tagger"
   - Click the refresh/reload icon 🔄

2. **Refresh the webpage**:
   - Go to the webpage where you want to draw
   - Press `Ctrl+R` (or `Cmd+R` on Mac) to refresh
   - Wait for the page to fully load

3. **Try drawing mode**:
   - Press `Alt+D` (or `Option+D` on Mac)
   - OR click the 🎨 button in the popup
   - The drawing canvas should now appear!

### Pages Where Drawing Mode Won't Work

Drawing mode is **NOT available** on:
- `chrome://` pages (Chrome settings, extensions, etc.)
- `about:` pages
- `chrome-extension://` pages (extension internal pages)
- Browser new tab page

**Solution**: Navigate to a regular website (like google.com, github.com, etc.) and try again.

### Verification Steps

To verify the content script is loaded:

1. Open a regular webpage (e.g., https://www.google.com)
2. Press `F12` to open DevTools
3. Go to the **Console** tab
4. Look for these messages:
   ```
   [Graphiti] [INFO] ContentScript: Initializing annotation manager
   [Graphiti] [INFO] DrawingManager: Initializing drawing manager
   [Graphiti] [INFO] DrawingManager: Setting up message listeners
   [Graphiti] [INFO] DrawingManager: Message listeners registered
   ```

If you see these messages, the content script is loaded correctly!

### Testing Drawing Mode

Once the extension is reloaded and the page is refreshed:

1. **Open DevTools** (`F12`) to see logs
2. **Press `Alt+D`** to activate drawing mode
3. **Check console** for:
   ```
   [Graphiti] [INFO] DrawingManager: Toggle drawing mode requested
   [Graphiti] [INFO] DrawingManager: Activating drawing mode
   [Graphiti] [INFO] DrawingManager: Canvas created
   [Graphiti] [INFO] DrawingManager: Toolbar created
   ```

4. **You should see**:
   - A toolbar appear in the top-right corner
   - Your cursor change to a crosshair
   - The page becomes unscrollable (normal while drawing)

5. **Try drawing**:
   - Click and drag on the page
   - You should see colored lines appear
   - Change colors and thickness in the toolbar
   - Click "Save & Exit" when done

### Common Issues & Solutions

#### Issue: Button click does nothing
**Solution**: Refresh the page first, then try again.

#### Issue: Error says "content script may not be ready"
**Solution**: 
1. Close DevTools if open
2. Reload the extension in `chrome://extensions`
3. Refresh the webpage
4. Try again

#### Issue: Keyboard shortcut doesn't work
**Solution**:
1. Make sure you're on a regular webpage (not chrome:// pages)
2. Check that `Alt+D` isn't being used by another extension
3. Try using the popup button instead

#### Issue: Drawing appears but can't draw
**Solution**:
1. Check DevTools console for errors
2. Make sure your mouse is working
3. Try changing the brush thickness
4. Try a different color

#### Issue: Drawing doesn't save
**Solution**:
1. Click "Save & Exit" in the toolbar (don't just close it)
2. Check DevTools for save confirmation:
   ```
   [Graphiti] [INFO] DrawingManager: Drawing saved successfully
   ```
3. If not authenticated, drawing saves locally only

### Debug Mode

To see detailed logs:

1. Open DevTools (`F12`)
2. Go to Console tab
3. Filter by "Graphiti" or "DrawingManager"
4. Try activating drawing mode
5. Share the console output if you need help

### Still Having Issues?

If drawing mode still doesn't work after following these steps:

1. **Check browser console** for specific error messages
2. **Verify you're using Chrome or Edge** (Chromium-based browser)
3. **Make sure you're on a regular HTTP/HTTPS webpage**
4. **Try a simple test page** like https://example.com
5. **Check if other extension features work** (bookmarks, annotations)

### Success Indicators

You'll know drawing mode is working when:
- ✅ Toolbar appears in top-right corner
- ✅ Cursor changes to crosshair
- ✅ You can draw colored lines with mouse
- ✅ Colors and thickness controls work
- ✅ "Save & Exit" saves and removes canvas
- ✅ Drawing reappears when you return to the page

### Test Page

Try drawing mode on this simple test page:
```
https://example.com
```

This is a basic HTML page that should definitely work!

