import { logger } from './logger';
import { storage, Session } from './storage';
import {
  generateClientSecret,
  sha256,
  base64UrlEncode,
  decryptAuthToken,
  parseAuthToken,
  AuthToken,
} from './crypto';

/**
 * Pubky authentication using QR code and Ring flow
 */

const RELAY_URL = 'https://demo.httprelay.io/link';
const REQUIRED_CAPABILITIES = '/pub/pubky.app/:rw';

export interface AuthQRData {
  qrUrl: string;
  qrDataUrl: string;
  channelId: string;
  clientSecret: Uint8Array;
}

class AuthManager {
  private static instance: AuthManager;
  private pollingInterval: number | null = null;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Generate QR code for authentication
   */
  async generateAuthQR(): Promise<AuthQRData> {
    try {
      logger.info('Auth', 'Generating auth QR code');

      // Generate client secret
      const clientSecret = generateClientSecret();
      const clientSecretBase64 = base64UrlEncode(clientSecret);

      // Calculate channel ID
      const channelIdBytes = await sha256(clientSecret);
      const channelId = base64UrlEncode(channelIdBytes);

      // Build auth URL
      const authUrl = `pubkyauth:///?relay=${encodeURIComponent(RELAY_URL)}&caps=${encodeURIComponent(REQUIRED_CAPABILITIES)}&secret=${clientSecretBase64}`;

      logger.debug('Auth', 'Auth URL generated', { channelId });

      // Generate QR code using qrcode library
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(authUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return {
        qrUrl: authUrl,
        qrDataUrl,
        channelId,
        clientSecret,
      };
    } catch (error) {
      logger.error('Auth', 'Failed to generate QR code', error as Error);
      throw error;
    }
  }

  /**
   * Poll the relay for the auth token
   */
  async pollForAuthToken(
    channelId: string,
    clientSecret: Uint8Array,
    onSuccess: (session: Session) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const relayChannelUrl = `${RELAY_URL}/${channelId}`;
    logger.info('Auth', 'Starting to poll for auth token', { relayChannelUrl });

    const poll = async () => {
      try {
        logger.debug('Auth', 'Polling relay...');
        
        const response = await fetch(relayChannelUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream',
          },
        });

        if (response.status === 200) {
          logger.info('Auth', 'Auth token received!');
          
          // Get encrypted token
          const encryptedTokenArrayBuffer = await response.arrayBuffer();
          const encryptedToken = new Uint8Array(encryptedTokenArrayBuffer);

          // Decrypt token
          const decryptedToken = decryptAuthToken(encryptedToken, clientSecret);

          // Parse token
          const authToken = parseAuthToken(decryptedToken);

          // Resolve homeserver (for now, we'll use a demo homeserver)
          // In production, this would involve DHT lookup
          const homeserver = await this.resolveHomeserver(authToken.pubky);

          // Create session with homeserver
          const session = await this.createSession(homeserver, authToken);

          // Save session
          await storage.saveSession(session);

          // Stop polling
          if (this.pollingInterval !== null) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }

          logger.info('Auth', 'Authentication successful!', { pubky: session.pubky });
          onSuccess(session);
        } else if (response.status === 204) {
          // No content yet, continue polling
          logger.debug('Auth', 'No token yet, continuing to poll...');
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (error) {
        logger.error('Auth', 'Error while polling', error as Error);
        if (this.pollingInterval !== null) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
        onError(error as Error);
      }
    };

    // Start polling every 2 seconds
    this.pollingInterval = setInterval(poll, 2000) as any;
    
    // Do first poll immediately
    poll();
  }

  /**
   * Stop polling for auth token
   */
  stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Auth', 'Stopped polling for auth token');
    }
  }

  /**
   * Resolve homeserver for a pubky
   * In production, this would query the DHT
   * For now, we'll use a demo/testing homeserver
   */
  private async resolveHomeserver(pubky: string): Promise<string> {
    logger.debug('Auth', 'Resolving homeserver', { pubky });
    
    // For development, we can use the pubky itself as homeserver URL
    // or use a known test homeserver
    const homeserver = `https://demo.homeserver.io`; // placeholder
    
    logger.info('Auth', 'Homeserver resolved', { homeserver });
    return homeserver;
  }

  /**
   * Create a session with the homeserver
   */
  private async createSession(homeserver: string, authToken: AuthToken): Promise<Session> {
    try {
      logger.info('Auth', 'Creating session with homeserver', { homeserver });

      // In a real implementation, we would send the auth token to the homeserver
      // and receive a session ID. For this demo, we'll simulate it.
      
      // For now, create a mock session
      const session: Session = {
        pubky: authToken.pubky,
        homeserver,
        sessionId: base64UrlEncode(generateClientSecret()), // mock session ID
        capabilities: authToken.capabilities,
        timestamp: Date.now(),
      };

      logger.info('Auth', 'Session created successfully');
      return session;
    } catch (error) {
      logger.error('Auth', 'Failed to create session', error as Error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    return await storage.getSession();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await storage.clearSession();
      logger.info('Auth', 'User signed out');
    } catch (error) {
      logger.error('Auth', 'Failed to sign out', error as Error);
      throw error;
    }
  }
}

export const authManager = AuthManager.getInstance();

