import { logger } from './logger';

/**
 * Image Handler - Properly handles images from Pubky homeservers
 * 
 * Supports:
 * - pubky://PUBKEY/path/to/image.jpg - Fetches from homeserver
 * - /path/to/image.jpg - Relative path on homeserver
 * - https://example.com/image.jpg - External URLs
 */

export class ImageHandler {
  private static instance: ImageHandler;
  private client: any = null;

  private constructor() {}

  static getInstance(): ImageHandler {
    if (!ImageHandler.instance) {
      ImageHandler.instance = new ImageHandler();
    }
    return ImageHandler.instance;
  }

  private async ensureClient(): Promise<any> {
    if (!this.client) {
      const { Client } = await import('@synonymdev/pubky');
      this.client = new Client();
    }
    return this.client;
  }

  /**
   * Resolve an image URL for display
   * Converts pubky:// URLs to data URLs
   */
  async resolveImageURL(imageUrl: string | undefined, pubkey?: string): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }

    try {
      // If it's already an HTTP/HTTPS URL, return as-is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // If it's a pubky:// URL, fetch and convert
      if (imageUrl.startsWith('pubky://')) {
        return await this.fetchPubkyImage(imageUrl);
      }

      // If it's a relative path and we have a pubkey, construct the full URL
      if (imageUrl.startsWith('/') && pubkey) {
        const fullUrl = `pubky://${pubkey}${imageUrl}`;
        return await this.fetchPubkyImage(fullUrl);
      }

      // If none of the above, treat as HTTP URL
      return imageUrl;
    } catch (error) {
      logger.error('ImageHandler', 'Failed to resolve image URL', error as Error, { imageUrl });
      return null;
    }
  }

  /**
   * Fetch an image from a pubky:// URL and convert to data URL
   */
  private async fetchPubkyImage(pubkyUrl: string): Promise<string | null> {
    try {
      logger.info('ImageHandler', 'Fetching image from homeserver', { pubkyUrl });

      const client = await this.ensureClient();
      const response = await client.fetch(pubkyUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the blob
      const blob = await response.blob();
      
      // Convert to data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.error('ImageHandler', 'Failed to fetch pubky image', error as Error, { pubkyUrl });
      return null;
    }
  }

  /**
   * Upload an image to the homeserver
   * @param imageData - Base64 data URL or Blob
   * @param pubkey - User's public key
   * @param filename - Optional filename (defaults to avatar.jpg)
   * @param onProgress - Optional progress callback (0-100)
   */
  async uploadImage(
    imageData: string | Blob,
    pubkey: string,
    filename: string = 'avatar.jpg',
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    try {
      logger.info('ImageHandler', 'Uploading image to homeserver', { pubkey, filename });

      const client = await this.ensureClient();
      const imagePath = `/pub/pubky.app/files/${filename}`;
      const fullUrl = `pubky://${pubkey}${imagePath}`;

      let blob: Blob;
      if (typeof imageData === 'string') {
        // Convert data URL to blob
        onProgress?.(10);
        const response = await fetch(imageData);
        blob = await response.blob();
        onProgress?.(30);
      } else {
        blob = imageData;
        onProgress?.(20);
      }

      // Simulate progress during upload (since fetch doesn't provide real progress)
      onProgress?.(50);
      
      const uploadResponse = await client.fetch(fullUrl, {
        method: 'PUT',
        body: blob,
        credentials: 'include',
      });

      onProgress?.(90);

      if (!uploadResponse.ok) {
        throw new Error(`HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`);
      }

      onProgress?.(100);
      logger.info('ImageHandler', 'Image uploaded successfully', { path: imagePath });
      return imagePath; // Return the relative path for profile.json
    } catch (error) {
      logger.error('ImageHandler', 'Failed to upload image', error as Error);
      return null;
    }
  }
}

export const imageHandler = ImageHandler.getInstance();

