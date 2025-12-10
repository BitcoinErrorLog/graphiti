# Contributing to Graphiti

Thank you for your interest in contributing to Graphiti! This document provides guidelines and conventions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guide](#code-style-guide)
- [TypeScript Conventions](#typescript-conventions)
- [React Patterns](#react-patterns)
- [Testing Requirements](#testing-requirements)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Submit a pull request

---

## Development Setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test

# Development mode with watch
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for available environment variables.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

---

## Code Style Guide

### General Principles

- Write clear, self-documenting code
- Prefer readability over cleverness
- Keep functions small and focused (< 50 lines)
- Use meaningful variable and function names

### File Organization

```
src/
├── background/     # Service worker (no DOM access)
├── content/        # Content scripts (page injection)
├── popup/          # Extension popup UI
├── sidepanel/      # Side panel feed UI
├── utils/          # Shared utilities
└── test/           # Test setup and mocks
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `nexus-client.ts` |
| Components | PascalCase | `PostCard.tsx` |
| Functions | camelCase | `generateUrlHashTag()` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Interfaces | PascalCase | `NexusPost` |
| Type aliases | PascalCase | `LogLevel` |

---

## TypeScript Conventions

### Strict Mode

The project uses TypeScript strict mode. All code must pass type checking.

```bash
npm run build  # Includes tsc type checking
```

### Type Definitions

```typescript
// ✅ Good: Explicit interface
interface UserProfile {
  name: string;
  bio?: string;
  image?: string;
}

// ❌ Avoid: Inline object types for complex structures
function updateProfile(profile: { name: string; bio?: string }) { }

// ✅ Good: Use interface instead
function updateProfile(profile: UserProfile) { }
```

### Avoid `any`

```typescript
// ❌ Avoid
function processData(data: any) { }

// ✅ Better: Use generics or unknown
function processData<T>(data: T) { }
function processData(data: unknown) { }

// ✅ Acceptable in test mocks only
const mockLogger: any = { debug: vi.fn() };
```

### Async/Await

```typescript
// ✅ Good: async/await for readability
async function fetchPosts(): Promise<Post[]> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    logger.error('API', 'Failed to fetch', error as Error);
    throw error;
  }
}

// ❌ Avoid: .then() chains
function fetchPosts(): Promise<Post[]> {
  return fetch(url)
    .then(r => r.json())
    .catch(e => { throw e; });
}
```

---

## React Patterns

### Functional Components

```typescript
// ✅ Good: Functional component with TypeScript
interface PostCardProps {
  post: NexusPost;
  onSelect?: (id: string) => void;
}

function PostCard({ post, onSelect }: PostCardProps) {
  return (
    <div onClick={() => onSelect?.(post.id)}>
      {post.content}
    </div>
  );
}

export default PostCard;
```

### Hooks

```typescript
// ✅ Good: Proper useEffect with cleanup
useEffect(() => {
  const handler = (msg: Message) => { /* ... */ };
  chrome.runtime.onMessage.addListener(handler);
  
  return () => {
    chrome.runtime.onMessage.removeListener(handler);
  };
}, []); // Empty deps = mount/unmount only

// ✅ Good: Dependencies listed
useEffect(() => {
  loadPosts();
}, [currentUrl, session]); // Re-run when these change
```

### State Management

```typescript
// ✅ Good: Local state for component-specific data
const [loading, setLoading] = useState(false);
const [posts, setPosts] = useState<Post[]>([]);

// ✅ Good: Lift state for shared data
// Parent passes down via props or context
```

---

## Testing Requirements

### Test Coverage

All new code should include tests:

| Type | Location | Required For |
|------|----------|--------------|
| Unit tests | `__tests__/*.test.ts` | Utility functions |
| Integration tests | `__tests__/*.integration.test.ts` | API clients |
| Component tests | `__tests__/*.test.tsx` | React components |

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('generateUrlHashTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate deterministic hash for same URL', async () => {
    const url = 'https://example.com';
    const hash1 = await generateUrlHashTag(url);
    const hash2 = await generateUrlHashTag(url);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(10);
  });

  it('should handle errors gracefully', async () => {
    await expect(generateUrlHashTag('')).resolves.toBeDefined();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- crypto.test.ts

# Watch mode
npm test -- --watch
```

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding/updating tests |
| `chore` | Build, deps, tooling |

### Examples

```bash
feat(annotations): add highlight color picker

fix(auth): handle token expiry gracefully

docs(api): add usage examples to API reference

test(crypto): add edge case tests for UTF-16 encoding

refactor(content): extract DrawingManager to separate file
```

---

## Pull Request Process

### Before Submitting

1. **Tests pass**: `npm test`
2. **Build succeeds**: `npm run build`
3. **Code formatted**: Follow style guide
4. **Documentation updated**: If adding features
5. **CHANGELOG updated**: For user-facing changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG updated
```

### Review Process

1. Submit PR against `main` branch
2. Automated tests run via CI
3. Maintainer reviews code
4. Address feedback if needed
5. Squash merge when approved

---

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- General questions

Thank you for contributing! 🎉

