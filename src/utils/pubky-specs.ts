import { logger } from './logger';
import { PubkySpecsBuilder } from 'pubky-app-specs';

/**
 * Pubky App Specs integration
 * Uses pubky-app-specs for proper profile validation
 * Based on: https://www.npmjs.com/package/pubky-app-specs
 */

/**
 * Create and validate a user profile using pubky-app-specs
 * @param pubkyId - User's public key
 * @param name - Display name (required)
 * @param bio - Biography text (optional)
 * @param image - Avatar image URL or homeserver path (optional)
 * @param links - Array of links (optional)
 * @param status - Status text with emoji (optional)
 * @returns Validated profile JSON and path
 */
export async function createValidatedUser(
  pubkyId: string,
  name: string,
  bio?: string,
  image?: string,
  links?: Array<{ title: string; url: string }>,
  status?: string
): Promise<{ json: string; url: string }> {
  try {
    logger.info('PubkySpecs', 'Creating validated user profile', { 
      pubkyId, 
      name,
      bio,
      image,
      links,
      status
    });
    
    // Create specs builder for this user
    const specsBuilder = new PubkySpecsBuilder(pubkyId);
    
    // Convert links to JSON string if provided (per pubky-app-specs format)
    const linksJson = links && links.length > 0 ? JSON.stringify(links) : null;
    
    logger.info('PubkySpecs', 'Calling createUser with params', {
      name,
      bio: bio || null,
      image: image || null,
      linksJson,
      status: status || null
    });
    
    // Create user profile using pubky-app-specs
    // createUser(name, bio, image, links, status)
    const { user, meta } = specsBuilder.createUser(
      name,
      bio || null,
      image || null,
      linksJson,
      status || null
    );
    
    logger.info('PubkySpecs', 'User profile validated successfully', { url: meta.url });
    
    return {
      json: JSON.stringify(user.toJson(), null, 2),
      url: meta.url
    };
  } catch (error) {
    // Better error logging for WASM errors
    logger.error('PubkySpecs', 'Failed to validate user profile', error as Error);
    console.error('PubkySpecs detailed error:', error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`pubky-app-specs validation failed: ${error.message}`);
    }
    throw new Error(`pubky-app-specs validation failed: ${String(error)}`);
  }
}
