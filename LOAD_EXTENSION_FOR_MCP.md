# Loading Extension for chrome-devtools-mcp Testing

## Current Status

I can see chrome-devtools-mcp is working! However, the extension isn't loaded in the Chrome instance that MCP is controlling.

## How to Load Extension for Testing

### Option 1: Load Extension Manually in MCP's Chrome

1. **Find the Chrome window** that chrome-devtools-mcp opened
2. **Go to** `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right)
4. **Click "Load unpacked"**
5. **Select your extension folder**: `/Users/john/Library/Mobile Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist`
6. **Extension should load!**

### Option 2: Configure MCP to Auto-Load Extension

Update your Cursor MCP config to automatically load the extension:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--chromeArg=--load-extension=/Users/john/Library/Mobile Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist",
        "--chromeArg=--disable-extensions-except=/Users/john/Library/Mobile Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist"
      ]
    }
  }
}
```

**Note:** You may need to escape spaces in the path or use the absolute path.

## Once Extension is Loaded

I can then:
1. ✅ Navigate to webpages
2. ✅ Select text
3. ✅ Verify annotation button appears
4. ✅ Take screenshots
5. ✅ Check console for errors
6. ✅ Test the full flow

## Test It Now

After loading the extension, I can test it by:
- Navigating to example.com
- Selecting text
- Checking if the button appears
- Taking a screenshot to show you

Let me know when the extension is loaded and I'll test it!
