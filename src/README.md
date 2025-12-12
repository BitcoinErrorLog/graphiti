# Graphiti Source Code

This directory contains the source code for the Graphiti Chrome Extension.

## Directory Structure

```
src/
├── background/     # Service worker (background script)
├── content/        # Content scripts (injected into web pages)
├── popup/          # Extension popup UI
├── sidepanel/      # Side panel feed UI
├── profile/        # Profile rendering pages
├── styles/         # Global CSS styles
├── utils/          # Shared utility modules
└── test/           # Test setup and mocks
```

## Module Relationships

```
┌─────────────────────────────────────────────────────────┐
│                     Background                           │
│              (Service Worker - background.ts)            │
│  - Handles keyboard shortcuts                            │
│  - Manages side panel                                    │
│  - Coordinates message passing                           │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┬─────────────────┐
    ▼                           ▼                 ▼
┌──────────┐             ┌──────────────┐   ┌──────────────┐
│  Popup   │             │   Content    │   │  Sidepanel   │
│          │             │              │   │              │
│ - Auth   │             │ - Drawings   │   │ - Feed       │
│ - Quick  │◄───────────►│ - Annotate   │◄─►│ - Posts      │
│   actions│  messaging  │ - Pubky URLs │   │ - Annotate   │
└────┬─────┘             └──────────────┘   └──────────────┘
     │
     └────────────────────────┐
                              ▼
                    ┌──────────────────┐
                    │      Utils       │
                    │                  │
                    │ - storage.ts     │
                    │ - crypto.ts      │
                    │ - pubky-api.ts   │
                    │ - logger.ts      │
                    └──────────────────┘
```

## Build Output

After running `npm run build`, compiled files are in `dist/`:

- `background.js` - Service worker
- `content.js` - Content script
- `popup.html` + assets
- `sidepanel.html` + assets

## Key Entry Points

| Entry Point | Source | Purpose |
|-------------|--------|---------|
| Background | `background/background.ts` | Extension lifecycle, messaging |
| Content | `content/content.ts` | Page injection, drawing, annotations |
| Popup | `popup/main.tsx` | Extension popup React app |
| Sidepanel | `sidepanel/main.tsx` | Feed viewer React app |

## Entry Points

| Entry Point | Source File | Purpose |
|-------------|-------------|---------|
| Background | `background/background.ts` | Service worker, extension lifecycle |
| Content | `content/content.ts` | Page injection, drawing, annotations |
| Popup | `popup/main.tsx` | Extension popup React app |
| Sidepanel | `sidepanel/main.tsx` | Feed viewer React app |
| Profile | `profile/profile-renderer.ts` | Profile page renderer |
| Offscreen | `offscreen/offscreen.ts` | Offscreen document for SDK |

## Build Output

After running `npm run build`, compiled files are in `dist/`:

- `background.js` - Service worker
- `content.js` - Content script
- `popup.html` + assets - Popup UI
- `sidepanel.html` + assets - Side panel UI
- `src/profile/profile-renderer.html` - Profile renderer
- `src/offscreen/offscreen.js` - Offscreen document

## Development

### Adding New Features

**New Utility:**
1. Create file in `utils/`
2. Export functions/classes
3. Add TypeScript types
4. Write tests in `utils/__tests__/`

**New Component:**
1. Create in `popup/components/` or `sidepanel/components/`
2. Use React + TypeScript
3. Style with Tailwind CSS
4. Import and use in parent component

**New Content Script Feature:**
1. Create manager class in `content/`
2. Initialize in `content.ts`
3. Handle messages from background
4. Use inline styles to avoid conflicts

## Testing

Tests are located in `__tests__/` directories:
- Unit tests for utilities
- Integration tests for API clients
- Component tests for React components

Run tests with:
```bash
npm test
```

## See Also

- [Root README](../README.md) - Getting started
- [FEATURES.md](../FEATURES.md) - Feature documentation
- [docs/](../docs/) - Technical documentation
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

