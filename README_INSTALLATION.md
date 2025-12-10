# Chrome Extension Installation Guide

## Quick Install (Unpacked Extension)

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Package for Distribution

To create a zip file for distribution:

```bash
npm run package
```

This will:
1. Build the extension
2. Create `graphiti-extension.zip` containing the extension files

The zip file can be:
- Shared with others for manual installation
- Used for Chrome Web Store submission (after signing)
- Archived for version control

## Installation from Zip

1. Extract `graphiti-extension.zip` to a folder
2. Follow the "Quick Install" steps above, selecting the extracted folder instead of `dist`

## Note

The `graphiti-extension.zip` file is included in the repository for easy distribution. It's automatically updated when you run `npm run package`.
