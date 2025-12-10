# Debugging Highlights Not Appearing

## What I Changed

1. ✅ **Lime Green Color** - Changed to Pubky's lime green `rgba(163, 230, 53, 0.25)` with 25% opacity
2. ✅ **Better Debugging** - Added detailed console logs to see what's happening
3. ✅ **Alternative Rendering** - Fallback method if standard approach fails

## Steps to Debug

### 1. Reload Everything
```
1. Go to chrome://extensions/
2. Click reload (⟳) on Graphiti extension
3. Go to https://pubky.app/home
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
5. Open Console: F12 or Cmd+Option+I
```

### 2. Check Console for Messages

You should see these messages when the page loads:

```
[Graphiti] [INFO] ContentScript: Initializing annotation manager
[Graphiti] [INFO] ContentScript: Annotation manager initialized
[Graphiti] [INFO] ContentScript: Annotations loaded { count: X }
```

If you see annotations loaded but no highlights, look for:

```
[Graphiti] [DEBUG] ContentScript: Attempting to render highlight
[Graphiti] [INFO] ContentScript: Highlight rendered successfully ✓
```

OR warnings like:

```
[Graphiti] [WARN] ContentScript: Could not find nodes for annotation
```

### 3. Common Issues

**Issue: "Could not find nodes"**
- The page structure changed since you created the annotation
- Solution: Create a new annotation on the current page

**Issue: No console messages at all**
- Content script didn't load
- Solution: Make sure you reloaded the extension AND the page

**Issue: Annotations loaded = 0**
- No annotations exist for this URL
- Solution: Create a new annotation by selecting text

### 4. Create a Fresh Annotation

To test if everything works:

1. **Select some text** on the page (e.g., "Reach" or any word)
2. Click **"Add Annotation"** button
3. Type a comment
4. Click **"Post Annotation"**
5. You should see:
   - Lime green highlight appear immediately (25% opacity)
   - Console log: `[Graphiti] [INFO] ContentScript: Highlight rendered successfully ✓`

### 5. Check Existing Annotations

Your logs show you have 2 local annotations. Let's see if they render:

1. Open Console (F12)
2. Look for messages like:
   ```
   [Graphiti] [INFO] ContentScript: Annotations loaded { count: 2 }
   [Graphiti] [DEBUG] ContentScript: Attempting to render highlight
   ```

If you see warnings about "Could not find nodes", the page structure has changed.

### 6. Manual Check

Try this in the console:

```javascript
// Check if content script loaded
document.querySelector('.pubky-highlight')

// Check if styles injected
[...document.styleSheets].some(s => {
  try { 
    return [...s.cssRules].some(r => r.selectorText === '.pubky-highlight')
  } catch(e) { return false }
})
```

Should return truthy values if everything loaded correctly.

## Expected Appearance

When working, highlights should look like:
- **Background**: Subtle lime green (very light)
- **Border**: Darker lime green underline
- **Opacity**: 25% (very translucent)
- **Hover**: Slightly more visible (35% opacity)
- **Easy to read**: Light text is clearly visible through it

## What to Look For in Console

### ✅ Good:
```
[Graphiti] [INFO] ContentScript: Annotation manager initialized
[Graphiti] [INFO] ContentScript: Annotations loaded { count: 2 }
[Graphiti] [DEBUG] ContentScript: Attempting to render highlight
[Graphiti] [INFO] ContentScript: Highlight rendered successfully ✓
[Graphiti] [INFO] ContentScript: Highlight rendered successfully ✓
```

### ❌ Problem:
```
[Graphiti] [WARN] ContentScript: Could not find nodes for annotation
{ "id": "xxx", "hasStartNode": false, "hasEndNode": false }
```

This means the DOM structure changed. Solution: Create new annotations.

## Quick Test

1. Reload extension
2. Go to: https://pubky.app/home
3. Hard refresh (Cmd+Shift+R)
4. Select the word **"Reach"** in "Reach thousands"
5. Click "Add Annotation"
6. Type: "test"
7. Submit
8. **You should see a light lime green highlight!**

## Still Not Working?

Share the console output (F12) and I'll help debug further. Look for:
- Any errors in red
- The "[Graphiti]" messages
- Whether `Annotations loaded` shows count > 0

