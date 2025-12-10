# Web Annotation Feature

## Overview

The Graphiti extension now includes a powerful web annotation system that allows users to highlight text on any webpage and add comments that are shared as Pubky posts. This creates a collaborative layer over the web where users can see and interact with each other's annotations.

## Features

### 1. Text Selection & Highlighting
- Select any text on a webpage to create an annotation
- Highlights appear with a yellow background and are clickable
- Highlights persist across page visits for all users with the extension

### 2. Annotation Creation
- After selecting text, click the "Add Annotation" button that appears
- Write your comment in a beautiful modal dialog
- Annotations are published as Pubky posts with special tags
- All annotations are stored both locally and on your Pubky homeserver

### 3. Collaborative Viewing
- All users with the extension can see annotations from across the Pubky network
- No need to be signed in to view annotations (but required to create them)
- Annotations are synchronized in real-time via the Nexus API

### 4. Sidebar Integration
- New "Annotations" tab in the sidebar shows all annotations for the current page
- Switch between "Posts" and "Annotations" tabs
- Click any annotation card to highlight and scroll to it on the page
- View annotation author, timestamp, selected text, and comment

## How to Use

### Creating an Annotation

1. Navigate to any webpage
2. Select the text you want to annotate
3. Click the "Add Annotation" button that appears
4. Write your comment in the modal
5. Click "Post Annotation"
6. Your highlight will appear on the page and be visible to all users!

### Viewing Annotations

1. Open the sidebar (click the extension icon and then "Open Side Panel")
2. Click the "Annotations" tab
3. Browse all annotations for the current page
4. Click any annotation to see it highlighted on the page

### Interacting with Highlights

1. Hover over any highlight to see it brighten
2. Click a highlight to open the sidebar and view its full annotation
3. The selected highlight will be emphasized in the sidebar

## Technical Details

### Architecture

The annotation system consists of several components:

1. **Content Script** (`src/content/content.ts`)
   - Runs on all web pages
   - Handles text selection and highlighting
   - Renders annotation UI elements
   - Manages highlight interactions

2. **Annotation Storage** (`src/utils/annotations.ts`)
   - Local storage for fast access
   - Syncs with remote Pubky posts
   - Handles annotation CRUD operations

3. **Pubky API Integration** (`src/utils/pubky-api-sdk.ts`)
   - Creates annotation posts with special tags
   - Searches for annotations via Nexus API
   - Uses URL hash tags for efficient querying

4. **Background Script** (`src/background/background.ts`)
   - Coordinates between content scripts and sidebar
   - Handles annotation creation and retrieval
   - Manages cross-tab communication

5. **Sidebar Components** (`src/sidepanel/`)
   - Tab-based interface for posts and annotations
   - Annotation cards with rich formatting
   - Click-to-highlight functionality

### Data Structure

Each annotation contains:
- `id`: Unique identifier
- `url`: The webpage URL
- `selectedText`: The highlighted text
- `comment`: User's comment
- `startPath`/`endPath`: DOM node paths for positioning
- `startOffset`/`endOffset`: Text offsets within nodes
- `timestamp`: Creation time
- `author`: Pubky user ID
- `postUri`: Link to the Pubky post
- `color`: Highlight color

### Pubky Integration

Annotations are stored as Pubky posts with:
- **Kind**: `short` (short-form content)
- **Content**: JSON string containing annotation data
- **Tags**: 
  - URL hash tag (generated from page URL for efficient searching)
  - Special `pubky:annotation` tag to distinguish from regular posts

This allows annotations to:
- Be discovered by all users via Nexus API
- Persist permanently on the Pubky network
- Be tied to specific URLs without exposing full URLs in tags

### Highlight Rendering

The system uses DOM Range API to:
1. Store the exact position of selected text using node paths
2. Reconstruct the selection on page load
3. Wrap selected text in styled `<span>` elements
4. Handle clicks and hover interactions

### Cross-User Synchronization

When a page loads:
1. Content script requests annotations from background
2. Background fetches local annotations
3. Background queries Nexus API for network-wide annotations
4. All annotations are merged and rendered
5. Remote annotations are cached locally for performance

## Privacy & Security

- Annotations are public and visible to all Pubky network users
- No authentication required to view annotations
- Authentication required to create annotations
- URLs are hashed before being used as tags (privacy consideration)
- Highlights only appear for users with the extension installed

## Limitations

- Complex HTML structures may prevent some text from being highlightable
- Dynamic content (SPAs) may cause highlights to disappear on navigation
- Very long selections (>1000 chars) are not supported
- Annotations are tied to exact text matches (page edits may break highlights)

## Future Enhancements

Potential improvements:
- Threaded replies to annotations
- Different highlight colors
- Annotation filtering and sorting
- Private/friends-only annotations
- Fuzzy text matching for better resilience
- Annotation voting/reactions
- Export/import annotations
- Annotation search across all pages

## Development

### Building

The annotation feature is included in the standard build:

```bash
npm run build
```

This compiles the content script along with other extension components.

### Testing

1. Load the extension in Chrome (Load unpacked from `dist/` folder)
2. Navigate to any webpage
3. Select text and create an annotation
4. Open a new tab to the same URL to verify persistence
5. Check the sidebar to see your annotation listed

### Debugging

- Check the browser console for content script logs
- Check the extension service worker console for background logs
- Use the debug panel in the popup to view authentication status
- Inspect annotation storage: `chrome.storage.local.get('pubky_annotations')`

## Credits

Built with:
- Pubky SDK for decentralized storage
- Nexus API for network-wide discovery
- Chrome Extension APIs for web integration
- React for UI components
- TailwindCSS for styling

