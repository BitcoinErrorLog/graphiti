# Popup UI

The extension popup provides the main user interface for authentication, quick actions, and profile management.

## Structure

```
popup/
├── main.tsx              # Entry point
├── App.tsx               # Main application component
└── components/
    ├── AuthView.tsx      # QR code authentication
    ├── MainView.tsx      # Logged-in view with actions
    ├── DebugPanel.tsx    # Debug log viewer
    └── ProfileEditor.tsx # Profile editing form
```

## Components

### App.tsx

Main application component that:
- Manages authentication state
- Routes between views
- Handles bookmark/post actions
- Controls debug panel visibility

### AuthView.tsx

QR code authentication flow:
- Generates client secret
- Creates `pubkyauth://` URL
- Displays QR code for Pubky Ring scan
- Polls relay for authentication token

### MainView.tsx

Logged-in user interface:
- User info display
- Current page URL/title
- Bookmark button (with toggle state)
- Tag input and post creation
- View feed button (opens sidepanel)
- Drawing mode toggle
- Profile edit button

### DebugPanel.tsx

Real-time log viewer:
- Log level filtering
- Context filtering
- Log export to JSON
- Clear logs

### ProfileEditor.tsx

Profile editing form:
- Name, bio, avatar URL
- Status with emoji picker (200+ emojis)
- Social links management
- Live data loading from homeserver
- Save to homeserver

## State Management

Uses React hooks for state:

```typescript
const [session, setSession] = useState<Session | null>(null);
const [loading, setLoading] = useState(true);
const [currentUrl, setCurrentUrl] = useState<string>('');
const [showDebug, setShowDebug] = useState(false);
const [currentView, setCurrentView] = useState<View>('main');
```

## Styling

Uses Tailwind CSS with dark theme:
- Background: `bg-[#2B2B2B]`
- Header: `bg-[#1F1F1F]`
- Accent: Blue/purple gradients

## Dimensions

Fixed popup size: `400px × 500px`

```css
.popup {
  width: 400px;
  min-height: 500px;
}
```

## Features

### Authentication
- QR code generation and display
- Relay polling for auth tokens
- Session management
- Error handling

### Quick Actions
- Bookmark current page
- Toggle drawing mode
- Create posts with tags
- Open side panel feed

### Profile Management
- Edit profile (name, bio, avatar, status, links)
- Export recovery file for key backup
- Image upload and cropping
- Homeserver sync

### Debug Tools
- Real-time log viewer
- Log filtering and export
- Performance monitoring

## Keyboard Shortcuts

- `Shift+?` - Show keyboard shortcuts help
- `Escape` - Close modals

## State Management

Uses React Context API:
- `SessionContext` - Authentication state
- `ThemeContext` - Theme preferences

## See Also

- [Sidepanel](../sidepanel/README.md) - Feed viewer
- [Auth SDK](../utils/auth-sdk.ts) - Authentication logic
- [Recovery File](../utils/recovery-file.ts) - Key backup
- [Components](./components/README.md) - Component documentation
- [Main README](../../README.md) - Getting started guide

