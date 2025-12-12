/**
 * @fileoverview Environment-based configuration system.
 * 
 * Provides centralized configuration management with support for:
 * - Environment variables via Vite
 * - Default values for development
 * - Type-safe configuration access
 * 
 * @module config/config
 */

/**
 * Environment configuration
 */
export interface AppConfig {
  /** Nexus API base URL */
  nexusApiUrl: string;
  
  /** Pubky relay URL */
  pubkyRelayUrl: string;
  
  /** Environment name */
  environment: 'development' | 'production' | 'test';
  
  /** Whether to enable debug logging */
  enableDebugLogs: boolean;
  
  /** Log buffer size */
  logBufferSize: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppConfig = {
  nexusApiUrl: 'https://nexus.pubky.app',
  pubkyRelayUrl: 'https://httprelay.pubky.app/link/',
  environment: 'development',
  enableDebugLogs: true,
  logBufferSize: 1000,
};

/**
 * Get configuration from environment variables or defaults
 */
function loadConfig(): AppConfig {
  // Vite exposes env variables via import.meta.env
  // In Vite projects, import.meta.env is always available at build time
  // @ts-ignore - import.meta is a Vite feature (not in standard TypeScript lib)
  // This is safe as Vite transforms this at build time
  const viteEnv = (globalThis as any).import?.meta?.env || 
    (typeof window !== 'undefined' && (window as any).__VITE_ENV__) ||
    {};
  
  // Fall back to process.env for Node.js environments (tests)
  const nodeEnv = typeof process !== 'undefined' ? process.env : {};
  
  // Combine both, with Vite env taking precedence
  const env = { ...nodeEnv, ...viteEnv };

  return {
    nexusApiUrl: env.VITE_NEXUS_API_URL || DEFAULT_CONFIG.nexusApiUrl,
    pubkyRelayUrl: env.VITE_PUBKY_RELAY_URL || DEFAULT_CONFIG.pubkyRelayUrl,
    environment: (env.VITE_ENVIRONMENT || env.NODE_ENV || 'development') as AppConfig['environment'],
    enableDebugLogs: env.VITE_ENABLE_DEBUG_LOGS !== 'false',
    logBufferSize: parseInt(env.VITE_LOG_BUFFER_SIZE || '1000', 10),
  };
}

/**
 * Application configuration singleton
 */
class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = loadConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Get the current configuration
   */
  get(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get a specific config value
   */
  getValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.config.environment === 'test';
  }
}

export const config = Config.getInstance();

// Export convenience getters
export const getConfig = () => config.get();
export const isDevelopment = () => config.isDevelopment();
export const isProduction = () => config.isProduction();
export const isTest = () => config.isTest();

