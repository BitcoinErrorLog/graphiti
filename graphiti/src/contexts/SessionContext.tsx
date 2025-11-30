import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authManagerSDK } from '../utils/auth-sdk';
import { Session } from '../utils/storage';
import { logger } from '../utils/logger';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages session state and authentication.
 * Wrap your app with this to access session throughout the component tree.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshSession();
  }, []);

  const refreshSession = async (): Promise<void> => {
    try {
      setLoading(true);
      const existingSession = await authManagerSDK.getSession();
      setSession(existingSession);
      logger.debug('SessionContext', 'Session refreshed', { 
        hasSession: !!existingSession 
      });
    } catch (error) {
      logger.error('SessionContext', 'Failed to refresh session', error as Error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await authManagerSDK.signOut();
      setSession(null);
      logger.info('SessionContext', 'Signed out successfully');
    } catch (error) {
      logger.error('SessionContext', 'Failed to sign out', error as Error);
      throw error;
    }
  };

  const value: SessionContextType = {
    session,
    loading,
    setSession,
    signOut,
    refreshSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context.
 * Must be used within a SessionProvider.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { session, loading, signOut } = useSession();
 *   
 *   if (loading) return <Loading />;
 *   if (!session) return <LoginPrompt />;
 *   
 *   return <div>Welcome, {session.pubky}!</div>;
 * }
 * ```
 */
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

