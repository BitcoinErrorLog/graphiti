/**
 * Popup App Integration Tests
 * 
 * Tests for the main popup component including:
 * - Authentication flow
 * - Bookmark actions
 * - Post/tag creation
 * - View navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all dependencies
vi.mock('../../utils/auth-sdk', () => ({
  authManagerSDK: {
    getSession: vi.fn(),
    signOut: vi.fn(),
    createAuthRequest: vi.fn(),
    pollForAuth: vi.fn(),
  },
}));

vi.mock('../../utils/storage', () => ({
  storage: {
    getSession: vi.fn(),
    getBookmark: vi.fn(),
    saveBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    saveTags: vi.fn(),
  },
  Session: {},
  StoredBookmark: {},
}));

vi.mock('../../utils/pubky-api-sdk', () => ({
  pubkyAPISDK: {
    createBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    createLinkPost: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockResolvedValue([]),
    clearLogs: vi.fn().mockResolvedValue(undefined),
    exportLogs: vi.fn().mockResolvedValue('[]'),
  },
}));

vi.mock('../../utils/drawing-sync', () => ({
  DrawingSync: {
    syncPendingDrawings: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Chrome APIs
const mockTabData = [{ id: 123, url: 'https://example.com', title: 'Example Site' }];
const mockTabs = {
  query: vi.fn((_options: unknown, callback?: (tabs: typeof mockTabData) => void) => {
    // Support both callback and promise styles
    if (callback) {
      callback(mockTabData);
    }
    return Promise.resolve(mockTabData);
  }),
  sendMessage: vi.fn(),
};

const mockRuntime = {
  sendMessage: vi.fn(),
};

const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
};

const mockSidePanel = {
  open: vi.fn(),
};

(globalThis as any).chrome = {
  tabs: mockTabs,
  runtime: mockRuntime,
  storage: mockStorage,
  sidePanel: mockSidePanel,
};

// Mock alert
const originalAlert = globalThis.alert;
globalThis.alert = vi.fn();

describe('Popup App Integration', () => {
  let App: any;
  let authManagerSDK: any;
  let storage: any;
  let pubkyAPISDK: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset modules to get fresh instances
    vi.resetModules();
    
    const authModule = await import('../../utils/auth-sdk');
    authManagerSDK = authModule.authManagerSDK;
    
    const storageModule = await import('../../utils/storage');
    storage = storageModule.storage;
    
    const apiModule = await import('../../utils/pubky-api-sdk');
    pubkyAPISDK = apiModule.pubkyAPISDK;
    
    const AppModule = await import('../App');
    App = AppModule.default;
  });

  const renderPopup = async () => {
    const { SessionProvider } = await import('../../contexts/SessionContext');
    await act(async () => {
      render(
        <SessionProvider>
          <App />
        </SessionProvider>
      );
    });
  };

  afterEach(() => {
    globalThis.alert = originalAlert;
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      vi.mocked(authManagerSDK.getSession).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      await renderPopup();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(null);
    });

    it('should show auth view when not logged in', async () => {
          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show sign in option - use queryAllByText since there may be multiple elements
      const signInElements = screen.queryAllByText(/Sign In/i);
      expect(signInElements.length).toBeGreaterThan(0);
    });
  });

  describe('Authenticated State', () => {
    const mockSession = {
      pubky: 'testpubky123',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    beforeEach(() => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.getBookmark).mockResolvedValue(null);
    });

    it('should show main view when logged in', async () => {
          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show user info
      expect(screen.getByText(/testpubky/i)).toBeInTheDocument();
    });

    it('should show current URL', async () => {
          await renderPopup();

      await waitFor(() => {
        expect(screen.getByText(/example\.com/i)).toBeInTheDocument();
      });
    });

    it('should show debug button', async () => {
        await renderPopup();

      await waitFor(() => {
        expect(screen.getByText(/Debug/i)).toBeInTheDocument();
      });
    });

    it('should toggle debug panel', async () => {
          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const debugButton = screen.getByText(/Debug/i);
      fireEvent.click(debugButton);

      // Debug panel should be visible (look for export or clear buttons)
      await waitFor(() => {
        expect(screen.getByText(/Hide/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bookmark Actions', () => {
    const mockSession = {
      pubky: 'testpubky123',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    beforeEach(() => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
    });

    it('should create bookmark when not bookmarked', async () => {
      vi.mocked(storage.getBookmark).mockResolvedValue(null);
      vi.mocked(pubkyAPISDK.createBookmark).mockResolvedValue({
        fullPath: 'pubky://test/bookmarks/123',
        bookmarkId: '123',
        postUri: 'pubky://test/posts/456',
      });

          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find and click bookmark button
      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      if (bookmarkButton) {
        fireEvent.click(bookmarkButton);

        await waitFor(() => {
          expect(pubkyAPISDK.createBookmark).toHaveBeenCalledWith('https://example.com');
        });
      }
    });

    it('should remove bookmark when already bookmarked', async () => {
      const existingBookmark = {
        url: 'https://example.com',
        title: 'Example',
        timestamp: Date.now(),
        postUri: 'pubky://test/posts/456',
      };
      
      vi.mocked(storage.getBookmark).mockResolvedValue(existingBookmark);
      vi.mocked(pubkyAPISDK.deleteBookmark).mockResolvedValue(undefined);
      vi.mocked(storage.removeBookmark).mockResolvedValue(undefined);

          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find bookmark button (might show as "Bookmarked" or have filled star)
      const buttons = screen.getAllByRole('button');
      const bookmarkButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('bookmark') ||
        btn.textContent?.includes('⭐')
      );
      
      if (bookmarkButton) {
        fireEvent.click(bookmarkButton);

        await waitFor(() => {
          expect(pubkyAPISDK.deleteBookmark).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Sign Out', () => {
    const mockSession = {
      pubky: 'testpubky123',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    it('should sign out when clicking sign out button', async () => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
      vi.mocked(authManagerSDK.signOut).mockResolvedValue(undefined);
      vi.mocked(storage.getBookmark).mockResolvedValue(null);

          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find sign out button
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      if (signOutButton) {
        fireEvent.click(signOutButton);

        await waitFor(() => {
          expect(authManagerSDK.signOut).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Profile Editor Navigation', () => {
    const mockSession = {
      pubky: 'testpubky123',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    beforeEach(() => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.getBookmark).mockResolvedValue(null);
    });

    it('should navigate to profile editor', async () => {
          await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find edit profile button
      const editButton = screen.queryByRole('button', { name: /edit profile/i });
      if (editButton) {
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByText(/back/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Side Panel', () => {
    const mockSession = {
      pubky: 'testpubky123',
      homeserver: 'https://homeserver.example.com',
      sessionId: 'session123',
      capabilities: ['read', 'write'],
      timestamp: Date.now(),
    };

    beforeEach(() => {
      vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.getBookmark).mockResolvedValue(null);
    });

    it('should send message to open side panel', async () => {
      await renderPopup();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find side panel button (View Feed button)
      const sidePanelButton = screen.queryByRole('button', { name: /feed|side/i });
      if (sidePanelButton) {
        fireEvent.click(sidePanelButton);

        await waitFor(() => {
          // Now opens side panel directly instead of sending message
          expect(mockTabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
          expect(mockSidePanel.open).toHaveBeenCalledWith({ tabId: 123 });
        });
      }
    });
  });
});

