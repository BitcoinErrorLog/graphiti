# Popup Components

React components for the extension popup UI.

## Components

### AuthView.tsx

QR code authentication component.

**Props:**
- `onAuthSuccess(session: Session)` - Callback on successful auth

**Features:**
- Generates cryptographic client secret
- Creates `pubkyauth://` URL with capabilities
- Displays QR code using `qrcode` library
- Polls relay server for authentication
- Shows loading/error states

### MainView.tsx

Main logged-in user interface.

**Props:**
- `session: Session` - Current user session
- `currentUrl: string` - Current tab URL
- `currentTitle: string` - Current tab title
- `onSignOut()` - Sign out callback
- `onBookmark()` - Bookmark action callback
- `onPost(content, tags)` - Post creation callback
- `onOpenSidePanel()` - Open sidepanel callback
- `onEditProfile()` - Edit profile callback

**Features:**
- User info display with truncated pubky
- Page info section
- Bookmark button with toggle state
- Tag input with comma/space parsing
- Post content textarea
- Quick action buttons

### DebugPanel.tsx

Debug log viewer panel.

**Features:**
- Real-time log display
- Level filtering (DEBUG, INFO, WARN, ERROR)
- Color-coded log entries
- JSON data expansion
- Export logs as JSON file
- Clear all logs

### ProfileEditor.tsx

Profile editing form.

**Features:**
- Name, bio, avatar URL inputs
- Status with emoji picker (200+ emojis)
- Social links management (add/remove)
- Live data loading from homeserver
- Save to homeserver
- Local storage fallback

## Shared State

Components receive state via props from parent `App.tsx`. No global state management library is used.

## Styling

All components use Tailwind CSS classes for styling, matching the dark theme.

## See Also

- [Parent App](../App.tsx)
- [Popup README](../README.md)

