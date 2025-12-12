# MCP Testing - Manual Extension Load

## Current Situation

Chrome 137+ removed `--load-extension` flag, and CDP `Extensions.loadUnpacked` requires special setup that chrome-devtools-mcp doesn't easily support.

## Working Solution: Manual Load + MCP Testing

1. **Start MCP Chrome:**
   - Restart Cursor (MCP will start Chrome automatically)
   - Chrome window opens via chrome-devtools-mcp

2. **Manually Load Extension:**
   - In the MCP Chrome window, go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `/tmp/graphiti-test`

3. **I Test It:**
   - Once loaded, I can navigate pages
   - Select text
   - Verify annotation button appears
   - Take screenshots

## Why This Works

- MCP tools work for testing (navigate, evaluate, screenshot)
- Extension just needs to be loaded once manually
- After that, I can test everything programmatically

## Quick Test After Load

Once you load it, tell me and I'll:
1. Navigate to example.com
2. Select text
3. Check if button appears
4. Take screenshot showing it works

This is the most reliable approach until chrome-devtools-mcp adds better extension loading support.
