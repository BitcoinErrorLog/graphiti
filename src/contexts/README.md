# React Contexts

React context providers for managing shared application state across the extension UI components.

## Overview

Contexts provide global state management without requiring a full state management library. They're used in both the popup and sidepanel React applications.

## Contexts

### SessionContext

Manages authentication state and session data throughout the application.

**Purpose:**
- Provide current session to all components
- Handle session loading and persistence
- Manage sign-out functionality
- Refresh session data

**Usage:**
```tsx
import { SessionProvider, useSession } from './SessionContext';

// Wrap your app
function App() {
  return (
    <SessionProvider>
      <YourComponents />
    </SessionProvider>
  );
}

// Use in any component
function MyComponent() {
  const { session, loading, signOut, refreshSession } = useSession();
  
  if (loading) return <Loading />;
  if (!session) return <LoginPrompt />;
  
  return <div>Welcome, {session.pubky}!</div>;
}
```

**API:**

**SessionProvider Props:**
- `children: ReactNode` - Child components to wrap

**useSession Hook Returns:**
- `session: Session | null` - Current session data (null if not authenticated)
- `loading: boolean` - Whether session is being loaded from storage
- `setSession: (session: Session | null) => void` - Manually set session
- `signOut: () => Promise<void>` - Sign out and clear session
- `refreshSession: () => Promise<Session | null>` - Refresh session from storage

**Session Data Structure:**
```typescript
interface Session {
  pubky: string;           // User's Pubky ID (public key, z32 encoded)
  homeserver: string;      // Homeserver URL (derived from pubky)
  sessionId: string;       // Unique session identifier
  capabilities: string[];   // Granted capabilities (e.g., ["read", "write"])
  timestamp: number;        // Session creation timestamp
}
```

**Features:**
- Automatic session loading on mount
- Session persistence via Chrome storage
- Error handling with logging
- Type-safe with TypeScript
- Prevents unnecessary re-renders

**Storage:**
Sessions are stored in Chrome storage under the key `session`. The context automatically:
- Loads session on mount
- Saves session when it changes
- Clears session on sign out

### ThemeContext

Manages theme state (light/dark mode) across the application.

**Purpose:**
- Provide current theme to all components
- Toggle between light and dark themes
- Persist theme preference

**Usage:**
```tsx
import { ThemeProvider, useTheme } from './ThemeContext';

// Wrap your app
function App() {
  return (
    <ThemeProvider>
      <YourComponents />
    </ThemeProvider>
  );
}

// Use in any component
function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
}
```

**API:**

**ThemeProvider Props:**
- `children: ReactNode` - Child components to wrap

**useTheme Hook Returns:**
- `theme: 'light' | 'dark'` - Current theme
- `toggleTheme: () => void` - Toggle between light and dark

**Features:**
- Theme persistence in Chrome storage
- Automatic theme loading on mount
- System preference detection (future)
- CSS class management

**Storage:**
Theme preference is stored in Chrome storage under the key `theme`.

## Context Architecture

```
App Root
├── ThemeProvider
│   └── SessionProvider
│       └── Your Components
│           └── Can use both useSession() and useTheme()
```

## Best Practices

1. **Wrap at Root:** Always wrap contexts at the root of your component tree
2. **Don't Overuse:** Only use contexts for truly global state
3. **Type Safety:** Always use TypeScript for context values
4. **Error Handling:** Handle loading and error states
5. **Performance:** Use React.memo for components that consume context

## Testing

Contexts are tested by:
- Testing provider components
- Testing hook usage
- Testing state persistence
- Testing error cases

**Example Test:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext';

it('should provide session', () => {
  const { result } = renderHook(() => useSession(), {
    wrapper: SessionProvider,
  });
  
  expect(result.current.session).toBeDefined();
});
```

## See Also

- [Storage Utils](../utils/storage.ts) - Session storage implementation
- [Auth SDK](../utils/auth-sdk.ts) - Authentication logic
- [React Context Docs](https://react.dev/reference/react/createContext)
