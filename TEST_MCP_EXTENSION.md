# Testing Extension with chrome-devtools-mcp

## Current Configuration

The MCP config at `~/.cursor/mcp.json` should be:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--chromeArg=--load-extension=/tmp/graphiti-test",
        "--chromeArg=--disable-extensions-except=/tmp/graphiti-test"
      ]
    }
  }
}
```

## Verification Steps

1. **Check MCP is running:**
   - Cursor should show MCP server status
   - Tools should be available (navigate_page, evaluate_script, etc.)

2. **Check extension loads:**
   - Navigate to `chrome://extensions-internals/`
   - Look for "Graphiti" in the extension list
   - Check if extension ID is present

3. **Test content script:**
   - Navigate to `https://example.com`
   - Check `window.__graphitiContentScriptLoaded`
   - Select text and verify button appears

## Troubleshooting

If extension doesn't load:
- Check `/tmp/graphiti-test` exists and has all files
- Verify manifest.json is valid
- Check Chrome console for errors
- Try loading manually in chrome://extensions/

If MCP tools not available:
- Restart Cursor completely
- Check MCP server logs
- Verify npx can run chrome-devtools-mcp
