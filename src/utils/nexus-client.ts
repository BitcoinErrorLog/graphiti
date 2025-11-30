/**
 * @fileoverview Nexus API Client for querying Pubky posts and users.
 * 
 * Nexus is the indexing service that aggregates data from the Pubky network,
 * making it searchable and queryable. This client provides methods for:
 * - Fetching posts and user profiles
 * - Searching by tags
 * - Streaming posts with various filters
 * 
 * @module utils/nexus-client
 * @see https://github.com/pubky/pubky-nexus
 */

import { logger } from './logger';
import { withRetry, isRetryableNetworkError } from './retry';

/** Nexus API base URL */
const NEXUS_API_URL = 'https://nexus.pubky.app';

/**
 * Post data from Nexus API.
 * 
 * Supports both the structured format (with details object)
 * and legacy flat format for backwards compatibility.
 */
export interface NexusPost {
  /** Structured post details */
  details: {
    id: string;
    author: string;
    content: string;
    kind: string;
    uri: string;
    indexed_at: number;
    attachments?: string[];
    deleted_at?: number;  // Timestamp when post was deleted
  };
  counts?: {
    tags?: number;
    replies?: number;
    reposts?: number;
  };
  tags?: Array<{
    label: string;
    taggers: string[];
    taggers_count: number;
    relationship: boolean;
  }>;
  /** Relationship data for the post */
  relationships?: {
    following?: boolean;
    followed_by?: boolean;
    friends?: boolean;
  };
  /** Bookmark data if the viewer has bookmarked this post */
  bookmark?: {
    id: string;
    indexed_at: number;
  };
  deleted_at?: number;  // Timestamp when post was deleted (legacy format)
  // Legacy flat format support (for backwards compatibility)
  id?: string;
  author_id?: string;
  content?: string;
  kind?: string;
  uri?: string;
  indexed_at?: number;
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

export interface NexusUser {
  id: string;
  name?: string;
  bio?: string;
  image?: string;
  links?: Array<{
    title: string;
    url: string;
  }>;
}

export interface PostsStreamResponse {
  data: NexusPost[];
  cursor?: string;
}

export interface UsersStreamResponse {
  data: NexusUser[];
  cursor?: string;
}

/**
 * Client for interacting with the Nexus API.
 * 
 * @example
 * import { nexusClient } from './nexus-client';
 * 
 * // Get a user profile
 * const user = await nexusClient.getUser('abc123');
 * 
 * // Stream posts with filters
 * const { data } = await nexusClient.streamPosts({
 *   source: 'following',
 *   observer_id: 'viewer123',
 *   limit: 20
 * });
 */
class NexusClient {
  private apiUrl: string;

  /**
   * Creates a new Nexus client.
   * @param {string} apiUrl - Base URL for the Nexus API
   */
  constructor(apiUrl: string = NEXUS_API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Get a specific post
   */
  async getPost(authorId: string, postId: string, viewerId?: string): Promise<NexusPost> {
    let url = `${this.apiUrl}/v0/post/${authorId}/${postId}`;
    
    const params = new URLSearchParams();
    if (viewerId) params.append('viewer_id', viewerId);
    if (params.toString()) url += '?' + params.toString();

    logger.debug('NexusClient', 'Fetching post', { authorId, postId, url });

    return withRetry(
      async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        logger.info('NexusClient', 'Post fetched successfully', { postId });
        
        return data;
      },
      {
        maxRetries: 3,
        context: 'NexusClient.getPost',
        shouldRetry: isRetryableNetworkError,
      }
    );
  }

  /**
   * Stream posts with various filters
   */
  async streamPosts(options: {
    source?: 'all' | 'following' | 'followers' | 'friends' | 'bookmarks' | 'author' | 'author_replies' | 'post_replies';
    viewer_id?: string;
    observer_id?: string;
    author_id?: string;
    post_id?: string;
    sorting?: 'latest' | 'oldest';
    order?: 'asc' | 'desc';
    tags?: string;
    kind?: string;
    skip?: number;
    limit?: number;
    start?: number;
    end?: number;
  } = {}): Promise<PostsStreamResponse> {
    try {
      let url = `${this.apiUrl}/v0/stream/posts`;

      const params = new URLSearchParams();
      if (options.source) params.append('source', options.source);
      if (options.viewer_id) params.append('viewer_id', options.viewer_id);
      if (options.observer_id) params.append('observer_id', options.observer_id);
      if (options.author_id) params.append('author_id', options.author_id);
      if (options.post_id) params.append('post_id', options.post_id);
      if (options.sorting) params.append('sorting', options.sorting);
      if (options.order) params.append('order', options.order);
      if (options.tags) params.append('tags', options.tags);
      if (options.kind) params.append('kind', options.kind);
      if (options.skip !== undefined) params.append('skip', options.skip.toString());
      if (options.limit !== undefined) params.append('limit', options.limit.toString());
      if (options.start !== undefined) params.append('start', options.start.toString());
      if (options.end !== undefined) params.append('end', options.end.toString());
      
      if (params.toString()) url += '?' + params.toString();

      logger.debug('NexusClient', 'Streaming posts', { options, url });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      // Handle empty responses
      const text = await response.text();
      if (!text || text.trim() === '') {
        logger.info('NexusClient', 'Empty response from API', { options });
        return { data: [], cursor: undefined };
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        logger.error('NexusClient', 'Failed to parse response', parseError as Error, { text: text.substring(0, 100) });
        return { data: [], cursor: undefined };
      }
      
      // Handle different response formats:
      // - With tags parameter: returns array directly
      // - Without tags: returns { data: [...], cursor: ... }
      const normalizedData = Array.isArray(data) 
        ? { data, cursor: undefined } 
        : data;
      
      logger.info('NexusClient', 'Posts stream fetched', { count: normalizedData.data?.length || 0 });
      
      return normalizedData;
    } catch (error) {
      logger.error('NexusClient', 'Failed to stream posts', error as Error, { options });
      throw error;
    }
  }

