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

Icon generation tools are available in `docs/archive/`:
- `create-png-icons.js` - Script to create PNG icons
- `generate-icons.html` - HTML-based icon generator

## Design

The icon uses a gradient design with:
- Purple to blue gradient
- Rounded corners
- Modern flat style
- Works well at small sizes

## See Also

- [manifest.json](../manifest.json)

