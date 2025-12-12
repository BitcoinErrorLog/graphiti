# Graphiti - Pubky URL Tagger 🎨

A powerful Chrome extension that lets you **draw graffiti on web pages**, create text annotations, bookmark URLs, and share everything through the decentralized Pubky network. All your data syncs to your personal Pubky homeserver - no third-party tracking!

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/BitcoinErrorLog/graphiti)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

### 🎨 **Drawing Mode**
Draw graffiti directly on any webpage with a persistent canvas overlay:
- **8-color palette** for vibrant drawings
- **Adjustable brush thickness** (2-20px)
- **Mouse-based drawing** with smooth strokes
- **Persistent storage** - drawings save automatically per URL
- **Pubky sync** - backup drawings to your homeserver
- **Easy controls** - Clear all, save & exit, color picker

**Use Cases:**
- Annotate screenshots without taking screenshots
- Mark up web pages for design feedback
- Highlight important areas on documentation
- Create visual notes on articles
- Collaborative web graffiti (with shared URLs)

### 📝 **Text Annotations**
Highlight text and add comments that persist:
- Select any text on a page
- Add detailed comments and notes
- Annotations sync to Pubky homeserver
- View all annotations in the sidebar
- Click annotations to scroll to highlighted text
- Search and filter your annotations

### 🔖 **Bookmarks & Tags**
Organize and share your favorite content:
- One-click bookmarking
- Add custom tags to any URL
- Bookmarks sync to Pubky homeserver
- Tag-based discovery
- View bookmarks from people you follow

### 📱 **Social Feed**
See what your network is sharing:
- View posts about the current page
- See bookmarks and annotations from followed users
- Chronological feed with real-time updates
- Post your own content with tags
- Engage with your decentralized network

### 🔐 **Privacy-First Authentication & Key Management**
Secure QR-based authentication with key backup:
- Scan QR code with Pubky Ring mobile app
- No passwords, no tracking
- Your keys, your data
- Sessions stored locally
- **Recovery file export** - Backup your keys with encrypted recovery files
- Full control over your identity

### 🛠️ **Developer Tools**
Built-in debugging and monitoring:
- Real-time log viewer
- Export logs for troubleshooting
- Filter by log level
- Performance monitoring
- Clear console interface

## 🚀 Quick Start

### Installation (For Users)

**Option 1: Install from ZIP (Recommended)**
1. Download `graphiti-extension.zip` from the repository
2. Extract the zip file to a folder (e.g., `graphiti-extension`)
3. Open Chrome → `chrome://extensions`
4. Enable "Developer mode" (toggle in top-right)
5. Click "Load unpacked"
6. Select the extracted folder (not the zip file itself)
7. Done! 🎉

**Note:** The zip file contains the pre-built extension. You don't need to build it yourself.

**Option 2: Build from Source**
```bash
# Clone the repository
git clone https://github.com/BitcoinErrorLog/graphiti.git
cd graphiti

# Install dependencies
npm install

# Build the extension
npm run build

# Load dist/ folder in Chrome at chrome://extensions
```

### First-Time Setup

