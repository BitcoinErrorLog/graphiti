import { logger } from './logger';
import { storage } from './storage';
import { nexusClient, NexusPost } from './nexus-client';
import { PubkySpecsBuilder, PubkyAppPostKind } from 'pubky-app-specs';
import { generateUrlHashTag } from './crypto';
import { withRateLimit, apiRateLimiters } from './rate-limiter';
import ErrorHandler from './error-handler';
import { measureAPICall } from './performance-monitor';
import { validateResponse, parseJsonResponse } from './response-helpers';

/**
 * Pubky API using official SDK for homeserver operations
 */

class PubkyAPISDK {
  private static instance: PubkyAPISDK;
  private pubky: any = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Don't initialize in constructor - wait until actually needed
    // This prevents errors in service worker contexts where window is not available
  }

  static getInstance(): PubkyAPISDK {
    if (!PubkyAPISDK.instance) {
      PubkyAPISDK.instance = new PubkyAPISDK();
    }
    return PubkyAPISDK.instance;
  }

  /**
   * Check if we're in a context that supports Pubky Client (has window)
   */
  private isClientContextAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Initialize Pubky client
   * Only works in contexts with window (not service workers)
   */
  private async initializePubky() {
    if (!this.isClientContextAvailable()) {
      const error = new Error('Pubky Client requires window object (not available in service workers)');
      // Use console directly to avoid logger issues
      console.warn('[PubkyAPISDK] Cannot initialize Pubky Client in service worker context', error);
      throw error;
    }

    try {
      // Check window before getting Client (it might access window in constructor)
      if (!this.isClientContextAvailable()) {
        throw new Error('Pubky Client requires window object (not available in service workers)');
      }
      
      // Use singleton factory instead of creating new instance
      const { getPubkyClientAsync } = await import('./pubky-client-factory');
      this.pubky = await getPubkyClientAsync();
      logger.info('PubkyAPISDK', 'Pubky Client initialized via singleton');
    } catch (error) {
      // Use console directly to avoid circular logger issues
      console.error('[PubkyAPISDK] Failed to initialize Pubky Client', error);
      
      // Only use ErrorHandler if it won't cause issues
      try {
        ErrorHandler.handle(error as Error, {
          context: 'PubkyAPISDK',
          data: { operation: 'initializePubky' },
          showNotification: false,
        });
      } catch {
        // Ignore if ErrorHandler fails
      }
      throw error;
    }
  }

  /**
   * Ensure Pubky is initialized
   * Throws if called in service worker context
   */
  private async ensurePubky(): Promise<any> {
    if (!this.isClientContextAvailable()) {
      throw new Error('Pubky Client operations require window object. Use offscreen document for service worker contexts.');
    }

    if (!this.pubky) {
      // Use a promise to prevent multiple simultaneous initializations
      if (!this.initializationPromise) {
        this.initializationPromise = this.initializePubky();
      }
      await this.initializationPromise;
    }
    return this.pubky;
  }

  private async rateLimitedFetch(path: string, init?: RequestInit): Promise<Response> {
    await this.ensurePubky();
    return measureAPICall(`pubky:${path}`, () =>
      withRateLimit(() => this.pubky.fetch(path, init), apiRateLimiters.pubky)
    );
  }

  private async rateLimitedList(
    path: string,
    cursor: any = null,
    recursive = false,
    limit = 100,
    includeMetadata = false
  ): Promise<any> {
    await this.ensurePubky();
    return measureAPICall(`pubky:list:${path}`, () =>
      withRateLimit(
        () => this.pubky.list(path, cursor, recursive, limit, includeMetadata),
        apiRateLimiters.pubky
      )
    );
  }

  /**
   * Get authenticated session for storage operations
   */
  private async getAuthenticatedSession(): Promise<any> {
    const session = await storage.getSession();
    if (!session) {
      ErrorHandler.handleAndThrow(new Error('Not authenticated'), {
        context: 'PubkyAPISDK',
        data: { operation: 'getAuthenticatedSession' },
        userMessage: 'Please sign in to continue.',
      });
    }
    return session;
  }

  /**
   * Create a bookmark on the homeserver using SDK
   * Bookmarks must point to Pubky content (posts), so we:
   * 1. Create a link post with the HTTP URL
   * 2. Bookmark that post URI (not the HTTP URL)
   */
  async createBookmark(url: string): Promise<{ fullPath: string; bookmarkId: string; postUri: string }> {
    try {
      const session = await this.getAuthenticatedSession();
      logger.info('PubkyAPISDK', 'Creating bookmark for URL', { url });

      const builder = new PubkySpecsBuilder(session.pubky);

      // Step 1: Create a link post with the HTTP URL
      logger.info('PubkyAPISDK', 'Creating link post first');
      const postResult = builder.createPost(
        url,  // content is the URL
        PubkyAppPostKind.Link,
        null,  // parent
        null,  // embed
        []     // attachments
      );

      const post = postResult.post.toJson();
      const postUri = postResult.meta.url;

      try {
        const postResponse = await this.rateLimitedFetch(postUri, {
          method: 'PUT',
          body: JSON.stringify(post),
          credentials: 'include',
        });

        if (!postResponse.ok) {
          ErrorHandler.handleAndThrow(
            new Error(`Failed to create post: HTTP ${postResponse.status}`),
            {
              context: 'PubkyAPISDK',
              data: { operation: 'createBookmark', status: postResponse.status },
              userMessage: 'Failed to create bookmark. Please try again.',
            }
          );
        }

        logger.info('PubkyAPISDK', 'Link post created', { 
          postUri, 
          postId: postResult.meta.id 
        });
      } catch (postError) {
        logger.error('PubkyAPISDK', 'Failed to create link post', postError as Error);
        throw postError;
      }

      // Add URL hash tag to the post for Nexus querying
      const urlHashTag = await generateUrlHashTag(url);
      logger.info('PubkyAPISDK', 'Adding URL hash tag to bookmark post', { urlHashTag });
      
      try {
        await this.createTags(postUri, [urlHashTag]);
      } catch (tagError) {
        logger.warn('PubkyAPISDK', 'Failed to add URL hash tag to post', tagError as Error);
      }

      // Step 2: Create bookmark pointing to the POST URI (not the HTTP URL)
      logger.info('PubkyAPISDK', 'Creating bookmark for post', { postUri });
      const bookmarkResult = builder.createBookmark(postUri);  // Bookmark the POST, not the URL!
      
      const bookmark = bookmarkResult.bookmark.toJson();
      const fullPath = bookmarkResult.meta.url;
      const bookmarkId = bookmarkResult.meta.id;
      
      try {
        const response = await this.rateLimitedFetch(fullPath, {
          method: 'PUT',
          body: JSON.stringify(bookmark),
          credentials: 'include',
        });
        
        logger.info('PubkyAPISDK', 'Bookmark write response', { 
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          path: fullPath,
          id: bookmarkId,
          data: bookmark 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        logger.info('PubkyAPISDK', 'Bookmark written to homeserver successfully');
      } catch (writeError) {
        logger.error('PubkyAPISDK', 'Failed to write bookmark to homeserver', writeError as Error);
        throw writeError;
      }
      
      return { fullPath, bookmarkId, postUri };
      } catch (error) {
        ErrorHandler.handleAndThrow(error, {
          context: 'PubkyAPISDK',
          data: { operation: 'createBookmark', url },
          userMessage: 'Failed to create bookmark. Please try again.',
        });
      }
  }

  /**
   * Delete a bookmark from the homeserver using SDK
   * @param postUri - The Pubky post URI that was bookmarked (not the HTTP URL)
   */
  async deleteBookmark(postUri: string): Promise<void> {
    try {
      const session = await this.getAuthenticatedSession();
      logger.info('PubkyAPISDK', 'Deleting bookmark', { postUri });

      // Use official pubky-app-specs builder to regenerate the bookmark ID from the post URI
      const builder = new PubkySpecsBuilder(session.pubky);
      const result = builder.createBookmark(postUri);  // Use post URI, not HTTP URL
      
      const fullPath = result.meta.url;
      
      // Delete from homeserver using SDK
      try {
        await this.rateLimitedFetch(fullPath, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        logger.info('PubkyAPISDK', 'Bookmark deleted from homeserver', { 
          path: fullPath,
          id: result.meta.id
        });
      } catch (deleteError) {
        logger.warn('PubkyAPISDK', 'Failed to delete from homeserver', deleteError as Error);
      }
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to delete bookmark', error as Error);
      throw error;
    }
  }

  /**
   * Create tags on the homeserver using SDK
   */
  async createTags(url: string, labels: string[]): Promise<string[]> {
    try {
      const session = await this.getAuthenticatedSession();
      logger.info('PubkyAPISDK', 'Creating tags', { url, labels });

      await this.ensurePubky();
      const builder = new PubkySpecsBuilder(session.pubky);
      const tagUrls: string[] = [];

      for (const label of labels) {
        // Use official pubky-app-specs builder (it handles normalization)
        const result = builder.createTag(url, label);
        
        const tag = result.tag.toJson();
        const fullPath = result.meta.url;

        // Write to homeserver using SDK
        try {
          await this.rateLimitedFetch(fullPath, {
            method: 'PUT',
            body: JSON.stringify(tag),
          });
          
          logger.info('PubkyAPISDK', 'Tag written to homeserver', {
            path: fullPath,
            id: result.meta.id,
            data: tag
          });
        } catch (writeError) {
          logger.warn('PubkyAPISDK', `Failed to write tag '${label}' to homeserver: ${(writeError as Error).message}`);
        }

        tagUrls.push(fullPath);
        logger.debug('PubkyAPISDK', 'Tag created', { tagUrl: fullPath, label });
      }

      logger.info('PubkyAPISDK', 'All tags created successfully');
      return tagUrls;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to create tags', error as Error);
      throw error;
    }
  }

  /**
   * Create a link post with tags
   */
  async createLinkPost(url: string, content: string, tags: string[]): Promise<string> {
    try {
      const session = await this.getAuthenticatedSession();
      logger.info('PubkyAPISDK', 'Creating link post', { url, tags });

      // Use official pubky-app-specs builder
      const builder = new PubkySpecsBuilder(session.pubky);
      const result = builder.createPost(
        content || url,
        PubkyAppPostKind.Link,  // Use the enum for link posts
        null,  // parent
        null,  // embed
        []     // attachments (empty for link posts)
      );

      const post = result.post.toJson();
      const fullPath = result.meta.url;

      // Write post to homeserver
      try {
        await this.rateLimitedFetch(fullPath, {
          method: 'PUT',
          body: JSON.stringify(post),
          credentials: 'include',
        });
        
        logger.info('PubkyAPISDK', 'Post written to homeserver', { 
          path: fullPath,
          id: result.meta.id,
          data: post 
        });
      } catch (writeError) {
        logger.warn('PubkyAPISDK', `Failed to write post to homeserver: ${(writeError as Error).message}`);
      }

      // Generate URL hash tag for Nexus querying
      const urlHashTag = await generateUrlHashTag(url);
      
      // Combine user tags with the URL hash tag
      const allTags = [...tags, urlHashTag];
      
      logger.info('PubkyAPISDK', 'Adding tags including URL hash', { 
        userTags: tags, 
        urlHashTag,
        totalTags: allTags.length 
      });

      // Create all tags for the post (including URL hash)
      if (allTags.length > 0) {
        await this.createTags(fullPath, allTags);
      }

      logger.info('PubkyAPISDK', 'Link post created with URL hash tag', { 
        postUrl: fullPath,
        urlHashTag 
      });
      return fullPath;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to create link post', error as Error);
      throw error;
    }
  }

  /**
   * Read public data from a user's homeserver
   */
  async readPublicData(pubky: string, path: string): Promise<any> {
    try {
      const fullPath = `pubky://${pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Reading public data', { fullPath });

      // Use the client's fetch method to get data
      const response = await this.rateLimitedFetch(fullPath);
      validateResponse(response);
      const data = await parseJsonResponse(response);
      
      logger.info('PubkyAPISDK', 'Public data read successfully', { path });
      return data;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to read public data', error as Error, { pubky, path });
      throw error;
    }
  }

  /**
   * List files in a directory on a user's homeserver
   */
  async listPublicDirectory(pubky: string, path: string, limit: number = 10): Promise<string[]> {
    try {
      const fullPath = `pubky://${pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Listing directory', { fullPath });

      // Use the client's list method
      const entries = await this.rateLimitedList(fullPath, null, false, limit, false);

      const paths = entries.map((entry: any) => entry);
      
      logger.info('PubkyAPISDK', 'Directory listed successfully', { path, count: paths.length });
      return paths;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to list directory', error as Error, { pubky, path });
      throw error;
    }
  }

  /**
   * Upload a file to the homeserver
   */
  async uploadFile(path: string, content: string, contentType: string = 'application/json'): Promise<string> {
    try {
      const session = await this.getAuthenticatedSession();
      const fullPath = `pubky://${session.pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Uploading file', { fullPath });

      const response = await this.rateLimitedFetch(fullPath, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: content,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: HTTP ${response.status}`);
      }

      logger.info('PubkyAPISDK', 'File uploaded successfully', { path });
      return fullPath;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to upload file', error as Error, { path });
      throw error;
    }
  }

  /**
   * Get file content from a homeserver
   */
  async getFile(pubky: string, path: string): Promise<string> {
    try {
      const fullPath = `pubky://${pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Getting file', { fullPath });

      const response = await this.rateLimitedFetch(fullPath);
      const data = await response.text();
      
      logger.info('PubkyAPISDK', 'File retrieved successfully', { path });
      return data;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to get file', error as Error, { pubky, path });
      throw error;
    }
  }

  /**
   * Delete a file from the homeserver
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const session = await this.getAuthenticatedSession();
      const fullPath = `pubky://${session.pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Deleting file', { fullPath });

      const response = await this.rateLimitedFetch(fullPath, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: HTTP ${response.status}`);
      }

      logger.info('PubkyAPISDK', 'File deleted successfully', { path });
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to delete file', error as Error, { path });
      throw error;
    }
  }

  /**
   * List files in a directory on own homeserver
   */
  async listFiles(pubky: string, path: string): Promise<any[]> {
    try {
      const fullPath = `pubky://${pubky}${path}`;
      logger.debug('PubkyAPISDK', 'Listing files', { fullPath });

      const entries = await this.rateLimitedList(fullPath, null, false, 100, false);
      
      const files = entries.map((entry: any) => ({
        name: entry.split('/').pop() || entry,
        path: entry,
      }));
      
      logger.info('PubkyAPISDK', 'Files listed successfully', { path, count: files.length });
      return files;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to list files', error as Error, { pubky, path });
      throw error;
    }
  }

  /**
   * Check if a post is deleted
   * Deleted posts have their content replaced with "[DELETED]"
   */
  private isPostDeleted(post: NexusPost): boolean {
    // Check if content is exactly "[DELETED]"
    const content = post.details?.content || post.content || '';
    if (content === '[DELETED]') {
      return true;
    }
    
    return false;
  }

  /**
   * Search for posts containing a specific URL using Nexus API
   * Uses URL hash tag to find posts from contacts about this URL
   */
  async searchPostsByUrl(url: string, viewerId?: string): Promise<NexusPost[]> {
    try {
      logger.info('PubkyAPISDK', 'Searching posts by URL via Nexus', { url });
      
      // Generate the URL hash tag to search for
      const urlHashTag = await generateUrlHashTag(url);
      logger.info('PubkyAPISDK', 'Searching by URL hash tag', { urlHashTag });
      
      // First, try getting own posts to verify tag exists
      if (viewerId) {
        logger.debug('PubkyAPISDK', 'Checking own author posts for debugging');
        const authorResponse = await nexusClient.streamPosts({
          source: 'author',
          author_id: viewerId,
          limit: 10
        });
        logger.info('PubkyAPISDK', 'Own recent posts', {
          count: authorResponse.data?.length || 0,
          posts: authorResponse.data?.map(p => ({
            id: p.id,
            content: p.content?.substring(0, 50),
            tags: p.tags
          }))
        });
      }
      
      // Query ALL posts with this tag (not just from contacts/following)
      // By not specifying a 'source' parameter, we search the entire Nexus network
      // Include viewer_id to get enriched posts with author profile information
      logger.info('PubkyAPISDK', 'Querying ALL posts with URL hash tag (not just contacts)', { urlHashTag });
      const response = await nexusClient.streamPosts({
        tags: urlHashTag,
        limit: 50,
        viewer_id: viewerId // Include viewer to get author profile data
      });
      
      const allPosts = response.data || [];
      
      // Log details about posts to understand deletion pattern
      const deletedPosts = allPosts.filter(post => this.isPostDeleted(post));
      if (deletedPosts.length > 0) {
        logger.info('PubkyAPISDK', 'Found deleted posts (will be filtered)', {
          deletedCount: deletedPosts.length,
          deletedPostsDetails: deletedPosts.map(p => ({
            id: p.details?.id || p.id,
            hasDetails: !!p.details,
            content: p.details?.content,
            contentType: typeof p.details?.content,
            contentIsNull: p.details?.content === null,
            contentIsUndefined: p.details?.content === undefined,
            deleted_at: p.deleted_at || p.details?.deleted_at,
            author: p.details?.author || p.author_id
          }))
        });
      }
      
      // Filter out deleted posts
      const posts = allPosts.filter(post => !this.isPostDeleted(post));
      
      logger.info('PubkyAPISDK', 'Found posts with URL hash tag', { 
        totalCount: allPosts.length,
        filteredCount: posts.length,
        deletedCount: allPosts.length - posts.length,
        urlHashTag,
        searchScope: 'ALL posts (entire network)',
        posts: posts.map(p => ({
          author: p.details?.author || p.author_id,
          authorName: p.author?.name,
          authorImage: p.author?.image,
          authorImageType: p.author?.image ? typeof p.author.image : 'undefined',
          hasAuthorProfile: !!p.author,
          fullAuthor: p.author,
          content: (p.details?.content || p.content || '').substring(0, 100),
          id: p.details?.id || p.id
        }))
      });
      
      return posts;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to search posts', error as Error);
      return [];
    }
  }

  /**
   * Get posts from users the current user follows using Nexus API
   */
  async getFollowingPosts(viewerId: string, limit: number = 20): Promise<NexusPost[]> {
    try {
      logger.info('PubkyAPISDK', 'Fetching following posts via Nexus', { viewerId, limit });
      
      const response = await nexusClient.streamPosts({
        source: 'following',
        observer_id: viewerId,
        limit,
      });

      logger.info('PubkyAPISDK', 'Following posts fetched', { count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to fetch following posts', error as Error);
      return [];
    }
  }

  /**
   * Create an annotation post
   * Annotations are regular posts with special metadata about the selected text
   */
  async createAnnotationPost(
    url: string,
    selectedText: string,
    comment: string,
    metadata: {
      prefix: string;
      exact: string;
      suffix: string;
    }
  ): Promise<string> {
    try {
      const session = await this.getAuthenticatedSession();
      logger.info('PubkyAPISDK', 'Creating annotation post', { url, selectedText: selectedText.substring(0, 50) });

      // Create content that includes the annotation details
      const content = JSON.stringify({
        type: 'annotation',
        url,
        selectedText,
        comment,
        metadata,
      });

      // Use official pubky-app-specs builder
      const builder = new PubkySpecsBuilder(session.pubky);
      const result = builder.createPost(
        content,
        PubkyAppPostKind.Short,  // Use short post type for annotations
        null,  // parent
        null,  // embed
        []     // attachments
      );

      const post = result.post.toJson();
      const fullPath = result.meta.url;

      // Write post to homeserver
      try {
        await this.rateLimitedFetch(fullPath, {
          method: 'PUT',
          body: JSON.stringify(post),
          credentials: 'include',
        });
        
        logger.info('PubkyAPISDK', 'Annotation post written to homeserver', { 
          path: fullPath,
          id: result.meta.id 
        });
      } catch (writeError) {
        logger.error('PubkyAPISDK', 'Failed to write annotation post to homeserver', writeError as Error);
        throw writeError;
      }

      // Generate URL hash tag for Nexus querying
      const urlHashTag = await generateUrlHashTag(url);
      
      // Add special annotation tag
      const annotationTag = 'pubky:annotation';
      const allTags = [urlHashTag, annotationTag];
      
      logger.info('PubkyAPISDK', 'Adding tags to annotation post', { 
        urlHashTag,
        annotationTag,
        totalTags: allTags.length 
      });

      // Create all tags for the post
      if (allTags.length > 0) {
        await this.createTags(fullPath, allTags);
      }

      logger.info('PubkyAPISDK', 'Annotation post created successfully', { 
        postUrl: fullPath,
        urlHashTag 
      });
      return fullPath;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to create annotation post', error as Error);
      throw error;
    }
  }

  /**
   * Delete an annotation post from the homeserver
   * @param postUri - The Pubky post URI (full path like pubky://... or just path)
   */
  async deleteAnnotationPost(postUri: string): Promise<void> {
    try {
      await this.getAuthenticatedSession(); // Ensure user is authenticated
      logger.info('PubkyAPISDK', 'Deleting annotation post', { postUri });

      // Extract path from postUri if it's a full pubky:// URI
      let path = postUri;
      if (postUri.startsWith('pubky://')) {
        // Extract the path part after the pubky
        const match = postUri.match(/^pubky:\/\/[^/]+(\/.+)$/);
        if (match) {
          path = match[1];
        } else {
          // If it's already a path, use it directly
          path = postUri.replace(/^pubky:\/\/[^/]+/, '');
        }
      }

      // Delete from homeserver using SDK
      try {
        await this.deleteFile(path);
        logger.info('PubkyAPISDK', 'Annotation post deleted from homeserver', { 
          path,
          postUri
        });
      } catch (deleteError) {
        logger.warn('PubkyAPISDK', 'Failed to delete annotation post from homeserver', deleteError as Error);
        throw deleteError;
      }
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to delete annotation post', error as Error);
      throw error;
    }
  }

  /**
   * Search for annotation posts for a specific URL
   */
  async searchAnnotationsByUrl(url: string, viewerId?: string): Promise<NexusPost[]> {
    try {
      logger.info('PubkyAPISDK', 'Searching annotations by URL via Nexus', { url });
      
      // Generate the URL hash tag to search for
      const urlHashTag = await generateUrlHashTag(url);
      const annotationTag = 'pubky:annotation';
      
      logger.info('PubkyAPISDK', 'Searching by URL hash tag and annotation tag', { 
        urlHashTag, 
        annotationTag 
      });
      
      // Query ALL annotation posts with this URL tag
      const response = await nexusClient.streamPosts({
        tags: `${urlHashTag},${annotationTag}`, // Search for posts with BOTH tags
        limit: 100,
        viewer_id: viewerId
      });
      
      const allPosts = response.data || [];
      
      // Filter out deleted posts
      const posts = allPosts.filter(post => !this.isPostDeleted(post));
      
      logger.info('PubkyAPISDK', 'Found annotation posts', { 
        totalCount: allPosts.length,
        filteredCount: posts.length,
        urlHashTag 
      });
      
      return posts;
    } catch (error) {
      logger.error('PubkyAPISDK', 'Failed to search annotations', error as Error);
      return [];
    }
  }

}

// Export singleton instance - constructor is now safe (doesn't initialize)
// Methods that need window will check before using it
export const pubkyAPISDK = PubkyAPISDK.getInstance();

