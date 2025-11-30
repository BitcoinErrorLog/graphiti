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

## See Also

- [Root README](../README.md) - Getting started
- [FEATURES.md](../FEATURES.md) - Feature documentation
- [docs/](../docs/) - Technical documentation

