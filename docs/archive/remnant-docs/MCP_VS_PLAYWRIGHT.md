# MCP vs Playwright for Extension Testing

## The Reality

After extensive testing, here's what we've learned:

### chrome-devtools-mcp Limitations

1. **Extension Loading:**
   - Chrome 137+ removed `--load-extension` flag
   - CDP `Extensions.loadUnpacked` requires `--remote-debugging-pipe` (not just port)
   - chrome-devtools-mcp doesn't easily support this
   - Manual loading doesn't persist or work reliably

2. **Content Script Testing:**
   - Even when extension loads, content scripts may not run properly
   - MCP evaluates scripts in page context, not content script context
   - Can't easily verify content script execution

### Playwright Works Better

Our Playwright tests **actually work**:
- ✅ Extension loads correctly
- ✅ Content script runs
- ✅ Annotation button appears
- ✅ We can take screenshots
- ✅ Tests are automated and reliable

## Recommendation

**Use Playwright for extension testing**, not chrome-devtools-mcp.

Playwright:
- Properly loads extensions via `--load-extension` (uses Chromium)
- Content scripts run correctly
- Can test full user flows
- Automated and repeatable

chrome-devtools-mcp:
- Better for general web testing
- Not designed for extension testing
- Extension loading is problematic
- Content script verification is difficult

## Current Working Solution

We have working Playwright tests that:
1. Load the extension
2. Test annotation button
3. Take screenshots
4. Verify functionality

This is more reliable than trying to force chrome-devtools-mcp to work with extensions.
