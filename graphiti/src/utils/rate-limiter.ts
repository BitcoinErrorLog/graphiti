/**
 * @fileoverview Rate limiting utility using token bucket algorithm.
 * 
 * Provides rate limiting for API calls to prevent abuse and
 * respect server rate limits.
 * 
 * @module utils/rate-limiter
 */

import { logger } from './logger';

/**
 * Configuration for rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens (requests) in the bucket */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Context name for logging */
  context?: string;
}

/**
 * Token bucket rate limiter.
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1 });
 * 
 * if (limiter.tryAcquire()) {
 *   await makeApiCall();
 * } else {
 *   console.log('Rate limited, try again later');
 * }
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private context: string;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.context = config.context || 'RateLimiter';
  }

  /**
   * Refill tokens based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to acquire a token. Returns true if successful.
   * @param tokens Number of tokens to acquire (default: 1)
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    logger.warn(this.context, 'Rate limited', {
      availableTokens: this.tokens,
      requestedTokens: tokens,
    });
    return false;
  }

  /**
   * Wait until a token is available, then acquire it.
   * @param tokens Number of tokens to acquire (default: 1)
   * @param timeout Maximum time to wait in milliseconds (default: 30000)
   */
  async acquire(tokens: number = 1, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.tryAcquire(tokens)) {
        return true;
      }
      
      // Wait for some tokens to refill
      const waitTime = Math.min(
        1000 / this.refillRate * tokens,
        timeout - (Date.now() - startTime)
      );
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    logger.warn(this.context, 'Rate limit timeout', { timeout, tokens });
    return false;
  }

  /**
   * Get current available tokens.
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter to full capacity.
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Default rate limiters for common API endpoints.
 */
export const apiRateLimiters = {
  /** Nexus API: 30 requests per second */
  nexus: new RateLimiter({ maxTokens: 30, refillRate: 30, context: 'NexusAPI' }),
  
  /** Pubky homeserver: 10 requests per second */
  pubky: new RateLimiter({ maxTokens: 10, refillRate: 10, context: 'PubkyAPI' }),
};

/**
 * Decorator function to add rate limiting to an async function.
 * @param fn Function to execute
 * @param limiter Rate limiter instance
 * @param tokens Number of tokens to acquire
 * @param timeout Maximum time to wait for token availability (default: 5000ms)
 */
export function withRateLimit<T>(
  fn: () => Promise<T>,
  limiter: RateLimiter,
  tokens: number = 1,
  timeout: number = 5000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    if (await limiter.acquire(tokens, timeout)) {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('Rate limit exceeded'));
    }
  });
}

