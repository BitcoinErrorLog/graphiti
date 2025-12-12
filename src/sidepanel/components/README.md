# Sidepanel Components

React components for the sidepanel feed viewer. The sidepanel displays social content related to the current page.

## Overview

The sidepanel provides:
- **Social Feed** - Posts about the current URL from your network
- **Annotations Browser** - View all annotations on the current page
- **Post Display** - Rich post cards with author info, tags, and content
- **Navigation** - Tab-based interface for different content types

## Components

### PostCard.tsx

Displays a single post from the feed with rich formatting.

**Props:**
- `post: NexusPost` - Post data from Nexus API
- `onClick?: (postId: string) => void` - Optional click handler

**Features:**
- **Author Display:**
  - Avatar image (with fallback to initials)
  - Author name (from profile or truncated pubky ID)
  - Relative timestamp ("5m ago", "2h ago", "3d ago")
- **Content Display:**
  - Post content text
  - Post type indicator (link, short, image, etc.)
  - Embedded content preview (if applicable)
  - Attachments display
- **Tags:**
  - Color-coded tags using consistent color scheme
  - Clickable tags (future: filter by tag)
- **Styling:**
  - Card-based layout with hover effects
  - Responsive design
  - Dark theme consistent with extension

**Post Types:**
- `link` - URL posts with preview
- `short` - Short text posts
- `image` - Image posts
- `annotation` - Annotation posts
- `bookmark` - Bookmark posts

**Example:**
```tsx
<PostCard 
  post={postData}
  onClick={(id) => console.log('Clicked post', id)}
/>
```

### AnnotationCard.tsx

Displays a single annotation with click-to-highlight functionality.

**Props:**
- `annotation: Annotation` - Annotation data
- `onClick?: (annotationId: string) => void` - Click handler (highlights on page)

**Features:**
- **Annotation Display:**
  - Author info (name, avatar)
  - Selected text preview (truncated if long)
  - Comment content
  - Highlight color indicator
  - Relative timestamp
- **Interaction:**
  - Click to navigate to annotation on page
  - Sends message to content script to highlight
  - Scrolls page to annotation location

**Click Handler:**
```typescript
const handleClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id!, {
      type: 'HIGHLIGHT_ANNOTATION',
      annotationId: annotation.id,
    });
  });
};
```

### EmptyState.tsx

Empty feed state component shown when no content is available.

**Props:**
- `message?: string` - Custom message (optional)
- `suggestion?: string` - Suggested action (optional)

**Default Messages:**
- Posts tab: "No posts about this page yet"
- Annotations tab: "No annotations on this page"
- Your Content tab: "You haven't posted anything yet"

**Features:**
- Friendly, encouraging messaging
- Actionable suggestions
- Consistent styling

### LoadingState.tsx

Loading indicator for feed content.

**Features:**
- Skeleton loaders for posts
- Loading spinner
- Consistent with extension theme

### PostCardSkeleton.tsx

Skeleton loader for post cards during loading.

**Features:**
- Matches PostCard layout
- Animated shimmer effect
- Provides visual feedback during data fetch

### ErrorBoundary.tsx

React error boundary to prevent crashes.

**Features:**
- Catches React component errors
- Displays friendly error message
- Allows app to continue functioning
- Logs errors for debugging

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
    // ... other fields
  };
  author?: {
    name?: string;
    image?: string;
    bio?: string;
  };
  tags?: Array<{ label: string }>;
  attachments?: Array<{ /* ... */ }>;
}
```

### Annotation

```typescript
interface Annotation {
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  author: string;
  timestamp: number;
  color: string;
  postUri?: string;
  // DOM positioning data
  startPath: string;
  endPath: string;
  startOffset: number;
  endOffset: number;
}
```

## Component Architecture

```
App.tsx (Sidepanel Main)
├── Tab Navigation
│   ├── Posts Tab
│   │   └── PostCard[] (mapped from posts)
│   ├── Annotations Tab
│   │   └── AnnotationCard[] (mapped from annotations)
│   └── Your Content Tab
│       └── PostCard[] (filtered by current user)
├── EmptyState (when no content)
├── LoadingState (during fetch)
└── ErrorBoundary (error handling)
```

## Styling

Dark theme with card-based layout:
- Card background: `bg-[#2A2A2A]`
- Hover: `hover:bg-[#333333]`
- Border: `border-[#3F3F3F]`
- Text: White with gray variants
- Accent colors for tags

## Data Fetching

Posts are fetched using:
```typescript
const urlHashTag = await generateUrlHashTag(currentUrl);
const posts = await pubkyAPISDK.searchPostsByUrl(currentUrl, session?.pubky);
```

Annotations are fetched using:
```typescript
const annotations = await pubkyAPISDK.searchAnnotationsByUrl(currentUrl);
```

## Performance

- Lazy loading for large feeds
- Virtual scrolling (future enhancement)
- Memoization for expensive renders
- Efficient re-renders with React.memo

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Testing

Component tests verify:
- Rendering with different data
- Click handlers
- Empty states
- Loading states
- Error boundaries

## See Also

- [Sidepanel README](../README.md) - Sidepanel architecture
- [Tag Colors](../../utils/tag-colors.ts) - Tag color utilities
- [Main README](../../../README.md) - Getting started
