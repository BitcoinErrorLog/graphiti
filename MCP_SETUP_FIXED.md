# Fixed MCP Configuration for Extension Testing

## The Problem

Chrome 137+ **removed the `--load-extension` flag** for security reasons. This is why the extension wasn't loading automatically.

## Solution Options

### Option 1: Use Chrome Canary (Recommended)

Chrome Canary still supports `--load-extension`. Updated config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=canary",
        "--chromeArg=--load-extension=/tmp/graphiti-test",
        "--chromeArg=--disable-extensions-except=/tmp/graphiti-test"
      ]
    }
  }
}
```

**After updating:**
1. Restart Cursor
2. Extension should auto-load in Chrome Canary
3. I can then test it

### Option 2: Use CDP Extensions.loadUnpacked

If Canary doesn't work, we can load the extension programmatically via Chrome DevTools Protocol after Chrome starts.

### Option 3: Manual Load (Current Workaround)

1. Let chrome-devtools-mcp start Chrome
2. Manually go to `chrome://extensions/` in that Chrome window
3. Load `/tmp/graphiti-test`
4. Then I can test it

## Current Status

- ✅ Config updated to use Chrome Canary
- ✅ Extension files ready at `/tmp/graphiti-test`
- ⏳ Waiting for Cursor restart to test

## Next Steps

After restart, I'll:
1. Check if extension loads automatically
2. Navigate to test page
3. Select text and verify annotation button
4. Take screenshot showing it works
