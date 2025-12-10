# Test Setup and Mocks

This directory contains test configuration and mock implementations for the Graphiti extension.

## Files

### `setup.ts`

Vitest setup file that runs before all tests. Configures:

- **Jest DOM matchers** - Custom DOM assertions via `@testing-library/jest-dom`
- **Chrome API mocks** - Mock implementations of Chrome extension APIs
- **Crypto polyfill** - Provides `crypto.subtle` for Node.js environment
- **Global mocks** - Window.alert and other browser APIs

### `mocks/chrome.ts`

Reusable Chrome extension API mocks for testing:

- `mockStorage` - Chrome storage API mock
- `mockRuntime` - Chrome runtime API mock
- `mockTabs` - Chrome tabs API mock
- `mockSidePanel` - Chrome side panel API mock
- `mockCommands` - Chrome commands API mock
- `mockAction` - Chrome action API mock

**Helper Functions:**
- `resetChromeMocks()` - Reset all mocks to initial state
- `setupStorageMock(data)` - Configure storage mock with initial data

## Usage

### In Test Files

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupStorageMock, resetChromeMocks } from '../test/mocks/chrome';

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

### Mock Configuration

The setup file automatically configures:
- Chrome APIs available as `globalThis.chrome`
- Crypto APIs for Node.js environment
- All mocks reset before each test

## Testing Patterns

### Testing with Storage

```typescript
import { setupStorageMock } from '../test/mocks/chrome';

it('should load session from storage', async () => {
  setupStorageMock({
    session: { pubky: 'test-id', homeserver: 'https://example.com' }
  });
  
  const session = await storage.getSession();
  expect(session).toBeDefined();
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

## See Also

- [Testing Documentation](../../docs/TESTING.md) - Complete testing guide
- [Vitest Config](../../vitest.config.ts) - Test configuration

