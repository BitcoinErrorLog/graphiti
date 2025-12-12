# Cursor MCP Configuration for chrome-devtools-mcp

## Where to Find the Config

In Cursor, the MCP configuration is typically in one of these locations:

1. **Cursor Settings → MCP** (GUI)
2. **Config file**: Usually at `~/.cursor/mcp.json` or in your workspace settings

## How to Add the Extension Auto-Load

### Method 1: Via Cursor Settings GUI

1. Open **Cursor Settings** (Cmd+, or Ctrl+,)
2. Search for "MCP" or go to **MCP** section
3. Find your `chrome-devtools` server configuration
4. Edit the `args` array to add the extension loading arguments

### Method 2: Edit Config File Directly

The config should look like this:

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

**Important:** The path has spaces, so you might need to:
- Use quotes around the path
- Or escape spaces
- Or use a shorter path with a symlink

### Method 3: Use Absolute Path with Quotes

If spaces cause issues, try:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--chromeArg=--load-extension=/Users/john/Library/Mobile\\ Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist",
        "--chromeArg=--disable-extensions-except=/Users/john/Library/Mobile\\ Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist"
      ]
    }
  }
}
```

### Method 4: Create a Symlink (Easier Path)

Create a symlink without spaces:

```bash
ln -s "/Users/john/Library/Mobile Documents/com~apple~CloudDocs/vibes/graphiti-standalone/dist" ~/graphiti-extension
```

Then use:
```json
"--chromeArg=--load-extension=$HOME/graphiti-extension"
```

## After Updating Config

1. **Restart Cursor** (or reload MCP servers)
2. The extension should auto-load when chrome-devtools-mcp starts
3. I can then test it immediately!

## Alternative: Load Manually

If config editing is tricky, you can also:
1. Let chrome-devtools-mcp start Chrome
2. Manually go to `chrome://extensions/` in that Chrome window
3. Load the extension from there
4. Then I can test it

Let me know which method you prefer!
