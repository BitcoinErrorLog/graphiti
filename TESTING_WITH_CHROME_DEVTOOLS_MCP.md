# Testing with Chrome DevTools MCP

## What is chrome-devtools-mcp?

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) is a Model Context Protocol (MCP) server that lets AI assistants control and inspect a live Chrome browser. This allows me to:

1. **Actually test the extension** in a real Chrome browser
2. **See what you see** - take screenshots, check console errors
3. **Debug interactively** - click buttons, select text, verify behavior
4. **Fix issues immediately** - test fixes in real-time

## How It Helps

Instead of just running automated tests, I can:
- Load your extension in Chrome
- Navigate to webpages
- Select text and verify the annotation button appears
- Take screenshots to show you it's working
- Check console for errors
- Test the full user flow

## Setup (for future use)

To enable chrome-devtools-mcp in Cursor:

1. **Add to Cursor MCP settings:**
   - Go to `Cursor Settings` → `MCP` → `New MCP Server`
   - Use this config:
   ```json
   {
     "name": "chrome-devtools",
     "command": "npx",
     "args": ["-y", "chrome-devtools-mcp@latest"]
   }
   ```

2. **To test with extension loaded:**
   - I can use `--chromeArg` to load the extension:
   ```json
   {
     "args": [
       "chrome-devtools-mcp@latest",
       "--chromeArg=--load-extension=/path/to/dist",
       "--chromeArg=--disable-extensions-except=/path/to/dist"
     ]
   }
   ```

## Current Testing Approach

Right now, we're using:
- **Playwright E2E tests** - Automated tests that verify functionality
- **Manual testing** - You test and report issues

With chrome-devtools-mcp, I could:
- Test the extension myself in real Chrome
- Show you screenshots proving it works
- Debug issues interactively
- Verify fixes before asking you to test

## Benefits

1. **Faster debugging** - I can see errors immediately
2. **Visual verification** - Screenshots show exactly what's happening
3. **Real browser testing** - Tests in actual Chrome, not just headless
4. **Interactive debugging** - Click, type, select text just like you would

This would make testing much more reliable and faster!
