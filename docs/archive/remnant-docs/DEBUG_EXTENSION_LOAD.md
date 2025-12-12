# Debugging Extension Load Issue

## Problem
Extension says it's loaded but doesn't appear in chrome://extensions/ and content script doesn't run.

## Possible Causes

1. **Different Chrome Profile**: chrome-devtools-mcp might be using a different user data directory than your regular Chrome
2. **Extension Failed to Load**: Extension loaded but immediately failed due to an error
3. **Manifest Error**: There's a subtle error in manifest.json preventing load
4. **File Permissions**: Extension files might not be readable

## Verification Steps

### Check Extension Files
```bash
ls -la /Users/john/graphiti-extension/
# Should show: manifest.json, content.js, background.js, icons/
```

### Check Manifest
```bash
cat /Users/john/graphiti-extension/manifest.json | python3 -m json.tool
# Should be valid JSON
```

### Manual Test
1. Open Chrome (regular, not MCP-controlled)
2. Go to chrome://extensions/
3. Enable Developer mode
4. Click "Load unpacked"
5. Select `/Users/john/graphiti-extension`
6. Check if it appears and if there are any error messages

### Check for Errors
- Look for red error badges on extension card
- Click "Errors" button if visible
- Check browser console for extension errors

## Next Steps

If extension loads in regular Chrome but not MCP Chrome:
- MCP Chrome uses a different profile
- Need to load extension in MCP's Chrome window specifically

If extension doesn't load in either:
- Check manifest.json for errors
- Verify all files are present
- Check file permissions
