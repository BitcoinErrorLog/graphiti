# Extension Icons

Icons for the Graphiti Chrome extension.

## Files

- `icon.svg` - Source SVG icon
- `icon16.png` - 16×16 toolbar icon
- `icon48.png` - 48×48 extension management
- `icon128.png` - 128×128 Chrome Web Store
- `icon*.svg` - SVG versions at each size

## Usage in Manifest

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  }
}
```

## Generating Icons

Icons can be regenerated from SVG using:

```bash
node create-png-icons.js
```

Or use the HTML generator:
1. Open `generate-icons.html` in browser
2. Right-click and save each canvas as PNG

## Design

The icon uses a gradient design with:
- Purple to blue gradient
- Rounded corners
- Modern flat style
- Works well at small sizes

## See Also

- [manifest.json](../manifest.json)
- [create-png-icons.js](../create-png-icons.js)

