/**
 * @fileoverview Retry utility with exponential backoff for API calls.
 * 
 * Provides a wrapper function that automatically retries failed operations
 * with configurable delays and retry counts.
 * 
 * @module utils/retry
 */

import { logger } from './logger';

/**
 * Configuration options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;
  /** Multiplier for each subsequent retry (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay between retries in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: Error) => boolean;
  /** Context string for logging */
  context?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  shouldRetry: () => true,
  context: 'Retry',
};

/**
 * Wraps an async function with retry logic and exponential backoff.
 * 
 * @param fn - The async function to wrap with retry logic
 * @param options - Configuration options for retry behavior
 * @returns A promise that resolves with the function result or rejects after all retries fail
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, context: 'API' }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt >= opts.maxRetries || !opts.shouldRetry(lastError)) {
        break;
      }

      logger.warn(opts.context, `Attempt ${attempt + 1} failed, retrying...`, {
        error: lastError.message,
        nextDelay: delay,
        attemptsRemaining: opts.maxRetries - attempt,
      });

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  logger.error(opts.context, `All ${opts.maxRetries + 1} attempts failed`, lastError!);
  throw lastError;
}

/**
 * Helper function to sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Predefined retry condition for network errors.
 * Returns true for errors that are likely transient and worth retrying.
 */
export function isRetryableNetworkError(error: Error): boolean {
  const retryableMessages = [
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'fetch failed',
    'failed to fetch',
    'network request failed',
  ];

  const message = error.message.toLowerCase();
  return retryableMessages.some(msg => message.includes(msg));
}

/**
 * Predefined retry condition for HTTP status codes.
 * Returns true for 5xx errors and some specific 4xx errors.
 */
export function isRetryableHttpError(status: number): boolean {
  // Retry on server errors (5xx) and rate limiting (429)
  return status >= 500 || status === 429 || status === 408;
}

