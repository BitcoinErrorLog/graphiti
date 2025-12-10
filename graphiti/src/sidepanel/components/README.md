# Sidepanel Components

React components for the sidepanel feed UI.

## Components

### PostCard.tsx

Displays a single post from the feed.

**Props:**
- `post: NexusPost` - Post data from Nexus API

**Features:**
- Author avatar (with fallback)
- Author name
- Post content
- Relative timestamp ("5m ago", "2h ago")
- Post type indicator (link, short, image, etc.)
- Tags with consistent colors
- Embedded content preview
- Attachments display

**Timestamp Formatting:**
```typescript
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

### AnnotationCard.tsx

Displays a single annotation.

**Props:**
- `annotation: Annotation` - Annotation data
- `onClick()` - Click handler (highlights on page)

**Features:**
- Author info
- Selected text preview (truncated)
- Comment content
- Highlight color indicator
- Click to navigate to annotation on page

**Click Handler:**
```typescript
onClick={() => {
  chrome.tabs.sendMessage(tabId, {
    type: 'HIGHLIGHT_ANNOTATION',
    annotationId: annotation.id,
  });
}}
```

### EmptyState.tsx

Empty feed state component.

**Props:**
- `message?: string` - Custom message
- `suggestion?: string` - Suggested action

**Default Messages:**
- Posts tab: "No posts about this page yet"
- Annotations tab: "No annotations on this page"

## Data Types

### NexusPost

```typescript
interface NexusPost {
  details: {
    id: string;
    author: string;
    content: string;
    kind: string;
    indexed_at: number;
  };
  author?: {
    name?: string;
    image?: string;
  };
  tags?: Array<{ label: string }>;
}
```

### Annotation

```typescript
interface Annotation {
  id: string;
  selectedText: string;
  comment: string;
  author: string;
  timestamp: number;
  color: string;
}
```

## Styling

Dark theme with cards:
- Card background: `bg-[#2A2A2A]`
- Hover: `hover:bg-[#333333]`
- Border: `border-[#3F3F3F]`

## See Also

- [Parent App](../App.tsx)
- [Sidepanel README](../README.md)
- [Tag Colors](../../utils/tag-colors.ts)

