import { logger } from './logger';
import { storage, ProfileData } from './storage';
import { generateProfileHTML } from './profile-generator';
import { nexusClient } from './nexus-client';
import { imageHandler } from './image-handler';
import { createValidatedUser } from './pubky-specs';

/**
 * Profile Manager - Handles profile.json and index.html synchronization
 * 
 * Key principles:
 * 1. profile.json at /pub/pubky.app/profile.json is the source of truth
 * 2. index.html is always generated from profile.json
 * 3. App always checks if index.html exists and syncs it with profile.json
 */

export class ProfileManager {
  private static instance: ProfileManager;
  private client: any = null;

  private constructor() {}

  static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager();
    }
    return ProfileManager.instance;
  }

  /**
   * Initialize the Pubky client using singleton factory
   */
  private async ensureClient(): Promise<any> {
    if (!this.client) {
      const { getPubkyClientAsync } = await import('./pubky-client-factory');
      this.client = await getPubkyClientAsync();
    }
    return this.client;
  }

  /**
   * Fetch profile.json from homeserver
   */
  async fetchProfileJSON(pubkey: string): Promise<ProfileData | null> {
    try {
      const client = await this.ensureClient();
      const profilePath = `pubky://${pubkey}/pub/pubky.app/profile.json`;
      
      logger.info('ProfileManager', 'Fetching profile.json', { pubkey });
      
      const response = await client.fetch(profilePath);
      if (!response.ok) {
        logger.warn('ProfileManager', 'profile.json not found', { status: response.status });
        return null;
      }

      const text = await response.text();
      const profileData = JSON.parse(text) as ProfileData;
      
      logger.info('ProfileManager', 'profile.json fetched successfully');
      return profileData;
    } catch (error) {
      logger.error('ProfileManager', 'Failed to fetch profile.json', error as Error);
      return null;
    }
  }

  /**
   * Save profile.json to homeserver
   * Uses pubky-app-specs for validation, with fallback to simple JSON
   */
  async saveProfileJSON(pubkey: string, profile: ProfileData): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      
      logger.info('ProfileManager', 'Saving profile.json', { pubkey });
      
      let profileJson: string;
      let profilePath: string;
      
      // Try using pubky-app-specs for validation
      try {
        const validated = await createValidatedUser(
          pubkey,
          profile.name,
          profile.bio,
          profile.image,
          profile.links,
          profile.status
        );
        
        profileJson = validated.json;
        profilePath = validated.url;
        
        logger.info('ProfileManager', 'Profile validated with pubky-app-specs');
      } catch (specsError) {
        // Fallback: save simple profile.json without specs validation
        logger.warn('ProfileManager', 'pubky-app-specs validation failed, using simple format', specsError);
        
        // Create simple profile object
        const simpleProfile: any = {
          name: profile.name,
        };
        
        if (profile.bio) simpleProfile.bio = profile.bio;
        if (profile.image) simpleProfile.image = profile.image;
        if (profile.status) simpleProfile.status = profile.status;
        if (profile.links && profile.links.length > 0) simpleProfile.links = profile.links;
        
        profileJson = JSON.stringify(simpleProfile, null, 2);
        profilePath = `pubky://${pubkey}/pub/pubky.app/profile.json`;
        
        logger.info('ProfileManager', 'Using fallback simple profile format');
      }
      
      // Save to homeserver
      const response = await client.fetch(profilePath, {
        method: 'PUT',
        body: profileJson,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('ProfileManager', 'profile.json saved successfully');
      return true;
    } catch (error) {
      logger.error('ProfileManager', 'Failed to save profile.json', error as Error);
      return false;
    }
  }

  /**
   * Check if index.html exists
   */
  async checkIndexHTML(pubkey: string): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const indexPath = `pubky://${pubkey}/pub/pubky.app/index.html`;
      
      const response = await client.fetch(indexPath);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate and save index.html from profile data
   */
  async generateIndexHTML(pubkey: string, profile: ProfileData): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const indexPath = `pubky://${pubkey}/pub/pubky.app/index.html`;
      
      logger.info('ProfileManager', 'Generating index.html', { pubkey });
      
      // Resolve the image URL to a data URL if it's from homeserver
      let resolvedImageDataUrl: string | undefined;
      if (profile.image) {
        resolvedImageDataUrl = await imageHandler.resolveImageURL(profile.image, pubkey) || undefined;
      }
      
      // Generate HTML from profile
      const html = generateProfileHTML(profile, pubkey, resolvedImageDataUrl);
      
      // Upload to homeserver
      const response = await client.fetch(indexPath, {
        method: 'PUT',
        body: html,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('ProfileManager', 'index.html generated and saved successfully');
      return true;
    } catch (error) {
      logger.error('ProfileManager', 'Failed to generate index.html', error as Error);
      return false;
    }
  }

  /**
   * Ensure profile is properly set up
   * 1. Check for profile.json, create from Nexus data if missing
   * 2. Check for index.html, generate from profile.json if missing
   * 3. Return the profile data
   */
  async ensureProfile(pubkey: string): Promise<ProfileData | null> {
    try {
      logger.info('ProfileManager', 'Ensuring profile exists', { pubkey });

      // Step 1: Try to fetch profile.json
      let profileData = await this.fetchProfileJSON(pubkey);

      // Step 2: If profile.json doesn't exist, create it from Nexus data
      if (!profileData) {
        logger.info('ProfileManager', 'profile.json not found, creating from Nexus data');
        
        try {
          const userData = await nexusClient.getUser(pubkey);
          profileData = {
            name: userData.name || pubkey.substring(0, 16),
            bio: userData.bio || '',
            image: userData.image || '',
            status: '👋 Pubky User',
            links: userData.links || [],
          };
        } catch (nexusError) {
          logger.warn('ProfileManager', 'Could not fetch from Nexus, using defaults');
          profileData = {
            name: pubkey.substring(0, 16),
            bio: '',
            image: '',
            status: '👋 Pubky User',
            links: [],
          };
        }

        // Save the new profile.json
        await this.saveProfileJSON(pubkey, profileData);
      }

      // Step 3: Check if index.html exists
      const hasIndex = await this.checkIndexHTML(pubkey);
      
      // Step 4: Generate index.html if it doesn't exist
      if (!hasIndex) {
        logger.info('ProfileManager', 'index.html not found, generating from profile.json');
        await this.generateIndexHTML(pubkey, profileData);
      }

      // Cache locally
      await storage.saveProfile(profileData);

      return profileData;
    } catch (error) {
      logger.error('ProfileManager', 'Failed to ensure profile', error as Error);
      return null;
    }
  }

  /**
   * Save profile (updates both profile.json and index.html)
   */
  async saveProfile(pubkey: string, profile: ProfileData): Promise<boolean> {
    try {
      logger.info('ProfileManager', 'Saving profile', { pubkey });

      // Save profile.json
      const jsonSaved = await this.saveProfileJSON(pubkey, profile);
      if (!jsonSaved) {
        throw new Error('Failed to save profile.json');
      }

      // Generate and save index.html
      const htmlSaved = await this.generateIndexHTML(pubkey, profile);
      if (!htmlSaved) {
        throw new Error('Failed to generate index.html');
      }

      // Cache locally
      await storage.saveProfile(profile);

      logger.info('ProfileManager', 'Profile saved successfully');
      return true;
    } catch (error) {
      logger.error('ProfileManager', 'Failed to save profile', error as Error);
      return false;
    }
  }
}

export const profileManager = ProfileManager.getInstance();

