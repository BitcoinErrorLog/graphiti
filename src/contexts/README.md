# Session Context

This directory contains React context providers for managing application state.

## SessionContext

The `SessionContext` provides session management and authentication state throughout the React component tree.

### Usage

```tsx
import { SessionProvider, useSession } from './SessionContext';

// Wrap your app with the provider
function App() {
  return (
    <SessionProvider>
      <YourComponents />
    </SessionProvider>
  );
}

// Use the session in any component
function MyComponent() {
  const { session, loading, signOut, refreshSession } = useSession();
  
  if (loading) return <Loading />;
  if (!session) return <LoginPrompt />;
  
  return <div>Welcome, {session.pubky}!</div>;
}
```

### API

**SessionProvider Props:**
- `children: ReactNode` - Child components

**useSession Hook Returns:**
- `session: Session | null` - Current session data (null if not authenticated)
- `loading: boolean` - Whether session is being loaded
- `setSession: (session: Session | null) => void` - Manually set session
- `signOut: () => Promise<void>` - Sign out and clear session
- `refreshSession: () => Promise<Session | null>` - Refresh session from storage

### Session Data Structure

```typescript
interface Session {
  pubky: string;           // User's Pubky ID (public key)
  homeserver: string;      // Homeserver URL
  sessionId: string;       // Unique session identifier
  capabilities: string[];   // Granted capabilities (e.g., ["read", "write"])
  timestamp: number;        // Session creation timestamp
}
```

### Features

- Automatic session loading on mount
- Session persistence via Chrome storage
- Error handling with logging
- Type-safe with TypeScript

### See Also

- [Storage Utils](../utils/README.md) - Session storage implementation
- [Auth SDK](../utils/auth-sdk.ts) - Authentication logic

