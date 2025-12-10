/**
 * @fileoverview Performance monitoring utility.
 * 
 * Tracks and logs performance metrics for:
 * - Bundle sizes
 * - Storage usage patterns
 * - API call performance
 * - Operation timing
 * 
 * @module utils/performance-monitor
 */

import { logger } from './logger';
import { storage } from './storage';
import { annotationStorage } from './annotations';

/**
 * Performance metric types
 */
export type MetricType = 'bundle_size' | 'storage_usage' | 'api_call' | 'operation_timing';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  /** Metric type */
  type: MetricType;
  /** Metric name/identifier */
  name: string;
  /** Metric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Timestamp */
  timestamp: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * API call performance data
 */
export interface APICallMetric {
  /** API endpoint or operation name */
  endpoint: string;
  /** Request duration in milliseconds */
  duration: number;
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Storage usage snapshot
 */
export interface StorageUsageSnapshot {
  /** Total storage used in bytes */
  usedBytes: number;
  /** Total storage quota in bytes */
  quotaBytes: number;
  /** Percentage used */
  percentUsed: number;
  /** Breakdown by data type */
  breakdown: {
    drawings: number;
    annotations: number;
    bookmarks: number;
    profile: number;
    other: number;
  };
  /** Timestamp */
  timestamp: number;
}

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: APICallMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  private warningsEnabled = true;

  /**
   * Record a performance metric
   */
  record(type: MetricType, name: string, value: number, unit: string, context?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      type,
      name,
      value,
      unit,
      timestamp: Date.now(),
      context,
    };

    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant metrics
    if (this.shouldLogMetric(metric)) {
      logger.debug('PerformanceMonitor', `Metric recorded: ${name}`, { metric });
    }

    // Warn on performance issues
    if (this.warningsEnabled && this.shouldWarn(metric)) {
      this.warn(metric);
    }
  }

  /**
   * Record API call performance
   */
  recordAPICall(endpoint: string, duration: number, success: boolean, error?: string): void {
    const metric: APICallMetric = {
      endpoint,
      duration,
      success,
      error,
      timestamp: Date.now(),
    };

    this.apiCalls.push(metric);

    // Keep only last 100 API calls
    if (this.apiCalls.length > 100) {
      this.apiCalls = this.apiCalls.slice(-100);
    }

    // Log slow API calls
    if (duration > 5000) {
      logger.warn('PerformanceMonitor', `Slow API call: ${endpoint}`, { duration, success, error });
    }
  }

  /**
   * Get storage usage snapshot
   */
  async getStorageUsageSnapshot(): Promise<StorageUsageSnapshot> {
    try {
      const quota = await storage.checkStorageQuota();
      
      // Get detailed breakdown
      const drawings = await storage.getAllDrawings();
      const annotations = await annotationStorage.getAllAnnotations();
      const bookmarks = await storage.getBookmarks();
      const profile = await storage.getProfile();

      // Calculate sizes (approximate)
      let drawingsSize = 0;
      for (const url in drawings) {
        const base64Data = drawings[url].canvasData.split(',')[1] || '';
        drawingsSize += (base64Data.length * 3) / 4;
      }

      let annotationsSize = 0;
      for (const url in annotations) {
        annotationsSize += JSON.stringify(annotations[url]).length;
      }

      const bookmarksSize = JSON.stringify(bookmarks).length;
      const profileSize = profile ? JSON.stringify(profile).length : 0;

      // Estimate other storage (session, settings, etc.)
      const usedBytes = quota.usedMB * 1024 * 1024;
      const otherSize = usedBytes - drawingsSize - annotationsSize - bookmarksSize - profileSize;

      return {
        usedBytes,
        quotaBytes: quota.quotaMB * 1024 * 1024,
        percentUsed: quota.percentUsed,
        breakdown: {
          drawings: drawingsSize,
          annotations: annotationsSize,
          bookmarks: bookmarksSize,
          profile: profileSize,
          other: Math.max(0, otherSize),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('PerformanceMonitor', 'Failed to get storage snapshot', error as Error);
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    apiCalls: {
      total: number;
      averageDuration: number;
      slowCalls: number;
      failedCalls: number;
    };
    recentMetrics: PerformanceMetric[];
  } {
    const recentMetrics = this.metrics.slice(-50);
    
    const apiCalls = {
      total: this.apiCalls.length,
      averageDuration: this.apiCalls.length > 0
        ? this.apiCalls.reduce((sum, call) => sum + call.duration, 0) / this.apiCalls.length
        : 0,
      slowCalls: this.apiCalls.filter(call => call.duration > 5000).length,
      failedCalls: this.apiCalls.filter(call => !call.success).length,
    };

    return {
      totalMetrics: this.metrics.length,
      apiCalls,
      recentMetrics,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.apiCalls = [];
    logger.info('PerformanceMonitor', 'Metrics cleared');
  }

  /**
   * Enable/disable performance warnings
   */
  setWarningsEnabled(enabled: boolean): void {
    this.warningsEnabled = enabled;
  }

  /**
   * Check if metric should be logged
   */
  private shouldLogMetric(metric: PerformanceMetric): boolean {
    // Log bundle sizes, significant storage changes, slow operations
    if (metric.type === 'bundle_size') return true;
    if (metric.type === 'storage_usage' && metric.value > 80) return true; // > 80% used
    if (metric.type === 'operation_timing' && metric.value > 1000) return true; // > 1s
    return false;
  }

  /**
   * Check if metric should trigger warning
   */
  private shouldWarn(metric: PerformanceMetric): boolean {
    if (metric.type === 'storage_usage' && metric.value >= 90) return true;
    if (metric.type === 'operation_timing' && metric.value > 5000) return true; // > 5s
    if (metric.type === 'api_call' && metric.value > 10000) return true; // > 10s
    return false;
  }

  /**
   * Warn about performance issue
   */
  private warn(metric: PerformanceMetric): void {
    let message = '';
    switch (metric.type) {
      case 'storage_usage':
        message = `Storage usage is ${metric.value}% - consider cleaning up old data`;
        break;
      case 'operation_timing':
        message = `Slow operation detected: ${metric.name} took ${metric.value}${metric.unit}`;
        break;
      case 'api_call':
        message = `Slow API call: ${metric.name} took ${metric.value}${metric.unit}`;
        break;
    }

    if (message) {
      logger.warn('PerformanceMonitor', message, { metric });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper function to measure operation timing
 */
export async function measureOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    performanceMonitor.record('operation_timing', name, duration, 'ms');
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.record('operation_timing', name, duration, 'ms', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Helper function to measure API call performance
 */
export async function measureAPICall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(endpoint, duration, true);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(endpoint, duration, false, (error as Error).message);
    throw error;
  }
}
