# Sidepanel UI

The sidepanel displays the social feed for the current page, showing posts and annotations from your network.

## Structure

```
sidepanel/
├── main.tsx              # Entry point
├── App.tsx               # Main application component
└── components/
    ├── PostCard.tsx      # Post display card
    ├── AnnotationCard.tsx # Annotation display card
    └── EmptyState.tsx    # Empty feed state
```

## Components

### App.tsx

Main sidepanel component that:
- Fetches posts for current URL using URL hash tag
- Fetches annotations for current page
- Manages tab navigation (Posts/Annotations)
- Handles refresh
- Syncs pending annotations on load

### PostCard.tsx

Displays individual posts:
- Author avatar and name
- Post content
- Relative timestamp ("5m ago")
- Post type indicator
- Tags display with colors
- Embedded content preview

### AnnotationCard.tsx

Displays annotations:
- Author info
- Selected text preview
- Comment content
- Click-to-highlight functionality

### EmptyState.tsx

Shown when no content found:
- Friendly message
- Suggestions for actions

## Data Flow

```
Page Load
    ↓
Get current tab URL
    ↓
Generate URL hash tag
    ↓
Query Nexus API
    ├── Posts with matching tag
    └── Annotations with matching tag
    ↓
Render feed
```

## Feed Fetching

```typescript
// Fetch posts about current URL
const urlHashTag = await generateUrlHashTag(currentUrl);
const posts = await pubkyAPISDK.searchPostsByUrl(currentUrl, session?.pubky);

// Fetch annotations
const annotations = await pubkyAPISDK.searchAnnotationsByUrl(currentUrl);
```

## Tab Navigation

Two tabs:
1. **Posts** - Social posts about this URL
2. **Annotations** - Text annotations on this page

```typescript
const [activeTab, setActiveTab] = useState<'posts' | 'annotations'>('posts');
```

## Annotation Highlighting

Clicking an annotation card sends message to content script:

```typescript
const handleAnnotationClick = (annotationId: string) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id!, {
      type: 'HIGHLIGHT_ANNOTATION',
      annotationId,
    });
  });
};
```

## Auto-Sync

On panel open, syncs any pending annotations to Pubky:

```typescript
useEffect(() => {
  AnnotationSync.syncPendingAnnotations().catch(console.error);
}, []);
```

## Styling

Matches popup theme with dark background and tailored for panel width.

## Features

### Feed Display
- Posts about current URL from your network
- Annotations on current page
- Your own content
- Real-time updates

### Navigation
- Tab-based interface
- Click annotations to highlight on page
- Scroll to annotation location
- Refresh feed

### Post Interaction
- View author profiles
- See tags and content
- Navigate to original URLs
- View embedded content

## Keyboard Shortcuts

- `Shift+?` - Show keyboard shortcuts help
- `Escape` - Close side panel

## State Management

Uses React Context API:
- `SessionContext` - Authentication state
- `ThemeContext` - Theme preferences

## Performance

- Lazy loading for large feeds
- Efficient re-renders
- Memoization for expensive operations

## See Also

- [Popup](../popup/README.md) - Main UI
- [Annotation Feature](../../FEATURES.md#text-annotations)
- [Components](./components/README.md) - Component documentation
- [Main README](../../README.md) - Getting started guide

