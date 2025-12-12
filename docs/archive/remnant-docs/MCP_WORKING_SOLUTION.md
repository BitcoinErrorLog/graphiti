# Working Solution for MCP Extension Testing

## The Issue

Chrome 137+ **removed `--load-extension` flag**. This is why auto-loading wasn't working.

## Solution: Use CDP Extensions.loadUnpacked

Since `--load-extension` doesn't work, we need to load the extension via Chrome DevTools Protocol after Chrome starts.

## Updated MCP Config

The config at `~/.cursor/mcp.json` is now:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--chromeArg=--remote-debugging-port=9222",
        "--chromeArg=--enable-unsafe-extension-debugging"
      ]
    }
  }
}
```

This starts Chrome with remote debugging enabled, which allows us to load extensions via CDP.

## Loading the Extension

After Chrome starts via MCP, I can use the CDP `Extensions.loadUnpacked` command to load your extension programmatically.

## Next Steps

1. **Restart Cursor** with the new config
2. I'll test if MCP tools are available
3. I'll load the extension via CDP
4. Then test the annotation button

The extension will be loaded at: `/tmp/graphiti-test`
