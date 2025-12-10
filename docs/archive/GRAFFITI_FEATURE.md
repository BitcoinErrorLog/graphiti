# Graffiti Drawing Feature

## Overview

The Graffiti Drawing Feature allows users to draw directly on web pages with a canvas overlay. Drawings are persistent per URL and automatically sync to the user's Pubky homeserver.

## Features Implemented

### 1. Drawing Canvas Overlay
- Fixed-position canvas covering the entire viewport
- Mouse-based drawing with smooth stroke rendering
- Crosshair cursor during drawing mode
- Prevents scrolling while drawing is active

### 2. Drawing Toolbar
The toolbar appears in the top-right corner when drawing mode is active and includes:

- **Color Picker**: 8 preset colors (Red, Cyan, Blue, Orange, Mint, Yellow, Purple, White)
- **Brush Thickness**: Adjustable slider from 2px to 20px
- **Clear All**: Removes all drawings from the current page
- **Save & Exit**: Saves the drawing and exits drawing mode

### 3. Storage & Sync

#### Local Storage
- Drawings stored in `chrome.storage.local` under the key `pubky_drawings`
- Each drawing is keyed by exact URL (including query parameters)
- Drawings persist across browser sessions

#### Pubky Homeserver Sync
- Drawings automatically sync to `/pub/graphiti.dev/drawings/` on the user's homeserver
- Each drawing is saved as `{urlHash}.json` containing:
  - Canvas data (base64 PNG)
  - URL
  - Timestamp
  - Author (Pubky ID)
- Sync happens when the popup opens (if authenticated)

### 4. User Interaction

#### Activation Methods
1. **Popup Button**: Click "🎨 Drawing Mode" in the Quick Actions section
2. **Keyboard Shortcut**: Press `Alt+D` (or `Option+D` on Mac)

#### Drawing Process
1. Activate drawing mode using popup button or keyboard shortcut
2. Canvas overlay appears with toolbar
3. Draw using mouse:
   - Click and drag to draw
   - Adjust color and thickness in toolbar
   - Clear all to start over
4. Click "Save & Exit" or toggle drawing mode off to save

### 5. Data Structure

```typescript
interface Drawing {
  id: string;          // Unique identifier
  url: string;         // Page URL
  canvasData: string;  // Base64 PNG image
  timestamp: number;   // Creation time
  author: string;      // Pubky ID
  pubkyUrl?: string;   // URL on homeserver (after sync)
}
```

## Files Modified

### New Files
- `src/utils/drawing-sync.ts` - Pubky sync utility for drawings

### Modified Files
- `src/utils/storage.ts` - Added Drawing interface and storage methods
- `src/utils/pubky-api-sdk.ts` - Added file upload/download methods
- `src/content/content.ts` - Added DrawingManager class (~340 lines)
- `src/popup/components/MainView.tsx` - Added drawing toggle button
- `src/popup/App.tsx` - Added DrawingSync integration
- `src/background/background.ts` - Added drawing message handlers
- `manifest.json` - Added toggle-drawing keyboard command

## Technical Details

### Canvas Implementation
- Canvas size matches viewport dimensions
- Drawings stored as PNG with transparency
- Canvas data serialized to base64 for storage
- Context uses `lineCap: 'round'` and `lineJoin: 'round'` for smooth strokes

### Message Passing
The feature uses Chrome extension message passing:

1. **TOGGLE_DRAWING_MODE**: Toggle drawing mode on/off
2. **SAVE_DRAWING**: Save drawing to storage
3. **GET_DRAWING**: Retrieve drawing for current URL
4. **GET_DRAWING_STATUS**: Check if drawing mode is active

### URL Hashing
- URLs are hashed for homeserver filenames using a simple hash function
- Hash is deterministic (same URL = same hash)
- Collision-resistant for typical use cases

## Usage Examples

### Basic Drawing
1. Navigate to any webpage
2. Press `Alt+D` to activate drawing mode
3. Draw on the page
4. Press `Alt+D` again to save and exit

### Color & Thickness
1. Activate drawing mode
2. Click a color in the toolbar
3. Adjust the thickness slider
4. Draw with new settings

### Clearing Drawings
1. Activate drawing mode
2. Click "Clear All" button
3. Drawing is removed from canvas
4. Save & Exit to persist the cleared state

## Future Enhancements

Potential improvements for future versions:

1. **Eraser Tool**: Dedicated eraser instead of just "Clear All"
2. **Undo/Redo**: Step-by-step history management
3. **Drawing Shapes**: Rectangles, circles, arrows
4. **Text Annotations**: Add text labels to drawings
5. **Share Drawings**: View drawings from followed users
6. **Export**: Download drawings as PNG files
7. **Multiple Layers**: Separate drawing layers
8. **Touch Support**: Tablet and touch screen compatibility

## Security & Privacy

- Drawings are stored locally and optionally synced to personal homeserver
- No third-party servers involved
- Only authenticated users can sync to homeserver
- Drawings are private unless explicitly shared via Pubky

## Testing

To test the feature:

1. Build the extension: `npm run build`
2. Load the extension in Chrome
3. Navigate to any webpage
4. Press `Alt+D` or click the drawing button in the popup
5. Draw on the page
6. Save and reload the page to verify persistence
7. Open the popup to trigger Pubky sync (if authenticated)

## Known Limitations

1. **Viewport Size**: Drawings are tied to viewport size at creation time
2. **Scroll Position**: Drawing mode disables scrolling to prevent misalignment
3. **Dynamic Content**: SPAs that change content may affect drawing positioning
4. **Performance**: Very complex drawings may impact page performance
5. **Browser Support**: Chrome/Edge only (Manifest V3 requirement)

