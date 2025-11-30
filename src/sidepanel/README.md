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

## See Also

- [Popup](../popup/README.md)
- [Annotation Feature](../../FEATURES.md#text-annotations)

