# Development Guide

This guide covers the development setup, environment configuration, and development workflows for the Graphiti extension.

## Prerequisites

- Node.js 18+ and npm
- Chrome/Chromium browser for testing
- Git

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd graphiti
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Environment Variables

The extension supports environment-based configuration via `.env` files. See `.env.example` for available options.

### Available Variables

- `VITE_NEXUS_API_URL` - Nexus API base URL (default: `https://nexus.pubky.app`)
- `VITE_PUBKY_RELAY_URL` - Pubky relay URL (default: `https://httprelay.pubky.app/link/`)
- `VITE_ENVIRONMENT` - Environment name (`development` | `production` | `test`)
- `VITE_ENABLE_DEBUG_LOGS` - Enable debug logging (`true` | `false`)
- `VITE_LOG_BUFFER_SIZE` - Maximum log buffer size (default: `1000`)

### Using Environment Variables

Environment variables are loaded via Vite's `import.meta.env` and accessed through the config system:

```typescript
import { config } from '../config/config';

const nexusUrl = config.getValue('nexusApiUrl');
const isDev = config.isDevelopment();
```

## Development Workflow

### Watch Mode

Run the build in watch mode for development:

```bash
npm run dev
```

This will rebuild the extension automatically when files change.

### Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Code Quality

- **TypeScript**: Strict mode enabled, all code must pass type checking
- **Linting**: Run `npm run build` to check for TypeScript errors
- **Formatting**: Follow the project's code style (see CONTRIBUTING.md)

## Project Structure

```
graphiti/
├── src/
│   ├── background/      # Service worker
│   ├── content/         # Content scripts
│   ├── popup/           # Popup UI (React)
│   ├── sidepanel/       # Side panel UI (React)
│   ├── offscreen/       # Offscreen document
│   ├── utils/           # Shared utilities
│   └── config/          # Configuration system
├── dist/                # Build output
├── icons/               # Extension icons
├── manifest.json        # Extension manifest
└── vite.config.ts       # Build configuration
```

## Debugging

### Chrome DevTools

1. **Background Script**: Go to `chrome://extensions/` → Click "service worker" link
2. **Popup**: Right-click extension icon → "Inspect popup"
3. **Side Panel**: Right-click in side panel → "Inspect"
4. **Content Script**: Use regular page DevTools (content scripts run in page context)

### Logging

The extension uses a centralized logger (`src/utils/logger.ts`):

```typescript
import { logger } from './utils/logger';

logger.info('MyComponent', 'Operation completed', { data });
logger.error('MyComponent', 'Operation failed', error);
```

Logs are persisted to Chrome storage and can be viewed in the Debug Panel.

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement feature following project patterns
3. Add tests
4. Update documentation
5. Submit PR

### Updating Dependencies

```bash
npm update
npm run build  # Verify build still works
npm test       # Verify tests still pass
```

### Building for Production

```bash
npm run build
```

The production build:
- Enables minification
- Generates source maps
- Creates optimized chunks
- Outputs to `dist/` directory

## Troubleshooting

### Build Errors

- **TypeScript errors**: Run `tsc` to see detailed errors
- **Module not found**: Check import paths and dependencies
- **Chunk errors**: Check `vite.config.ts` manual chunks configuration

### Runtime Errors

- **Extension not loading**: Check `manifest.json` and console for errors
- **Service worker errors**: Check background script console
- **Content script errors**: Check page console (content scripts run in page context)

### Storage Issues

- **Quota exceeded**: Use Storage Manager UI to delete old data
- **Data not persisting**: Check Chrome storage permissions in manifest

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

