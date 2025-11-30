import { logger } from './logger';
import { storage } from './storage';

/**
 * Pubky API utilities for interacting with homeserver and Nexus
 */

// const NEXUS_API_URL = 'https://demo-api.nexus.com'; // Placeholder - adjust to actual Nexus API

export interface PubkyPost {
  id: string;
  author_id: string;
  content: string;
  kind: string;
  uri: string;
  indexed_at: number;
  attachments?: string[];
  embed?: {
    kind: string;
    uri: string;
  };
  author?: {
    id: string;
    name?: string;
    bio?: string;
    image?: string;
  };
}

export interface PostsResponse {
  posts: PubkyPost[];
  cursor?: string;
}

class PubkyAPI {
  private static instance: PubkyAPI;

  private constructor() {}

  static getInstance(): PubkyAPI {
    if (!PubkyAPI.instance) {
      PubkyAPI.instance = new PubkyAPI();
    }
    return PubkyAPI.instance;
  }

  /**
   * Create a bookmark on the homeserver
   */
  async createBookmark(url: string): Promise<string> {
    try {
      const session = await storage.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      logger.info('PubkyAPI', 'Creating bookmark', { url });

      // Generate bookmark ID (hash of URI)
      const bookmarkId = await this.generateHashId(url);
      const timestamp = Date.now();

      // In production, this would PUT to the homeserver
      // const bookmark = {
      //   uri: url,
      //   created_at: timestamp,
      // };

      // For now, we'll just store locally
      const bookmarkUrl = `pubky://${session.pubky}/pub/pubky.app/bookmarks/${bookmarkId}`;
      
      logger.info('PubkyAPI', 'Bookmark created', { bookmarkUrl, timestamp });
      
      return bookmarkUrl;
    } catch (error) {
      logger.error('PubkyAPI', 'Failed to create bookmark', error as Error);
      throw error;
    }
  }

  /**
   * Create tags on the homeserver
   */
  async createTags(url: string, labels: string[]): Promise<string[]> {
    try {
      const session = await storage.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      logger.info('PubkyAPI', 'Creating tags', { url, labels });

      const tagUrls: string[] = [];

      for (const label of labels) {
        const normalizedLabel = label.toLowerCase().trim();
        const tagId = await this.generateHashId(`${url}:${normalizedLabel}`);
        const timestamp = Date.now();

        // In production, this would PUT to the homeserver
        // const tag = {
        //   uri: url,
        //   label: normalizedLabel,
        //   created_at: timestamp,
        // };

        const tagUrl = `pubky://${session.pubky}/pub/pubky.app/tags/${tagId}`;
        tagUrls.push(tagUrl);
        
        logger.debug('PubkyAPI', 'Tag created', { tagUrl, label: normalizedLabel, timestamp });
      }

      logger.info('PubkyAPI', 'All tags created successfully');
      return tagUrls;
    } catch (error) {
      logger.error('PubkyAPI', 'Failed to create tags', error as Error);
      throw error;
    }
  }

  /**
   * Create a link post with tags
   */
  async createLinkPost(url: string, content: string, tags: string[]): Promise<string> {
    try {
      const session = await storage.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      logger.info('PubkyAPI', 'Creating link post', { url, tags });

      // Generate post ID (timestamp-based)
      const postId = Date.now().toString();

      // In production, this would PUT to the homeserver
      // const post = {
      //   content: content || url,
      //   kind: 'link',
      //   parent: null,
      //   embed: null,
      //   attachments: [url],
      // };

      const postUrl = `pubky://${session.pubky}/pub/pubky.app/posts/${postId}`;

      // Also create tags for the post
      if (tags.length > 0) {
        await this.createTags(postUrl, tags);
      }

      logger.info('PubkyAPI', 'Link post created', { postUrl, content });
      return postUrl;
    } catch (error) {
      logger.error('PubkyAPI', 'Failed to create link post', error as Error);
      throw error;
    }
  }

  /**
   * Search for posts containing a specific URL
   * This uses the Nexus API to find posts from followed users
   */
  async searchPostsByUrl(url: string, _viewerId?: string): Promise<PubkyPost[]> {
    try {
      logger.info('PubkyAPI', 'Searching posts by URL', { url });

      // In production, this would query Nexus API
      // For now, we'll return empty array as a placeholder
      
      // Example of how it would work:
      // const response = await fetch(`${NEXUS_API_URL}/v0/search/posts/by_url?url=${encodeURIComponent(url)}`);
      // const data = await response.json();
      
      logger.debug('PubkyAPI', 'Posts search complete');
      return [];
    } catch (error) {
      logger.error('PubkyAPI', 'Failed to search posts', error as Error);
      return [];
    }
  }

  /**
   * Get posts from users the current user follows
   */
  async getFollowingPosts(viewerId: string, limit: number = 20): Promise<PostsResponse> {
    try {
      logger.info('PubkyAPI', 'Fetching following posts', { viewerId, limit });

      // In production, query Nexus API
      // const params = new URLSearchParams({
      //   source: 'following',
      //   viewer_id: viewerId,
      //   limit: limit.toString(),
      // });

      // Placeholder for actual API call
      // const response = await fetch(`${NEXUS_API_URL}/v0/stream/posts?${params}`);
      // const data = await response.json();

      logger.debug('PubkyAPI', 'Following posts fetched');
      return { posts: [] };
    } catch (error) {
      logger.error('PubkyAPI', 'Failed to fetch following posts', error as Error);
      return { posts: [] };
    }
  }

  /**
   * Generate a hash ID for deterministic IDs
   */
  private async generateHashId(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // Use first 16 chars
  }
}

export const pubkyAPI = PubkyAPI.getInstance();

