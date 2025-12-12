# Extension Icons

Icons for the Graphiti Chrome Extension at various sizes required by Chrome.

## Overview

The extension uses a consistent icon design across all sizes. Icons are provided in both PNG (for Chrome) and SVG (for scalable use) formats.

## Files

| File | Size | Usage |
|------|------|-------|
| `icon.svg` | Source | Source SVG file |
| `icon16.png` | 16×16 | Toolbar icon |
| `icon16.svg` | 16×16 | SVG version |
| `icon48.png` | 48×48 | Extension management page |
| `icon48.svg` | 48×48 | SVG version |
| `icon128.png` | 128×128 | Chrome Web Store |
| `icon128.svg` | 128×128 | SVG version |

## Usage in Manifest

Icons are referenced in `manifest.json`:

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

## Design

The icon features:
- **Gradient Design** - Purple to blue gradient background
- **Rounded Corners** - Modern, friendly appearance
- **Flat Style** - Clean, minimalist design
- **High Contrast** - Works well at small sizes
- **Consistent Branding** - Matches extension theme

## Icon Sizes

Chrome requires specific sizes:
- **16×16** - Toolbar icon (most common view)
- **48×48** - Extension management page (`chrome://extensions`)
- **128×128** - Chrome Web Store listing

## Generating Icons

If you need to regenerate icons:

**Option 1: Use Source SVG**
1. Edit `icon.svg` in a vector editor
2. Export at required sizes
3. Save as PNG files

**Option 2: Use Generation Scripts**
Scripts are available in `docs/archive/`:
- `create-png-icons.js` - Node.js script to create PNG icons
- `generate-icons.html` - HTML-based icon generator

## Best Practices

1. **Keep Source SVG** - Always maintain the source SVG file
2. **Optimize PNGs** - Compress PNG files for smaller size
3. **Test at All Sizes** - Verify icons look good at 16px, 48px, and 128px
4. **Consistent Design** - All sizes should look like the same icon
5. **High Quality** - Use high-resolution source for crisp rendering

## File Sizes

Typical file sizes:
- SVG: ~2-5 KB
- PNG 16×16: ~1-2 KB
- PNG 48×48: ~3-5 KB
- PNG 128×128: ~8-15 KB

## Accessibility

Icons should:
- Have sufficient contrast
- Be recognizable at small sizes
- Work in both light and dark themes (if applicable)

## See Also

- [manifest.json](../manifest.json) - Icon configuration
- [Chrome Icon Guidelines](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
