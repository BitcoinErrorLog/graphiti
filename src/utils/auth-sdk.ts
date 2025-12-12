import { logger } from './logger';
import { storage, Session } from './storage';
import { profileManager } from './profile-manager';
import { getPubkyClientAsync } from './pubky-client-factory';

/**
 * Pubky authentication using official @synonymdev/pubky SDK
 */

// Import types from SDK
type Client = any;
type AuthRequest = any;

const REQUIRED_CAPABILITIES = '/pub/pubky.app/:rw';
const RELAY_URL = 'https://httprelay.pubky.app/link/';

export interface AuthQRData {
  qrUrl: string;
  qrDataUrl: string;
  authRequest: AuthRequest;
}

class AuthManagerSDK {
  private static instance: AuthManagerSDK;
  private client: Client | null = null;
  private currentAuthRequest: AuthRequest | null = null;

  private constructor() {
    // Client will be initialized lazily via ensureClient()
  }
  
  /**
   * Validate capabilities format before use
   */
  private validateCapabilities(capabilities: string): string {
    if (!capabilities || typeof capabilities !== 'string') {
      throw new Error('Capabilities must be a non-empty string');
    }
    // Validate format - must start with /pub/
    if (!capabilities.startsWith('/pub/')) {
      throw new Error('Capabilities must start with /pub/');
    }
    return capabilities;
  }

  static getInstance(): AuthManagerSDK {
    if (!AuthManagerSDK.instance) {
      AuthManagerSDK.instance = new AuthManagerSDK();
    }
    return AuthManagerSDK.instance;
  }

  /**
   * Ensure Client is initialized using singleton factory
   */
  private async ensureClient(): Promise<Client> {
    if (!this.client) {
      this.client = await getPubkyClientAsync();
      logger.info('AuthSDK', 'Pubky Client initialized via singleton');
    }
    return this.client;
  }

  /**
   * Generate QR code for authentication using SDK
   */
  async generateAuthQR(): Promise<AuthQRData> {
    try {
      logger.info('AuthSDK', 'Generating auth QR code with SDK');

      const client = await this.ensureClient();
      
      // Validate capabilities before creating auth request
      const validatedCapabilities = this.validateCapabilities(REQUIRED_CAPABILITIES);
      
      // Create auth request with validated capabilities
      this.currentAuthRequest = client.authRequest(RELAY_URL, validatedCapabilities);
      
      // Get authorization URL (pubkyauth:// URL)
      const authUrl = this.currentAuthRequest.url();

      logger.info('AuthSDK', 'Auth request created', { authUrl });

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
        authRequest: this.currentAuthRequest,
      };
    } catch (error) {
      logger.error('AuthSDK', 'Failed to generate QR code', error as Error);
      throw error;
    }
  }

  /**
   * Wait for user to approve authentication
   */
  async awaitApproval(
    authRequest: AuthRequest,
    onSuccess: (session: Session) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      logger.info('AuthSDK', 'Waiting for user approval');

      // Wait for the response (PublicKey)
      const publicKey = await authRequest.response();

      logger.info('AuthSDK', 'Authentication successful!');

      // Extract the z32 encoded public key
      const pubkyId = publicKey.z32();
      
      // Create our session format
      const session: Session = {
        pubky: pubkyId,
        homeserver: 'pubky://' + pubkyId,
        sessionId: Date.now().toString(),
        capabilities: [REQUIRED_CAPABILITIES],
        timestamp: Date.now(),
      };

      // Store session data
      await this.storeSessionData(publicKey);

      // Save session to storage
      await storage.saveSession(session);

      logger.info('AuthSDK', 'Session created and stored', { pubky: pubkyId });
      
      // Initialize profile after authentication (async, don't block)
      this.initializeUserProfile(session).catch(error => {
        logger.warn('AuthSDK', 'Failed to initialize profile', error);
      });

      onSuccess(session);
    } catch (error) {
      logger.error('AuthSDK', 'Failed during approval wait', error as Error);
      onError(error as Error);
    }
  }

  /**
   * Initialize user profile after authentication
   * Ensures profile.json and index.html exist using ProfileManager
   */
  private async initializeUserProfile(session: Session): Promise<void> {
    try {
      logger.info('AuthSDK', 'Initializing user profile', { pubky: session.pubky });

      // Use ProfileManager to ensure profile exists
      // This will:
      // 1. Check for profile.json, create if missing
      // 2. Check for index.html, generate from profile.json if missing
      await profileManager.ensureProfile(session.pubky);

      logger.info('AuthSDK', 'Profile initialized successfully');
    } catch (error) {
      logger.error('AuthSDK', 'Failed to initialize profile', error as Error);
      throw error;
    }
  }

  /**
   * Store session data for later use
   */
  private async storeSessionData(publicKey: any): Promise<void> {
    try {
      // Store minimal session data
      await storage.setSetting('sessionData', {
        timestamp: Date.now(),
        pubkeyZ32: publicKey.z32(),
      });
      logger.debug('AuthSDK', 'Session data stored');
    } catch (error) {
      logger.error('AuthSDK', 'Failed to store session data', error as Error);
    }
  }

  /**
   * Get SDK session for making API calls
   */
  async getSDKSession(): Promise<any> {
    try {
      const session = await storage.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // For read operations, we can use the public storage API
      // For write operations, we'll need the authenticated session
      // This would require re-authentication or session persistence
      
      logger.debug('AuthSDK', 'Retrieved session for API calls');
      return session;
    } catch (error) {
      logger.error('AuthSDK', 'Failed to get SDK session', error as Error);
      throw error;
    }
  }

  /**
   * Stop the current auth flow
   */
  stopAuthFlow(): void {
    if (this.currentAuthRequest) {
      // Clean up the auth request
      this.currentAuthRequest = null;
      logger.info('AuthSDK', 'Auth request cancelled');
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
      await storage.setSetting('sessionData', null);
      this.currentAuthRequest = null;
      logger.info('AuthSDK', 'User signed out');
    } catch (error) {
      logger.error('AuthSDK', 'Failed to sign out', error as Error);
      throw error;
    }
  }
}

export const authManagerSDK = AuthManagerSDK.getInstance();

