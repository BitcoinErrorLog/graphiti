/**
 * Profile Renderer
 * Loads and displays Pubky profiles from homeservers
 */

import { imageHandler } from '../utils/image-handler';
import DOMPurify from 'dompurify';

// Inline logger for profile renderer
class ProfileRendererLogger {
  private logPrefix = '[ProfileRenderer]';

  info(message: string, data?: any) {
    console.log(`${this.logPrefix} [INFO] ${message}`, data || '');
  }

  warn(message: string, data?: any) {
    console.warn(`${this.logPrefix} [WARN] ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`${this.logPrefix} [ERROR] ${message}`, error || '');
  }
}

const rendererLogger = new ProfileRendererLogger();

interface PubkyURL {
  publicKey: string;
  path: string;
  isRoot: boolean;
}

class ProfileRenderer {
  private loadingEl: HTMLElement;
  private errorEl: HTMLElement;
  private errorMessageEl: HTMLElement;
  private errorDetailsEl: HTMLElement;
  private contentEl: HTMLElement;
  private pubky: any = null;

  constructor() {
    this.loadingEl = document.getElementById('loading')!;
    this.errorEl = document.getElementById('error')!;
    this.errorMessageEl = document.getElementById('error-message')!;
    this.errorDetailsEl = document.getElementById('error-details')!;
    this.contentEl = document.getElementById('profile-content')!;

    this.init();
  }

  private async init() {
    try {
      // Initialize Pubky client
      await this.initializePubky();

      // Parse URL parameters
      const pubkyURL = this.parseURL();
      if (!pubkyURL) {
        this.showError('Invalid URL', 'The URL format is invalid. Expected: pubky://PUBLIC_KEY[/path]');
        return;
      }

      rendererLogger.info('Loading profile', pubkyURL);

      // Load the profile or content
      await this.loadContent(pubkyURL);
    } catch (error) {
      rendererLogger.error('Initialization failed', error);
      this.showError(
        'Failed to initialize',
        'An error occurred while initializing the profile renderer.',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async initializePubky() {
    try {
      const { getPubkyClientAsync } = await import('../utils/pubky-client-factory');
      this.pubky = await getPubkyClientAsync();
      rendererLogger.info('Pubky Client initialized via singleton');
    } catch (error) {
      rendererLogger.error('Failed to initialize Pubky Client', error);
      throw new Error('Failed to initialize Pubky client');
    }
  }

  private parseURL(): PubkyURL | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');

      if (!url) {
        return null;
      }

      rendererLogger.info('Parsing URL', { url });

      // Support pubky:// scheme only
      const match = url.match(/^pubky:\/\/([^\/]+)(\/.*)?$/);
      if (!match) {
        return null;
      }

      const publicKey = match[1];
      const path = match[2] || '/';
      const isRoot = path === '/';

      return {
        publicKey,
        path,
        isRoot,
      };
    } catch (error) {
      rendererLogger.error('Failed to parse URL', error);
      return null;
    }
  }

  private async loadContent(pubkyURL: PubkyURL) {
    try {
      if (pubkyURL.isRoot) {
        // Load profile from index.html
        await this.loadProfile(pubkyURL.publicKey);
      } else {
        // Try to load index.html from path, or show raw content
        await this.loadPathContent(pubkyURL.publicKey, pubkyURL.path);
      }
    } catch (error) {
      rendererLogger.error('Failed to load content', error);
      this.showError(
        'Content Not Found',
        'The requested profile or content could not be found.',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async loadProfile(publicKey: string) {
    try {
      rendererLogger.info('Loading profile (checking profile.json first)', { publicKey });

      // Step 1: Try to fetch profile.json (source of truth)
      const profileJsonPath = `pubky://${publicKey}/pub/pubky.app/profile.json`;
      
      try {
        const jsonResponse = await this.pubky.fetch(profileJsonPath);
        
        if (jsonResponse.ok) {
          const profileText = await jsonResponse.text();
          const profileData = JSON.parse(profileText);
          
          rendererLogger.info('profile.json fetched successfully');
          
          // Resolve image URL if present
          let resolvedImageDataUrl: string | undefined;
          if (profileData.image) {
            resolvedImageDataUrl = await imageHandler.resolveImageURL(profileData.image, publicKey) || undefined;
          }
          
          // Generate HTML from profile.json
          const { generateProfileHTML } = await import('../utils/profile-generator');
          const html = generateProfileHTML(profileData, publicKey, resolvedImageDataUrl);
          
          // Display the generated HTML
          this.showContent(html, `${profileData.name || publicKey.substring(0, 16)} - Pubky Profile`);
          
          rendererLogger.info('Profile rendered from profile.json');
          return;
        }
      } catch (jsonError) {
        rendererLogger.warn('profile.json not found, trying index.html fallback', jsonError);
      }

      // Step 2: Fallback to index.html if profile.json doesn't exist
      const indexPath = `pubky://${publicKey}/pub/pubky.app/index.html`;
      try {
        const htmlResponse = await this.pubky.fetch(indexPath);
        
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          this.showContent(html, `${publicKey.substring(0, 16)}... - Pubky Profile`);
          rendererLogger.info('Profile loaded from index.html');
          return;
        }
      } catch (htmlError) {
        rendererLogger.warn('index.html not found either', htmlError);
      }

      // Step 3: Neither exists, generate from Nexus data
      rendererLogger.warn('No profile found, generating from Nexus data');
      await this.generateMissingProfile(publicKey);
      
    } catch (error) {
      rendererLogger.error('Failed to load profile', error);
      throw error;
    }
  }

  private async loadPathContent(publicKey: string, path: string) {
    try {
      rendererLogger.info('Loading path content', { publicKey, path });

      // Normalize path
      if (!path.startsWith('/')) {
        path = '/' + path;
      }

      // First, try to load index.html from the path
      const indexPath = path.endsWith('/') 
        ? `${path}index.html` 
        : `${path}/index.html`;
      
      const fullIndexPath = `pubky://${publicKey}${indexPath}`;
      
      try {
        rendererLogger.info('Trying to load index.html', { fullIndexPath });
        const response = await this.pubky.fetch(fullIndexPath);
        
        if (response.ok) {
          const html = await response.text();
          this.showContent(html, `${publicKey.substring(0, 16)}... - Pubky Content`);
          rendererLogger.info('Index.html loaded successfully');
          return;
        }
      } catch (indexError) {
        rendererLogger.info('No index.html found, trying raw file', indexError);
      }

      // If index.html doesn't exist, try loading the file directly
      const fullPath = `pubky://${publicKey}${path}`;
      const response = await this.pubky.fetch(fullPath);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'text/plain';
      
      if (contentType.includes('text/html')) {
        // It's HTML, show it directly
        const html = await response.text();
        this.showContent(html, `${publicKey.substring(0, 16)}... - Pubky Content`);
      } else {
        // Show raw content
        const text = await response.text();
        this.showRawContent(text, contentType, path);
      }

      rendererLogger.info('Content loaded successfully');
    } catch (error) {
      rendererLogger.error('Failed to load path content', error);
      throw error;
    }
  }

  private async showContent(html: string, title: string) {
    // Update document title
    document.title = title;

    // Hide loading and error
    this.loadingEl.classList.add('hidden');
    this.errorEl.classList.add('hidden');

    // Sanitize HTML from homeserver before displaying (critical security fix)
    this.contentEl.innerHTML = DOMPurify.sanitize(html);
    this.contentEl.classList.remove('hidden');
  }

  private showRawContent(content: string, contentType: string, path: string) {
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File: ${escapeHtml(path)}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Courier New', monospace;
            background: #1a1a2e;
            color: #e0e0e0;
          }
          .header {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .header-title {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 8px;
          }
          .header-info {
            font-size: 14px;
            color: rgba(224, 224, 224, 0.6);
          }
          .content {
            background: rgba(31, 31, 31, 0.8);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 8px;
            padding: 20px;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">📄 ${escapeHtml(path)}</div>
          <div class="header-info">Content-Type: ${escapeHtml(contentType)}</div>
        </div>
        <div class="content">${escapeHtml(content)}</div>
      </body>
      </html>
    `;

    this.showContent(html, `File: ${path}`);
  }

  private async generateMissingProfile(publicKey: string) {
    try {
      rendererLogger.info('Generating profile from available data', { publicKey });

      // Try to fetch user data from Nexus API
      const nexusApiUrl = 'https://nexus.pubky.app';
      const userUrl = `${nexusApiUrl}/v0/user/${publicKey}`;
      
      let name = publicKey.substring(0, 16) + '...';
      let bio = '';
      let image = '';
      let links: Array<{ title: string; url: string }> = [];

      try {
        const response = await fetch(userUrl);
        if (response.ok) {
          const userData = await response.json();
          name = userData.name || name;
          bio = userData.bio || '';
          image = userData.image || '';
          if (userData.links && Array.isArray(userData.links)) {
            links = userData.links;
          }
        }
      } catch (nexusError) {
        rendererLogger.warn('Could not fetch Nexus data', nexusError);
      }

      // Generate profile data using Pubky App standard format
      const profileData = {
        name,
        bio,
        image,
        status: '👋 Pubky User',
        links,
      };

      // Resolve image URL if present
      let resolvedImageDataUrl: string | undefined;
      if (image) {
        resolvedImageDataUrl = await imageHandler.resolveImageURL(image, publicKey) || undefined;
      }

      // Import and use the profile generator
      const { generateProfileHTML } = await import('../utils/profile-generator');
      const html = generateProfileHTML(profileData, publicKey, resolvedImageDataUrl);

      // Display the generated HTML
      this.showContent(html, `${name} - Pubky Profile`);
      
      rendererLogger.info('Profile generated successfully from available data');
    } catch (error) {
      rendererLogger.error('Failed to generate profile', error);
      
      // If all else fails, show error
      this.showError(
        'Profile Not Found',
        `This user hasn't created their Pubky profile yet. We tried to generate one from available data but couldn't.`,
        `Public Key: ${publicKey}\n\nThe user needs to sign into the Graphiti extension to create their profile.`
      );
    }
  }

  private showError(title: string, message: string, details?: string) {
    // Hide loading and content
    this.loadingEl.classList.add('hidden');
    this.contentEl.classList.add('hidden');

    // Update error message
    const errorTitleEl = this.errorEl.querySelector('.error-title')!;
    errorTitleEl.textContent = title;
    this.errorMessageEl.textContent = message;

    if (details) {
      this.errorDetailsEl.textContent = details;
      this.errorDetailsEl.classList.remove('hidden');
    } else {
      this.errorDetailsEl.classList.add('hidden');
    }

    // Show error
    this.errorEl.classList.remove('hidden');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ProfileRenderer();
  });
} else {
  new ProfileRenderer();
}

