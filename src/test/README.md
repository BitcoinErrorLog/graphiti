# Test Setup and Mocks

Test configuration, setup files, and mock implementations for the Graphiti extension test suite.

## Overview

This directory contains the test infrastructure that enables unit and integration testing of the extension. It provides Chrome API mocks, test utilities, and configuration.

## Files

| File | Purpose |
|------|---------|
| `setup.ts` | Vitest setup file that runs before all tests |
| `mocks/chrome.ts` | Reusable Chrome extension API mocks |

## Setup File (`setup.ts`)

Runs before all tests and configures the test environment.

### Configuration

**Jest DOM Matchers:**
```typescript
import '@testing-library/jest-dom';
```
Provides custom DOM assertions like `toBeInTheDocument()`, `toHaveTextContent()`, etc.

**Chrome API Mocks:**
```typescript
import { setupChromeMocks } from './mocks/chrome';
setupChromeMocks();
```
Makes Chrome extension APIs available in the test environment.

**Crypto Polyfill:**
```typescript
// Provides crypto.subtle for Node.js environment
globalThis.crypto = crypto as any;
```

**Global Mocks:**
- `window.alert` - Mocked to prevent test interruptions
- Other browser APIs as needed

## Chrome Mocks (`mocks/chrome.ts`)

Comprehensive mocks for Chrome extension APIs.

### Available Mocks

**Storage API:**
```typescript
import { mockStorage, setupStorageMock } from './mocks/chrome';

// Setup with initial data
setupStorageMock({
  session: { pubky: 'test-id', homeserver: 'https://example.com' },
  bookmarks: { 'https://example.com': { url: '...', title: '...' } }
});

// Access mock
const stored = await mockStorage.local.get('session');
```

**Runtime API:**
```typescript
import { mockRuntime } from './mocks/chrome';

// Mock sendMessage
mockRuntime.sendMessage.mockImplementation((msg, callback) => {
  callback({ success: true });
});

// Mock onMessage
mockRuntime.onMessage.addListener((handler) => {
  handler({ type: 'TEST' }, {}, () => {});
});
```

**Tabs API:**
```typescript
import { mockTabs } from './mocks/chrome';

// Mock query
mockTabs.query.mockImplementation((query, callback) => {
  callback([{ id: 1, url: 'https://example.com' }]);
});
```

**Side Panel API:**
```typescript
import { mockSidePanel } from './mocks/chrome';

// Mock setOptions
mockSidePanel.setOptions.mockImplementation((options, callback) => {
  callback();
});
```

**Commands API:**
```typescript
import { mockCommands } from './mocks/chrome';

// Mock onCommand
mockCommands.onCommand.addListener((handler) => {
  handler('toggle-drawing');
});
```

**Action API:**
```typescript
import { mockAction } from './mocks/chrome';

// Mock setIcon, setBadgeText, etc.
mockAction.setIcon.mockImplementation((details, callback) => {
  callback();
});
```

### Helper Functions

**Reset All Mocks:**
```typescript
import { resetChromeMocks } from './mocks/chrome';

beforeEach(() => {
  resetChromeMocks();
});
```

**Setup Storage with Data:**
```typescript
import { setupStorageMock } from './mocks/chrome';

beforeEach(() => {
  setupStorageMock({
    session: mockSession,
    bookmarks: mockBookmarks,
  });
});
```

## Usage in Tests

### Basic Test Setup

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetChromeMocks, setupStorageMock } from '../test/mocks/chrome';

describe('MyComponent', () => {
  beforeEach(() => {
    resetChromeMocks();
    setupStorageMock({ session: mockSession });
  });

  it('should work', () => {
    // Your test code
  });
});
```

### Testing with Storage

```typescript
import { setupStorageMock } from '../test/mocks/chrome';
import { storage } from '../utils/storage';

it('should load session from storage', async () => {
  setupStorageMock({
    session: { pubky: 'test-id', homeserver: 'https://example.com' }
  });
  
  const session = await storage.getSession();
  expect(session).toBeDefined();
  expect(session?.pubky).toBe('test-id');
});
```

### Testing Chrome Messages

```typescript
import { mockRuntime } from '../test/mocks/chrome';

it('should send message', async () => {
  await sendMessage({ type: 'TEST' });
  
  expect(mockRuntime.sendMessage).toHaveBeenCalledWith(
    { type: 'TEST' },
    expect.any(Function)
  );
});
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import { SessionProvider } from '../contexts/SessionContext';
import { ThemeProvider } from '../contexts/ThemeContext';

it('should render component', () => {
  render(
    <ThemeProvider>
      <SessionProvider>
        <MyComponent />
      </SessionProvider>
    </ThemeProvider>
  );
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Test Patterns

### Mocking Async Operations

```typescript
import { vi } from 'vitest';

it('should handle async operation', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' })
  });
  
  global.fetch = mockFetch;
  
  const result = await myFunction();
  expect(result).toBe('test');
});
```

### Testing Error Cases

```typescript
it('should handle errors', async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
  global.fetch = mockFetch;
  
  await expect(myFunction()).rejects.toThrow('Network error');
});
```

## Test Configuration

Tests are configured in `vitest.config.ts`:
- Test environment: `jsdom` (for DOM APIs)
- Coverage provider: `v8`
- Test file patterns: `**/*.{test,spec}.{ts,tsx}`

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run specific test file
npm test -- crypto.test.ts

# Watch mode
npm test -- --watch
```

## Best Practices

1. **Reset Mocks** - Always reset mocks in `beforeEach`
2. **Isolate Tests** - Each test should be independent
3. **Mock External APIs** - Don't make real network calls
4. **Test Edge Cases** - Test error conditions and boundaries
5. **Use TypeScript** - Type your mocks and test data

## See Also

- [Testing Documentation](../../docs/TESTING.md) - Complete testing guide
- [Vitest Config](../../vitest.config.ts) - Test configuration
- [Testing Library Docs](https://testing-library.com/) - React testing utilities
