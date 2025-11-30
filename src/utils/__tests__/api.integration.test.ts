/**
 * API Integration Tests
 * 
 * Tests for the API client layer including:
 * - PubkyAPISDK - Homeserver operations
 * - NexusClient - Nexus API queries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../crypto', () => ({
  generateUrlHashTag: vi.fn().mockResolvedValue('mockhash123'),
}));

vi.mock('../storage', () => ({
  storage: {
    getSession: vi.fn(),
    saveSession: vi.fn(),
  },
}));

// Mock Pubky specs
vi.mock('pubky-app-specs', () => ({
  PubkySpecsBuilder: vi.fn().mockImplementation(() => ({
    createPost: vi.fn().mockReturnValue({
      post: { toJson: () => ({ content: 'test', kind: 'link' }) },
      meta: { url: 'pubky://test/posts/123', id: '123' },
    }),
    createBookmark: vi.fn().mockReturnValue({
      bookmark: { toJson: () => ({ uri: 'pubky://test/posts/123' }) },
      meta: { url: 'pubky://test/bookmarks/456', id: '456' },
    }),
    createTag: vi.fn().mockReturnValue({
      tag: { toJson: () => ({ uri: 'pubky://test/posts/123', label: 'test' }) },
      meta: { url: 'pubky://test/tags/789', id: '789' },
    }),
  })),
  PubkyAppPostKind: {
    Link: 'link',
    Short: 'short',
    Image: 'image',
    Video: 'video',
  },
}));

// Mock the Pubky SDK
vi.mock('@synonymdev/pubky', () => ({
  Client: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }),
    list: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock chrome storage
let mockStorageData: Record<string, any> = {};
const mockChromeStorage = {
  local: {
    get: vi.fn((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorageData[keys] });
      }
      return Promise.resolve(mockStorageData);
    }),
    set: vi.fn((data) => {
      Object.assign(mockStorageData, data);
      return Promise.resolve();
    }),
    remove: vi.fn((keys) => {
      if (typeof keys === 'string') {
        delete mockStorageData[keys];
      }
      return Promise.resolve();
    }),
  },
};
(globalThis as any).chrome = { storage: mockChromeStorage };

// Mock fetch for Nexus client
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageData = {};
  });

  // ============================================
  // NexusClient Tests
  // ============================================
  describe('NexusClient', () => {
    let nexusClient: any;

    beforeEach(async () => {
      vi.resetModules();
      const module = await import('../nexus-client');
      nexusClient = module.nexusClient;
    });

    describe('getPost', () => {
      it('should fetch a specific post', async () => {
        const mockPost = {
          details: {
            id: 'post123',
            author: 'author123',
            content: 'Test content',
            kind: 'short',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPost),
        });

        const result = await nexusClient.getPost('author123', 'post123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v0/post/author123/post123')
        );
        expect(result).toEqual(mockPost);
      });

      it('should include viewer_id in query params', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await nexusClient.getPost('author123', 'post123', 'viewer456');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('viewer_id=viewer456')
        );
      });

      it('should throw on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

        await expect(nexusClient.getPost('author123', 'post123')).rejects.toThrow();
      });
    });

    describe('streamPosts', () => {
      it('should fetch posts stream', async () => {
        const mockPosts = {
          data: [
            { details: { id: 'post1', content: 'Content 1' } },
            { details: { id: 'post2', content: 'Content 2' } },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockPosts)),
        });

        const result = await nexusClient.streamPosts({ limit: 10 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v0/stream/posts')
        );
        expect(result.data).toHaveLength(2);
      });

      it('should apply filter options', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ data: [] })),
        });

        await nexusClient.streamPosts({
          source: 'following',
          observer_id: 'user123',
          tags: 'javascript',
          limit: 50,
        });

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('source=following');
        expect(calledUrl).toContain('observer_id=user123');
        expect(calledUrl).toContain('tags=javascript');
        expect(calledUrl).toContain('limit=50');
      });

      it('should handle empty responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(''),
        });

        const result = await nexusClient.streamPosts();

        expect(result).toEqual({ data: [], cursor: undefined });
      });

      it('should handle array response format', async () => {
        const mockArray = [{ id: 'post1' }, { id: 'post2' }];
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockArray)),
        });

        const result = await nexusClient.streamPosts({ tags: 'test' });

        expect(result.data).toHaveLength(2);
      });
    });

    describe('searchPostsByTag', () => {
      it('should search posts by tag', async () => {
        const mockPosts = {
          data: [{ details: { id: 'post1' } }],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockPosts)),
        });

        const result = await nexusClient.searchPostsByTag('javascript');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v0/search/posts/by_tag/javascript')
        );
        expect(result).toHaveLength(1);
      });

      it('should encode special characters in tag', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ data: [] })),
        });

        await nexusClient.searchPostsByTag('tag with spaces');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('tag%20with%20spaces')
        );
      });
    });

    describe('getUser', () => {
      it('should fetch user profile', async () => {
        const mockUser = {
          id: 'user123',
          name: 'Test User',
          bio: 'Test bio',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });

        const result = await nexusClient.getUser('user123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v0/user/user123')
        );
        expect(result).toEqual(mockUser);
      });
    });

    describe('searchPostsByUrl', () => {
      it('should search and filter posts by URL', async () => {
        const mockPosts = {
          data: [
            { details: { content: 'https://example.com is great', uri: 'post1' } },
            { details: { content: 'Other content', uri: 'post2' } },
          ],
        };

        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockPosts)),
        });

        const result = await nexusClient.searchPostsByUrl('https://example.com');

        expect(result).toHaveLength(1);
        expect(result[0].details.uri).toBe('post1');
      });

      it('should deduplicate posts by URI', async () => {
        const duplicatePost = { 
          details: { 
            content: 'https://example.com', 
            uri: 'same-uri' 
          } 
        };
        
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ data: [duplicatePost] })),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ data: [duplicatePost] })),
          });

        const result = await nexusClient.searchPostsByUrl('https://example.com', 'user123');

        // Should only have one post despite appearing twice
        expect(result).toHaveLength(1);
      });
    });
  });

  // ============================================
  // PubkyAPISDK Integration Tests
  // ============================================
  describe('PubkyAPISDK', () => {
    let pubkyAPISDK: any;
    let storage: any;

    beforeEach(async () => {
      vi.resetModules();
      
      const storageModule = await import('../storage');
      storage = storageModule.storage;
      
      // Set up authenticated session
      vi.mocked(storage.getSession).mockResolvedValue({
        pubky: 'testpubky123',
        homeserver: 'https://homeserver.example.com',
        sessionId: 'session123',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const module = await import('../pubky-api-sdk');
      pubkyAPISDK = module.pubkyAPISDK;
    });

    describe('createBookmark', () => {
      it('should create a bookmark with post', async () => {
        const result = await pubkyAPISDK.createBookmark('https://example.com');

        expect(result).toHaveProperty('fullPath');
        expect(result).toHaveProperty('bookmarkId');
        expect(result).toHaveProperty('postUri');
      });

      it('should throw when not authenticated', async () => {
        vi.mocked(storage.getSession).mockResolvedValueOnce(null);

        await expect(
          pubkyAPISDK.createBookmark('https://example.com')
        ).rejects.toThrow('Not authenticated');
      });
    });

    describe('createLinkPost', () => {
      it('should create a link post with tags', async () => {
        const result = await pubkyAPISDK.createLinkPost(
          'https://example.com',
          'Check this out!',
          ['tech', 'cool']
        );

        expect(typeof result).toBe('string');
        expect(result).toContain('pubky://');
      });
    });

    describe('createTags', () => {
      it('should create multiple tags', async () => {
        const result = await pubkyAPISDK.createTags(
          'pubky://test/posts/123',
          ['javascript', 'react']
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
      });
    });

    describe('searchPostsByUrl', () => {
      it('should search posts with URL hash tag', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            data: [
              { details: { id: 'post1', content: 'Test' } },
            ],
          })),
        });

        const result = await pubkyAPISDK.searchPostsByUrl('https://example.com', 'viewer123');

        expect(Array.isArray(result)).toBe(true);
      });

      it('should filter deleted posts', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            data: [
              { details: { id: 'post1', content: 'Normal post' } },
              { details: { id: 'post2', content: '[DELETED]' } },
            ],
          })),
        });

        const result = await pubkyAPISDK.searchPostsByUrl('https://example.com');

        // Should only return non-deleted posts
        expect(result.every((post: any) => 
          (post.details?.content || post.content) !== '[DELETED]'
        )).toBe(true);
      });
    });

    describe('createAnnotationPost', () => {
      it('should create an annotation post', async () => {
        const result = await pubkyAPISDK.createAnnotationPost(
          'https://example.com',
          'Selected text',
          'My comment',
          {
            startPath: '/html/body/p[1]',
            endPath: '/html/body/p[1]',
            startOffset: 0,
            endOffset: 12,
          }
        );

        expect(typeof result).toBe('string');
        expect(result).toContain('pubky://');
      });
    });
  });
});

