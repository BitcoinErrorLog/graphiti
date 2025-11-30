/**
 * Retry Utility Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  withRetry, 
  isRetryableNetworkError, 
  isRetryableHttpError 
} from '../retry';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(fn, { maxRetries: 0 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { 
      maxRetries: 1, 
      initialDelay: 1, // 1ms for fast tests
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(
      withRetry(fn, { maxRetries: 1, initialDelay: 1 })
    ).rejects.toThrow('Always fails');
    
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('should use shouldRetry to filter errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Retryable error'))
      .mockRejectedValueOnce(new Error('Fatal error'));
    
    await expect(
      withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1,
        shouldRetry: (error) => error.message.includes('Retryable'),
      })
    ).rejects.toThrow('Fatal error');
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should include context in logs', async () => {
    const { logger } = await import('../logger');
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValue('success');
    
    await withRetry(fn, {
      maxRetries: 1,
      initialDelay: 1,
      context: 'TestOperation',
    });
    
    expect(logger.warn).toHaveBeenCalledWith(
      'TestOperation',
      expect.stringContaining('failed'),
      expect.any(Object)
    );
  });
});

describe('isRetryableNetworkError', () => {
  it('should return true for network errors', () => {
    expect(isRetryableNetworkError(new Error('Network error'))).toBe(true);
    expect(isRetryableNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isRetryableNetworkError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableNetworkError(new Error('Connection timeout'))).toBe(true);
  });

  it('should return false for non-network errors', () => {
    expect(isRetryableNetworkError(new Error('Invalid input'))).toBe(false);
    expect(isRetryableNetworkError(new Error('Not found'))).toBe(false);
    expect(isRetryableNetworkError(new Error('Permission denied'))).toBe(false);
  });
});

describe('isRetryableHttpError', () => {
  it('should return true for server errors (5xx)', () => {
    expect(isRetryableHttpError(500)).toBe(true);
    expect(isRetryableHttpError(502)).toBe(true);
    expect(isRetryableHttpError(503)).toBe(true);
    expect(isRetryableHttpError(504)).toBe(true);
  });

  it('should return true for rate limiting (429)', () => {
    expect(isRetryableHttpError(429)).toBe(true);
  });

  it('should return true for request timeout (408)', () => {
    expect(isRetryableHttpError(408)).toBe(true);
  });

  it('should return false for client errors (4xx)', () => {
    expect(isRetryableHttpError(400)).toBe(false);
    expect(isRetryableHttpError(401)).toBe(false);
    expect(isRetryableHttpError(403)).toBe(false);
    expect(isRetryableHttpError(404)).toBe(false);
  });

  it('should return false for success codes', () => {
    expect(isRetryableHttpError(200)).toBe(false);
    expect(isRetryableHttpError(201)).toBe(false);
    expect(isRetryableHttpError(204)).toBe(false);
  });
});