  /**
   * Search posts by tag
   */
  async searchPostsByTag(tag: string, options: {
    observer_id?: string;
    sorting?: 'latest' | 'oldest';
    start?: number;
    end?: number;
    skip?: number;
    limit?: number;
  } = {}): Promise<NexusPost[]> {
    try {
      let url = `${this.apiUrl}/v0/search/posts/by_tag/${encodeURIComponent(tag)}`;

      const params = new URLSearchParams();
      if (options.observer_id) params.append('observer_id', options.observer_id);
      if (options.sorting) params.append('sorting', options.sorting);
      if (options.start !== undefined) params.append('start', options.start.toString());
      if (options.end !== undefined) params.append('end', options.end.toString());
      if (options.skip !== undefined) params.append('skip', options.skip.toString());
      if (options.limit !== undefined) params.append('limit', options.limit.toString());
      
      if (params.toString()) url += '?' + params.toString();

      logger.debug('NexusClient', 'Searching posts by tag', { tag, url });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      // Handle empty responses
      const text = await response.text();
      if (!text || text.trim() === '') {
        logger.info('NexusClient', 'Empty response from API', { tag });
        return [];
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        logger.error('NexusClient', 'Failed to parse response', parseError as Error, { text: text.substring(0, 100) });
        return [];
      }
      
      logger.info('NexusClient', 'Posts search complete', { tag, count: data.data?.length || 0 });
      
      // Return just the posts array
      return data.data || [];
    } catch (error) {
      logger.error('NexusClient', 'Failed to search posts by tag', error as Error, { tag });
      throw error;
    }
  }

  /**
   * Get a user profile
   */
  async getUser(userId: string, viewerId?: string, depth?: number): Promise<NexusUser> {
    let url = `${this.apiUrl}/v0/user/${userId}`;
    
    const params = new URLSearchParams();
    if (viewerId) params.append('viewer_id', viewerId);
    if (depth !== undefined) params.append('depth', depth.toString());
    if (params.toString()) url += '?' + params.toString();

    logger.debug('NexusClient', 'Fetching user', { userId, url });

    return withRetry(
      async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        logger.info('NexusClient', 'User fetched successfully', { userId });
        
        return data;
      },
      {
        maxRetries: 3,
        context: 'NexusClient.getUser',
        shouldRetry: isRetryableNetworkError,
      }
    );
  }

  /**
   * Search posts containing a specific URL
   * This is a helper that searches by attachments
   */
  async searchPostsByUrl(url: string, observerId?: string, limit: number = 20): Promise<NexusPost[]> {
    try {
      logger.info('NexusClient', 'Searching posts by URL', { url });

      // Strategy: Search posts from multiple sources and combine results
      const allPosts: NexusPost[] = [];

      // 1. Get user's own posts (if observerId provided)
      if (observerId) {
        try {
          const ownPostsResponse = await this.streamPosts({
            source: 'author',
            author_id: observerId,
            limit: 50,
          });
          allPosts.push(...(ownPostsResponse.data || []));
        } catch (error) {
          logger.warn('NexusClient', 'Failed to fetch own posts', error as Error);
        }
      }

      // 2. Get posts from following
      try {
        const followingResponse = await this.streamPosts({
          source: observerId ? 'following' : 'all',
          observer_id: observerId,
          limit: 50,
        });
        allPosts.push(...(followingResponse.data || []));
      } catch (error) {
        logger.warn('NexusClient', 'Failed to fetch following posts', error as Error);
      }

      // Filter posts that have the URL in content
      // Remove duplicates by URI
      const uniquePosts = new Map<string, NexusPost>();
      for (const post of allPosts) {
        const content = post.details?.content || post.content || '';
        const attachments = post.details?.attachments || post.attachments || [];
        const uri = post.details?.uri || post.uri || '';
        
        if (content.includes(url) || attachments.some(attachment => attachment.includes(url))) {
          uniquePosts.set(uri, post);
        }
      }

      const filtered = Array.from(uniquePosts.values()).slice(0, limit);

      logger.info('NexusClient', 'URL search complete', { url, found: filtered.length, total: allPosts.length });
      
      return filtered;
    } catch (error) {
      logger.error('NexusClient', 'Failed to search posts by URL', error as Error, { url });
      return [];
    }
  }
}

export const nexusClient = new NexusClient();

