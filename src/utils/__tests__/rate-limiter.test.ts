/**
 * Rate Limiter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter, withRateLimit } from '../rate-limiter';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tryAcquire', () => {
    it('should allow requests when tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should deny requests when no tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1 });
      
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should acquire multiple tokens at once', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      
      expect(limiter.tryAcquire(3)).toBe(true);
      expect(limiter.tryAcquire(3)).toBe(false);
      expect(limiter.tryAcquire(2)).toBe(true);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return current token count', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      
      expect(limiter.getAvailableTokens()).toBe(5);
      limiter.tryAcquire(2);
      expect(limiter.getAvailableTokens()).toBeCloseTo(3, 0);
    });
  });

  describe('reset', () => {
    it('should reset tokens to max', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      
      limiter.tryAcquire(5);
      expect(limiter.getAvailableTokens()).toBeLessThan(1);
      
      limiter.reset();
      expect(limiter.getAvailableTokens()).toBe(5);
    });
  });

  describe('refill', () => {
    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 100 }); // 100 tokens/sec
      
      limiter.tryAcquire(5);
      
      // Wait 50ms - should refill ~5 tokens
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(limiter.getAvailableTokens()).toBeGreaterThan(0);
    });

    it('should not exceed max tokens', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 100 });
      
      // Wait to potentially overfill
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(5);
    });
  });
});

describe('withRateLimit', () => {
  it('should execute function when rate limit allows', async () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await withRateLimit(fn, limiter);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalled();
  });

  it('should reject when rate limited', async () => {
    // Use a limiter with 1 token, exhaust it first
    const limiter = new RateLimiter({ maxTokens: 1, refillRate: 0.001 }); // Very slow refill
    const fn = vi.fn().mockResolvedValue('success');
    
    // Exhaust the token
    limiter.tryAcquire(1);
    
    // Use short timeout (100ms) for rate limit
    await expect(
      withRateLimit(fn, limiter, 1, 100)
    ).rejects.toThrow('Rate limit exceeded');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should propagate function errors', async () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('API error'));
    
    await expect(withRateLimit(fn, limiter)).rejects.toThrow('API error');
  });
});