1. **Click the Graphiti icon** in your Chrome toolbar
2. **Sign in** with Pubky Ring (or skip to use local-only mode)
3. **Navigate to any website** (e.g., https://example.com)
4. **Try drawing mode** - Press `Alt+D` and start drawing!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+P` | Open Popup | Open the extension popup |
| `Alt+D` | Toggle Drawing | Enable/disable drawing mode |
| `Alt+S` | Toggle Sidebar | Open/close the side panel |
| `Alt+A` | Open Annotations | Jump to annotations tab |
| `Alt+Shift+A` | Toggle Annotations | Enable/disable annotation button |
| `Shift+?` | Show Shortcuts | Display keyboard shortcuts help |
| `Ctrl+Z` / `Cmd+Z` | Undo | Undo last action (in drawing mode) |
| `Ctrl+Y` / `Cmd+Shift+Z` | Redo | Redo last action (in drawing mode) |
| `Escape` | Close/Exit | Close modal or exit drawing mode |

*On Mac, use `Option` instead of `Alt` and `Cmd` instead of `Ctrl`*

**Tip:** Press `Shift+?` in the popup or sidepanel to see all available shortcuts!

## 📖 Usage Guide

### Drawing on Web Pages

**Activate Drawing Mode:**
1. Navigate to any webpage
2. Press `Alt+D` (or click 🎨 in popup)
3. A toolbar appears in the top-right corner

**Drawing Controls:**
- **Click and drag** to draw
- **Color picker** - Choose from 8 colors
- **Thickness slider** - Adjust brush size (2-20px)
- **Clear All** - Remove all drawings
- **Save & Exit** - Save and close drawing mode

**Important Notes:**
- Drawings save automatically per URL
- Return to the page and press `Alt+D` to see your drawing
- If signed in, drawings sync to Pubky homeserver
- Works on regular websites (not on chrome:// pages)

**Troubleshooting Drawing Mode:**
- If it doesn't work, reload the extension at `chrome://extensions`
- Refresh the webpage you want to draw on
- Make sure you're on a regular HTTP/HTTPS website
- Check console (F12) for "[Graphiti]" logs

### Text Annotations

**Create an Annotation:**
1. Select text on any page
2. Click "Add Annotation" button that appears
3. Type your comment
4. Click "Post Annotation"

**View Annotations:**
1. Click the extension icon
2. Click "View Feed"
3. Switch to "Annotations" tab
4. Click any annotation to highlight it on the page

### Bookmarking

**Bookmark a Page:**
1. Navigate to the page
2. Click the extension icon
3. Click "Bookmark Page" or "☆"
4. Bookmark saves locally and syncs to Pubky

**Remove Bookmark:**
1. Click the extension icon
2. If already bookmarked, click "⭐ Bookmarked"
3. Bookmark is removed

### Tagging & Posting

**Tag a URL:**
1. Click the extension icon
2. Enter tags (comma or space separated)
3. Optionally add a comment
4. Click "Create Post" or "Tag URL"

**Tag Guidelines:**
- Maximum 20 characters per tag
- Tags are lowercase
- Use comma or space to separate
- Example: `tutorial, javascript, react`

### Viewing Your Feed

**Open Feed:**
1. Click the extension icon
2. Click "📱 View Feed"
3. Side panel opens on the right

**Feed Tabs:**
- **Posts** - All posts about current URL from your network
- **Annotations** - Text annotations on this page
- **Your Content** - Your own posts and annotations

### Profile Management

**Edit Your Profile:**
1. Click the extension icon
2. Click "✏️ Edit Profile"
3. Update your name, bio, avatar, status, and links
4. Click "Save Profile" to sync to your homeserver

**Export Recovery File (Key Backup):**
1. Click the extension icon
2. Click "✏️ Edit Profile"
3. Scroll to "Key Backup" section
4. Click "🔐 Export Recovery File"
5. Enter a strong passphrase (min 8 chars, letters + numbers)
6. Confirm the passphrase
7. File downloads automatically (`pubky-recovery-YYYY-MM-DD.recovery`)

**Important:** Store your recovery file securely! You'll need it and your passphrase to restore your keys if you lose access to your device.

## 🏗️ Architecture

### Technology Stack

- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern utility-first styling
- **Vite** - Lightning-fast build tool
- **Chrome Extension Manifest V3** - Latest extension API
- **Pubky Protocol** - Decentralized identity and storage
- **Vitest** - Fast unit and integration testing

### File Structure

```
graphiti/
├── manifest.json              # Chrome extension manifest
├── package.json               # Dependencies
├── vite.config.ts             # Build configuration
├── vitest.config.ts           # Test configuration
├── tailwind.config.js         # Tailwind config
│
├── src/
│   ├── background/            # Background service worker
│   ├── content/               # Content scripts (page injection)
│   ├── popup/                 # Extension popup UI
│   ├── sidepanel/             # Side panel feed UI
│   ├── profile/               # Profile viewer pages
│   ├── styles/                # Global CSS
│   ├── utils/                 # Shared utilities
│   │   ├── __tests__/         # Unit tests
│   │   ├── crypto.ts          # Cryptography, URL hashing
│   │   ├── storage.ts         # Chrome storage wrapper
│   │   ├── pubky-api-sdk.ts   # Pubky homeserver client
│   │   ├── nexus-client.ts    # Nexus API client
│   │   └── ...                # Other utilities
│   └── test/                  # Test setup and mocks
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── API_REFERENCE.md       # API documentation
│   ├── TESTING.md             # Test documentation
│   ├── UTF16_HASH_ENCODING.md # URL hash spec
│   └── archive/               # Historical dev notes
│
├── icons/                     # Extension icons
└── dist/                      # Build output
```

### Key Components

**Background Service Worker** (`src/background/background.ts`)
- Handles extension lifecycle
- Manages keyboard shortcuts
- Coordinates between popup, content, and sidepanel
- Handles drawing/annotation storage
- Manages Pubky API calls

**Content Script** (`src/content/content.ts`)
- Runs on every webpage
- AnnotationManager - text highlighting
- DrawingManager - canvas overlay
- Pubky URL handler - intercepts pubky:// links

**Popup** (`src/popup/`)
- Main user interface
- Authentication flow
- Quick actions (bookmark, draw, tag)
- Post creation
- Profile editing

**Side Panel** (`src/sidepanel/`)
- Feed viewer
- Post display
- Annotation browser
- Tab-based navigation

## 🔌 Pubky Integration

### Data Storage Locations

All data syncs to your Pubky homeserver:

| Data Type | Homeserver Path | Format |
|-----------|----------------|--------|
| Profile | `/pub/pubky.app/profile.json` | JSON |
| Posts | `/pub/pubky.app/posts/` | Individual post files |
| Bookmarks | `/pub/pubky.app/bookmarks/` | Bookmark references |
| Tags | `/pub/pubky.app/tags/` | Tag metadata |
| Drawings | `/pub/graphiti.dev/drawings/` | Base64 PNG + metadata |
| Annotations | Posts with annotation metadata | JSON |

### Authentication Flow

1. **Generate Secret** - Create 32-byte client secret
2. **Calculate Channel ID** - SHA-256 hash of secret
3. **Create pubkyauth:// URL** - Include relay and capabilities
4. **Display QR Code** - User scans with mobile app
5. **Poll Relay** - Wait for encrypted auth token
6. **Decrypt Token** - Use client secret
7. **Extract Credentials** - Parse pubky ID and capabilities
8. **Create Session** - Store locally

### Data Models

**Drawing:**
```typescript
{
  id: string;          // Unique identifier
  url: string;         // Page URL
  canvasData: string;  // Base64 PNG image
  timestamp: number;   // Creation time
  author: string;      // Pubky ID
  pubkyUrl?: string;   // Homeserver URL
}
```

**Annotation:**
```typescript
{
  id: string;
  url: string;
  selectedText: string;
  comment: string;
  startPath: string;    // DOM path
  endPath: string;
  startOffset: number;
  endOffset: number;
  timestamp: number;
  author: string;
  postUri?: string;
  color: string;
}
```

**Bookmark:**
```typescript
{
  url: string;
  title: string;
  timestamp: number;
  pubkyUrl?: string;
  bookmarkId?: string;
  postUri?: string;
}
```

**Profile:**
```typescript
{
  name: string;
  bio?: string;
  image?: string;      // Avatar URL
  status?: string;     // Status text + emoji
  links?: Array<{
    title: string;
    url: string;
  }>;
}
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Chrome or Edge browser (Chromium-based)
- Pubky Ring mobile app (for authentication)

### Setup for Development

```bash
# Clone repository
git clone https://github.com/yourusername/graphiti.git
cd graphiti

# Install dependencies
npm install

# Development build (with watch mode)
npm run dev

# Production build
npm run build

# Clean build
rm -rf dist && npm run build
```

### Development Workflow

1. **Make changes** to source files
2. **Build** with `npm run build` or `npm run dev`
3. **Reload extension** at `chrome://extensions`
4. **Test** your changes
5. **Check console** (F12) for errors

### Testing

**Automated Tests:**
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

Tests cover:
- Crypto utilities (SHA-256, UTF-16 encoding, Base64URL)
- Storage operations (sessions, bookmarks, tags)
- API integration (Nexus client, Pubky SDK)
- React components (popup, sidepanel)

See [docs/TESTING.md](docs/TESTING.md) for detailed test documentation.

**Manual Testing:**
1. Load extension in Chrome
2. Navigate to test page (e.g., https://example.com)
3. Test each feature:
   - Drawing mode (`Alt+D`)
   - Annotations (select text)
   - Bookmarks (click ☆)
   - Tags (add in popup)
   - Feed (view sidebar)

**Console Debugging:**
- Open DevTools (F12)
- Look for "[Graphiti]" log messages
- Check for errors in red
- Use "🔧 Debug" panel in popup

### Adding New Features

**New Utility:**
1. Create file in `src/utils/`
2. Export functions/classes
3. Import in components
4. Add types in TypeScript

**New Component:**
1. Create in `src/popup/components/` or `src/sidepanel/components/`
2. Use React + TypeScript
3. Style with Tailwind CSS
4. Import and use in parent component

**New Storage:**
1. Add interface to `src/utils/storage.ts`
2. Add CRUD methods
3. Test with Chrome storage inspection

**New Background Handler:**
1. Add message type to `src/background/background.ts`
2. Add handler function
3. Return appropriate response
4. Test with `chrome.runtime.sendMessage`

## 🐛 Troubleshooting

### Drawing Mode Issues

**Problem:** Drawing mode does nothing
- **Solution:** Reload extension → Refresh page → Try again
- Check you're on regular website (not chrome://)
- Open console (F12) and look for errors

**Problem:** Can't see toolbar
- **Solution:** Check z-index conflicts
- Try on simpler page first
- Make sure drawing mode activated successfully

**Problem:** Drawings don't save
- **Solution:** Click "Save & Exit" button
- Don't just close drawing mode
- Check if authenticated for sync

### General Issues

**Extension won't load:**
- Verify you ran `npm run build`
- Check you selected `dist` folder
- Look for errors at `chrome://extensions`
- Try disabling other extensions

**Authentication fails:**
- Ensure Pubky Ring app is installed
- Check internet connection
- Try generating new QR code
- Clear extension data and retry

**Features not syncing:**
- Verify you're signed in
- Check Pubky homeserver is accessible
- Look for sync errors in console
- Check "🔧 Debug" panel for details

**Annotations not appearing:**
- Refresh the page
- Check DOM structure hasn't changed
- Verify annotation was saved (check console)
- Try creating new annotation

### Debug Mode

Enable detailed logging:
1. Open popup
2. Click "🔧 Debug"
3. View all extension activity
4. Filter by context or level
5. Export logs if needed

Look for these log contexts:
- `DrawingManager` - Drawing feature
- `AnnotationManager` - Text annotations
- `Background` - Service worker
- `Storage` - Data persistence
- `PubkyAPISDK` - API calls
- `Auth` - Authentication

## 📝 Known Limitations

1. **Drawing viewport-dependent** - Drawings match viewport size at creation
2. **Chrome/Edge only** - Manifest V3 required
3. **No mobile support** - Desktop browser extension only
4. **Content script required** - Some pages block content scripts
5. **Drawing on scroll disabled** - Prevents misalignment issues

## 🗺️ Roadmap

### Near-Term
- [ ] Eraser tool for drawings
- [ ] Undo/redo for drawings
- [ ] Drawing layers
- [ ] Touch/stylus support
- [ ] Export drawings as images
- [ ] Share drawings with specific users

### Medium-Term
- [ ] Collaborative real-time drawing
- [ ] Drawing templates and stamps
- [ ] Text annotations on drawings
- [ ] Voice note annotations
- [ ] Rich text in annotations
- [ ] Annotation replies/threads

### Long-Term
- [ ] Mobile app version
- [ ] Firefox extension
- [ ] Video annotations
- [ ] AI-powered features
- [ ] Advanced search and filters
- [ ] Analytics dashboard

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly**
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style
- Add TypeScript types
- Test all features
- Update documentation
- Write clear commit messages
- Keep PRs focused and small

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **Pubky Protocol** - Decentralized identity and storage
- **Pubky Team** - For the innovative protocol and SDK
- **Open Source Community** - For amazing tools and libraries

## 📞 Support & Documentation

- **Issues:** [GitHub Issues](https://github.com/BitcoinErrorLog/graphiti/issues)
- **Documentation:** See `/docs` folder for detailed technical documentation
- **Features:** See [FEATURES.md](FEATURES.md) for complete feature documentation
- **Security:** See [SECURITY.md](SECURITY.md) for security information
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- **Changelog:** See [CHANGELOG.md](CHANGELOG.md) for version history
- **Debug:** Use built-in debug panel in extension (click 🔧 in popup)

## 🌟 Star History

If you find Graphiti useful, please star the repository!

---

**Made with ❤️ for the decentralized web**

🎨 Draw freely, annotate wisely, share openly
