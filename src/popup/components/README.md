# Popup Components

React components that make up the extension popup user interface. The popup is the main entry point for users to interact with Graphiti.

## Overview

The popup provides:
- **Authentication** - QR code sign-in with Pubky Ring
- **Quick Actions** - Bookmark, draw, tag, post
- **Profile Management** - Edit profile and export recovery files
- **Debug Tools** - Log viewer and troubleshooting
- **Storage Management** - View and manage local storage

## Components

### AuthView.tsx

QR code authentication component for signing in with Pubky Ring.

**Props:**
- `onAuthSuccess(session: Session)` - Callback when authentication succeeds

**Features:**
- Generates 32-byte cryptographic client secret
- Creates `pubkyauth://` URL with relay and capabilities
- Displays QR code using `qrcode` library
- Polls relay server every 2 seconds for authentication token
- Shows loading states and error messages
- Handles token decryption and session creation

**Usage:**
```tsx
<AuthView onAuthSuccess={(session) => {
  setSession(session);
  // User is now authenticated
}} />
```

**Authentication Flow:**
1. User clicks "Sign In with Pubky Ring"
2. Component generates client secret and channel ID
3. QR code displayed with `pubkyauth://` URL
4. User scans with Pubky Ring mobile app
5. Mobile app sends encrypted token to relay
6. Component polls relay and decrypts token
7. Session created and stored locally

### MainView.tsx

Main logged-in user interface with all quick actions.

**Props:**
- `session: Session` - Current authenticated session
- `currentUrl: string` - URL of the active tab
- `currentTitle: string` - Title of the active tab
- `onSignOut()` - Callback to sign out
- `onBookmark(category?: string)` - Callback to bookmark current page
- `onPost(content: string, tags: string[])` - Callback to create post
- `onOpenSidePanel()` - Callback to open side panel feed
- `onEditProfile()` - Callback to open profile editor
- `onManageStorage()` - Callback to open storage manager

**Features:**
- User info display with truncated pubky ID
- Current page URL and title display
- Bookmark button with toggle state (☆/⭐)
- Tag input with comma/space parsing
- Post content textarea with character counter
- Quick action buttons:
  - 🎨 Toggle Drawing Mode
  - 📱 View Feed (opens side panel)
  - ✏️ Edit Profile
  - 💾 Manage Storage
- Sync status indicator
- Annotation toggle button

**State Management:**
- Uses local state for form inputs
- Fetches bookmark status on mount
- Updates when URL changes

### ProfileEditor.tsx

Profile editing form with recovery file export.

**Features:**
- **Profile Fields:**
  - Name (required, max 100 chars)
  - Bio (optional, max 500 chars)
  - Avatar image URL
  - Status with emoji picker (200+ emojis)
  - Social links (add/remove multiple)
- **Image Upload:**
  - Drag and drop support
  - Image cropping with aspect ratio
  - Upload progress indicator
  - Automatic image compression
- **Recovery File Export:**
  - Export encrypted recovery file
  - Passphrase validation (min 8 chars, letters + numbers)
  - Secure file download
  - Critical for key backup

**Data Flow:**
1. Loads existing profile from homeserver on mount
2. Falls back to Nexus API if profile.json not found
3. Saves to homeserver as `profile.json` and `index.html`
4. Updates local storage

**Recovery File Export:**
1. User clicks "🔐 Export Recovery File"
2. Modal opens with passphrase input
3. Passphrase validated (strength check)
4. Recovery file created using Pubky SDK
5. File downloads automatically with timestamp

### DebugPanel.tsx

Real-time log viewer for troubleshooting.

**Features:**
- **Log Display:**
  - Real-time log streaming
  - Color-coded by level (DEBUG, INFO, WARN, ERROR)
  - JSON data expansion/collapse
  - Timestamp and context display
- **Filtering:**
  - Filter by log level (DEBUG, INFO, WARN, ERROR)
  - Filter by context (Background, Popup, Content, etc.)
  - Search functionality
- **Actions:**
  - Export logs as JSON file
  - Clear all logs
  - Auto-scroll to latest

**Usage:**
1. Click "🔧 Debug" button in popup header
2. View all extension activity in real-time
3. Filter to find specific issues
4. Export logs for troubleshooting

### StorageManager.tsx

Storage quota and data management interface.

**Features:**
- Storage quota display (used/total)
- Breakdown by data type:
  - Sessions
  - Bookmarks
  - Drawings
  - Annotations
  - Tags
- Clear data options:
  - Clear specific data types
  - Clear all data
- Storage warnings when approaching quota

### SyncStatus.tsx

Displays sync status for pending items.

**Features:**
- Shows count of pending annotations
- Shows count of pending drawings
- Manual sync button
- Auto-syncs on popup open

### Other Components

- **LoadingSpinner.tsx** - Loading indicator with text
- **ProgressBar.tsx** - Progress bar for uploads
- **ImageCropper.tsx** - Image cropping modal
- **Toast.tsx** - Toast notification container
- **SkeletonLoader.tsx** - Skeleton loading states
- **ErrorBoundary.tsx** - React error boundary for crash prevention
- **Onboarding.tsx** - First-time user onboarding flow
- **KeyboardShortcutsModal.tsx** - Keyboard shortcuts help modal

## Component Architecture

```
App.tsx (Main Router)
├── AuthView (if not authenticated)
└── MainView (if authenticated)
    ├── SyncStatus
    └── [Routes to:]
        ├── ProfileEditor
        │   └── ImageCropper (modal)
        ├── StorageManager
        └── DebugPanel
```

## Styling

All components use Tailwind CSS with a consistent dark theme:
- Background: `bg-[#2B2B2B]`
- Cards: `bg-[#1F1F1F]`
- Borders: `border-[#3F3F3F]`
- Accent: Purple/pink gradients
- Text: White with gray variants

## State Management

Components use React hooks for state:
- Local state for component-specific data
- Context API for shared state (SessionContext, ThemeContext)
- Props for parent-child communication

## Accessibility

All components include:
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Color contrast compliance

## Testing

Component tests are in `__tests__/`:
- Unit tests for individual components
- Integration tests for component interactions
- Test utilities for common patterns

## See Also

- [Popup README](../README.md) - Popup architecture overview
- [Main README](../../../README.md) - Getting started guide
- [FEATURES.md](../../../FEATURES.md) - Complete feature documentation
