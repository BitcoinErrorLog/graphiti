# Graphiti Testing Documentation

This document describes the testing infrastructure and how to run tests for the Graphiti extension.

## Testing Stack

- **Vitest** - Fast, Vite-native test runner
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **jsdom** - Browser environment simulation
- **@vitest/coverage-v8** - Code coverage reporting

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Watch Mode

Vitest runs in watch mode by default. Press `q` to quit or `h` for help.

## Test Structure

Tests are organized alongside the source code in `__tests__` directories:

```
src/
├── utils/
│   ├── __tests__/
│   │   ├── crypto.test.ts      # Crypto utility tests
│   │   ├── storage.test.ts     # Storage tests
│   │   ├── tag-colors.test.ts  # Tag color tests
│   │   ├── logger.test.ts      # Logger tests
│   │   └── api.integration.test.ts  # API integration tests
├── popup/
│   └── __tests__/
│       └── App.integration.test.tsx  # Popup component tests
└── sidepanel/
    └── __tests__/
        └── App.integration.test.tsx  # Sidepanel component tests
```

## Test Categories

### Unit Tests

Unit tests verify individual functions in isolation.

#### Crypto Tests (`crypto.test.ts`)

Tests cryptographic functions including:
- `hexToBytes` / `bytesToHex` - Hex conversion
- `sha256` - SHA-256 hashing
- `base64UrlEncode` / `base64UrlDecode` - Base64URL encoding
- `generateUrlHashTag` - **UTF-16 URL hash tag generation**
- `decryptAuthToken` - XOR decryption
- `parseAuthToken` - Auth token parsing

**Key test: UTF-16 encoding verification**

```typescript
it('should generate a 10-character hash tag', async () => {
  const url = 'https://example.com';
  const result = await generateUrlHashTag(url);
  expect(result.length).toBe(10);
});
```

#### Storage Tests (`storage.test.ts`)

Tests the Storage singleton:
- Session CRUD operations
- Bookmark operations
- Tag operations with normalization
- Profile caching with TTL
- Drawing storage

#### Tag Colors Tests (`tag-colors.test.ts`)

Tests consistent tag coloring:
- Deterministic color assignment
- Hash distribution across color palette
- Style generation

### Integration Tests

Integration tests verify component interactions.

#### API Integration Tests (`api.integration.test.ts`)

Tests API layer with mocked network:
- NexusClient queries
- PubkyAPISDK operations
- Post creation and deletion
- URL hash tag usage

#### Component Integration Tests

Tests React components:
- Authentication flow
- Bookmark actions
- Post creation
- Navigation between views

## Mocking

### Chrome APIs

Chrome extension APIs are mocked in `src/test/setup.ts`:

```typescript
(globalThis as any).chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  tabs: mockChromeTabs,
  sidePanel: mockChromeSidePanel,
};
```

### External Dependencies

External dependencies are mocked with Vitest:

```typescript
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
```

## Coverage

Coverage thresholds are configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    statements: 60,
    branches: 50,
    functions: 60,
    lines: 60,
  },
}
```

Run with coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Utilities

### Setup File (`src/test/setup.ts`)

Runs before all tests to:
- Configure jest-dom matchers
- Set up Chrome API mocks
- Initialize crypto.subtle for Node.js

### Chrome Mocks (`src/test/mocks/chrome.ts`)

Provides:
- `mockStorage` - Chrome storage mock
- `mockRuntime` - Runtime mock
- `mockTabs` - Tabs API mock
- `setupStorageMock(data)` - Helper to set initial storage state

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

it('should render component', async () => {
  render(<MyComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Debugging Tests

### Run Specific Test File

```bash
npx vitest src/utils/__tests__/crypto.test.ts
```

### Run Tests Matching Pattern

```bash
npx vitest -t "should generate"
```

### Debug Mode

```bash
npx vitest --inspect-brk
```

## Continuous Integration

Tests can be run in CI with:

```bash
npm test -- --run
```

This exits after running all tests (non-watch mode).

