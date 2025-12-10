# Detailed Contribution Guide

This guide provides step-by-step instructions for contributing to the Graphiti Chrome Extension.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style](#code-style)
4. [Testing](#testing)
5. [Submitting Changes](#submitting-changes)
6. [Code Review Process](#code-review-process)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome or Edge browser (Chromium-based)
- Git
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/graphiti.git
   cd graphiti
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/originalowner/graphiti.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Extension

```bash
# Development build (with watch mode)
npm run dev

# Production build
npm run build
```

### Load Extension in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder
5. Extension should appear in your toolbar

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Build** with `npm run build` or `npm run dev` (watch mode)
3. **Reload extension** at `chrome://extensions` (click reload icon)
4. **Test** your changes
5. **Check console** (F12) for errors

## Code Style

### TypeScript

- Use **strict mode** (enabled in tsconfig.json)
- Prefer **interfaces** over types for object shapes
- Use **type guards** instead of type assertions
- Avoid `any` - use `unknown` and type guards instead

### Naming Conventions

- **Files**: kebab-case (e.g., `annotation-manager.ts`)
- **Classes**: PascalCase (e.g., `AnnotationManager`)
- **Functions/Variables**: camelCase (e.g., `handleAnnotation`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MESSAGE_TYPES`)
- **Components**: PascalCase (e.g., `MainView.tsx`)

### Code Organization

```
src/
├── background/     # Service worker
├── content/        # Content scripts
├── popup/          # Popup UI
├── sidepanel/      # Side panel UI
├── utils/          # Shared utilities
└── styles/         # Global styles
```

### Best Practices

1. **Single Responsibility**: Each function/class should do one thing
2. **DRY**: Don't Repeat Yourself - extract common patterns
3. **Error Handling**: Use centralized ErrorHandler
4. **Logging**: Use logger utility, not console.log
5. **Validation**: Use centralized validation utilities
6. **Constants**: Extract magic numbers to constants.ts

### Example: Adding a New Feature

```typescript
// 1. Create utility function (if needed)
// src/utils/my-feature.ts
export function myFeatureFunction(input: string): string {
  // Implementation
}

// 2. Add constants
// src/utils/constants.ts
export const MY_FEATURE_CONSTANTS = {
  MAX_LENGTH: 100,
} as const;

// 3. Add validation
// src/utils/validation.ts
export function validateMyFeature(input: string): ValidationResult {
  // Validation logic
}

// 4. Use in component
// src/popup/components/MyFeature.tsx
import { myFeatureFunction } from '../../utils/my-feature';
import { validateMyFeature } from '../../utils/validation';
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run E2E tests
npm run test:e2e
```

### Writing Tests

1. **Unit Tests**: Test individual functions/classes
   - Location: `src/**/__tests__/*.test.ts`
   - Use Vitest testing framework
   - Mock external dependencies

2. **Integration Tests**: Test component interactions
   - Location: `src/**/__tests__/*.integration.test.tsx`
   - Use React Testing Library
   - Test user interactions

3. **E2E Tests**: Test full user flows
   - Location: `e2e/tests/*.spec.ts`
   - Use Playwright
   - Test in real browser

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyFunction } from '../my-function';

describe('MyFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const result = MyFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => MyFunction('invalid')).toThrow();
  });
});
```

### Test Coverage Goals

- **Critical utilities**: > 90% coverage
- **Components**: > 80% coverage
- **Content scripts**: > 70% coverage
- **Background worker**: > 80% coverage

## Submitting Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions/updates

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling

**Examples:**
```
feat(drawing): add eraser tool
fix(annotation): resolve highlight rendering issue
docs(readme): update installation instructions
test(background): add sync operation tests
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm test
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(feature): add my feature"
   ```

5. **Push to Fork**
   ```bash
   git push origin feature/my-feature
   ```

6. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill out PR template
   - Request review

### PR Checklist

Before submitting:

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No linter errors
- [ ] Build succeeds
- [ ] Extension loads without errors
- [ ] Manual testing completed

## Code Review Process

### Review Criteria

1. **Functionality**
   - Does it work as intended?
   - Edge cases handled?
   - Error handling present?

2. **Code Quality**
   - Follows style guidelines?
   - Well-documented?
   - No code duplication?

3. **Testing**
   - Adequate test coverage?
   - Tests are meaningful?
   - Edge cases tested?

4. **Performance**
   - No performance regressions?
   - Efficient algorithms?
   - Proper cleanup?

5. **Security**
   - Input validation?
   - No sensitive data exposed?
   - Secure error messages?

### Review Feedback

- **Requested Changes**: Address feedback and update PR
- **Approved**: Ready to merge (maintainer will merge)
- **Comments**: Discussion points, not blocking

### Addressing Feedback

1. Read all comments carefully
2. Make requested changes
3. Push updates to same branch
4. Comment on resolved discussions
5. Request re-review if needed

## Code Style Guide

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good
interface Props {
  title: string;
  onAction: () => void;
}

function MyComponent({ title, onAction }: Props) {
  return <button onClick={onAction}>{title}</button>;
}

// ❌ Bad
function MyComponent(props: any) {
  return <button onClick={props.onAction}>{props.title}</button>;
}
```

### Error Handling

```typescript
// ✅ Good
try {
  await operation();
} catch (error) {
  ErrorHandler.handle(error, {
    context: 'MyComponent',
    data: { operation: 'save' },
  });
}

// ❌ Bad
try {
  await operation();
} catch (error) {
  console.error(error);
}
```

### Logging

```typescript
// ✅ Good
logger.info('MyComponent', 'Operation completed', { id: '123' });
logger.error('MyComponent', 'Operation failed', error, { context: 'save' });

// ❌ Bad
console.log('Operation completed');
console.error('Error:', error);
```

## Common Patterns

### Adding a New Message Type

1. Add to `src/utils/constants.ts`:
   ```typescript
   export const MESSAGE_TYPES = {
     // ... existing
     MY_NEW_MESSAGE: 'MY_NEW_MESSAGE',
   } as const;
   ```

2. Handle in background:
   ```typescript
   if (message.type === MESSAGE_TYPES.MY_NEW_MESSAGE) {
     // Handle message
     sendResponse({ success: true });
     return true;
   }
   ```

3. Send from component:
   ```typescript
   chrome.runtime.sendMessage({
     type: MESSAGE_TYPES.MY_NEW_MESSAGE,
     data: myData,
   });
   ```

### Adding a New Storage Key

1. Add to `src/utils/constants.ts`:
   ```typescript
   export const STORAGE_CONSTANTS = {
     KEYS: {
       // ... existing
       MY_NEW_KEY: 'my_new_key',
     },
   } as const;
   ```

2. Add methods to `src/utils/storage.ts`:
   ```typescript
   async saveMyData(data: MyData): Promise<void> {
     await chrome.storage.local.set({
       [STORAGE_CONSTANTS.KEYS.MY_NEW_KEY]: data,
     });
   }
   ```

### Adding a New Validation

1. Add to `src/utils/validation.ts`:
   ```typescript
   export function validateMyData(data: string): ValidationResult {
     if (!data || data.length === 0) {
       return { valid: false, error: 'Data is required' };
     }
     return { valid: true, sanitized: data.trim() };
   }
   ```

2. Use in components:
   ```typescript
   const validation = validateMyData(input);
   if (!validation.valid) {
     toastManager.error(validation.error);
     return;
   }
   ```

## Troubleshooting

### Build Errors

1. **TypeScript errors**: Run `npx tsc --noEmit` to see all errors
2. **Missing dependencies**: Run `npm install`
3. **Cache issues**: Delete `node_modules` and `dist`, then reinstall

### Test Failures

1. **Mock issues**: Check test mocks in `src/test/mocks/`
2. **Async issues**: Ensure proper `await` and timeouts
3. **Environment issues**: Check test setup in `src/test/setup.ts`

### Extension Not Loading

1. **Build first**: Run `npm run build`
2. **Check manifest**: Verify `manifest.json` is valid
3. **Check console**: Look for errors in `chrome://extensions`
4. **Reload extension**: Click reload button

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)

## Getting Help

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Code Review**: Ask questions in PR comments

## See Also

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Quick contribution guide
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development environment setup
- [TESTING.md](TESTING.md) - Testing guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
