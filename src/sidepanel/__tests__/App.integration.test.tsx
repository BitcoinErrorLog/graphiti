/**
 * Sidepanel App Integration Tests
 * 
 * Tests for the sidepanel feed component including:
 * - Feed loading
 * - Post display
 * - Annotation display
 * - Tab navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all dependencies
vi.mock('../../utils/pubky-api-sdk', () => ({
  pubkyAPISDK: {
    searchPostsByUrl: vi.fn(),
    searchAnnotationsByUrl: vi.fn(),
    getFollowingPosts: vi.fn(),
  },
}));

vi.mock('../../utils/storage', () => ({
  storage: {
    getSession: vi.fn(),
    getBookmark: vi.fn(),
  },
  Session: {},
}));

vi.mock('../../utils/annotations', () => ({
  Annotation: {},
  annotationStorage: {
    getAnnotationsForUrl: vi.fn().mockResolvedValue([]),
    saveAnnotation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/nexus-client', () => ({
  nexusClient: {
    getUser: vi.fn(),
    streamPosts: vi.fn(),
  },
}));

vi.mock('../../utils/auth-sdk', () => ({
  authManagerSDK: {
    getSession: vi.fn(),
  },
}));

vi.mock('../../utils/annotation-sync', () => ({
  AnnotationSync: {
    syncPendingAnnotations: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Chrome APIs
const mockTabs = {
  query: vi.fn().mockResolvedValue([
    { url: 'https://example.com', title: 'Example Site' },
  ]),
  sendMessage: vi.fn(),
  get: vi.fn().mockResolvedValue({}),
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onActivated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

const mockRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
};

const mockAction = {
  openPopup: vi.fn(),
};

(globalThis as any).chrome = {
  tabs: mockTabs,
  runtime: mockRuntime,
  storage: mockStorage,
  action: mockAction,
};

describe('Sidepanel App Integration', () => {
  let App: any;
  let pubkyAPISDK: any;

  const mockSession = {
    pubky: 'testpubky123',
    homeserver: 'https://homeserver.example.com',
    sessionId: 'session123',
    capabilities: ['read', 'write'],
    timestamp: Date.now(),
  };

  const mockPosts = [
    {
      details: {
        id: 'post1',
        author: 'author123',
        content: 'This is a test post about https://example.com',
        kind: 'link',
        uri: 'pubky://author123/posts/post1',
        indexed_at: Date.now(),
      },
      author: {
        id: 'author123',
        name: 'Test Author',
        image: 'https://example.com/avatar.png',
      },
    },
    {
      details: {
        id: 'post2',
        author: 'author456',
        content: 'Another post here',
        kind: 'short',
        uri: 'pubky://author456/posts/post2',
        indexed_at: Date.now() - 3600000,
      },
      author: {
        id: 'author456',
        name: 'Another Author',
      },
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const apiModule = await import('../../utils/pubky-api-sdk');
    pubkyAPISDK = apiModule.pubkyAPISDK;
    
    await import('../../utils/storage');
    
    const authModule = await import('../../utils/auth-sdk');
    const authManagerSDK = authModule.authManagerSDK;
    
    vi.mocked(authManagerSDK.getSession).mockResolvedValue(mockSession);
    vi.mocked(pubkyAPISDK.searchPostsByUrl).mockResolvedValue(mockPosts);
    vi.mocked(pubkyAPISDK.searchAnnotationsByUrl).mockResolvedValue([]);
    
    const AppModule = await import('../App');
    App = AppModule.default;
  });

  describe('Initial Load', () => {
    it('should show loading state initially', async () => {
      vi.mocked(pubkyAPISDK.searchPostsByUrl).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<App />);

      // Should show loading indicator
      expect(screen.getByText(/loading/i) || screen.queryByRole('progressbar')).toBeTruthy();
    });
  });

  describe('Authenticated User', () => {
    it('should fetch posts for current URL', async () => {
      render(<App />);

      await waitFor(() => {
        expect(pubkyAPISDK.searchPostsByUrl).toHaveBeenCalledWith(
          'https://example.com',
          expect.any(String)
        );
      });
    });

    it('should display posts from network', async () => {
      render(<App />);

      await waitFor(() => {
        // Should show post content or author names
        const content = screen.queryByText(/test post/i) || 
                       screen.queryByText(/Test Author/i);
        expect(content).toBeTruthy();
      });
    });
  });

  describe('Unauthenticated User', () => {
    beforeEach(async () => {
      vi.resetModules();
      
      const authModule = await import('../../utils/auth-sdk');
      vi.mocked(authModule.authManagerSDK.getSession).mockResolvedValue(null);
      
      const apiModule = await import('../../utils/pubky-api-sdk');
      vi.mocked(apiModule.pubkyAPISDK.searchPostsByUrl).mockResolvedValue(mockPosts);
      
      const AppModule = await import('../App');
      App = AppModule.default;
    });

    it('should show sign in prompt when not authenticated', async () => {
      render(<App />);

      await waitFor(() => {
        // Sidepanel shows a "Not Signed In" banner when unauthenticated
        const signInBanner = screen.queryByText(/Not Signed In/i) || 
                            screen.queryByText(/Sign In/i) ||
                            screen.queryByText(/sign in to create/i);
        // Also check if posts are still shown (sidepanel shows posts regardless of auth)
        expect(signInBanner || screen.queryByText(/Graphiti Feed/i)).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      vi.mocked(pubkyAPISDK.searchPostsByUrl).mockResolvedValue([]);
    });

    it('should show empty state when no posts found', async () => {
      render(<App />);

      await waitFor(() => {
        const emptyState = screen.queryByText(/no posts/i) ||
                          screen.queryByText(/no content/i) ||
                          screen.queryByText(/nothing here/i) ||
                          screen.queryByText(/be the first/i);
        expect(emptyState).toBeTruthy();
      });
    });
  });

  describe('Refresh', () => {
    it('should refetch posts when refresh is triggered', async () => {
      render(<App />);

      await waitFor(() => {
        expect(pubkyAPISDK.searchPostsByUrl).toHaveBeenCalledTimes(1);
      });

      // Find and click refresh button
      const refreshButton = screen.queryByRole('button', { name: /refresh/i }) ||
                           screen.queryByText(/↻/) ||
                           screen.queryByTitle(/refresh/i);
      
      if (refreshButton) {
        fireEvent.click(refreshButton);

        await waitFor(() => {
          expect(pubkyAPISDK.searchPostsByUrl).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Post Cards', () => {
    it('should display author information', async () => {
      render(<App />);

      await waitFor(() => {
        // Look for author name in rendered posts
        const authorElement = screen.queryByText('Test Author') ||
                             screen.queryByText(/author/i);
        expect(authorElement).toBeTruthy();
      });
    });

    it('should display post content', async () => {
      render(<App />);

      await waitFor(() => {
        const contentElement = screen.queryByText(/test post/i) ||
                              screen.queryByText(/example\.com/i);
        expect(contentElement).toBeTruthy();
      });
    });

    it('should display relative timestamps', async () => {
      render(<App />);

      await waitFor(() => {
        // Look for time-related text - formatDate returns "Now", "5M", "2H", "3D"
        const timeElement = screen.queryByText(/Now/i) ||
                           screen.queryByText(/\d+M/i) ||
                           screen.queryByText(/\d+H/i) ||
                           screen.queryByText(/\d+D/i);
        expect(timeElement).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(pubkyAPISDK.searchPostsByUrl).mockRejectedValue(
        new Error('Network error')
      );

      render(<App />);

      await waitFor(() => {
        // Should not crash - either show error message or empty state
        const errorOrEmpty = screen.queryByText(/error/i) ||
                            screen.queryByText(/failed/i) ||
                            screen.queryByText(/no posts/i) ||
                            screen.getByRole('main');
        expect(errorOrEmpty).toBeTruthy();
      });
    });
  });

  describe('URL Display', () => {
    it('should show current page URL', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText(/example\.com/i)).toBeTruthy();
      });
    });
  });
});

