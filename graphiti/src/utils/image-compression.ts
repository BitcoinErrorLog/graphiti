/**
 * @fileoverview Image compression utilities for optimizing drawing storage.
 * 
 * Provides functions to compress canvas images using WebP format (when supported)
 * or JPEG fallback, with configurable quality settings.
 * 
 * @module utils/image-compression
 */

import { logger } from './logger';
import { IMAGE_COMPRESSION_CONSTANTS } from './constants';
import { toError } from './type-guards';

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Quality level (0.0 to 1.0) - lower = smaller file, lower quality */
  quality?: number;
  /** Preferred format: 'webp' (smaller) or 'jpeg' (more compatible) */
  format?: 'webp' | 'jpeg';
  /** Maximum width/height to resize (maintains aspect ratio) */
  maxDimension?: number;
}

/**
 * Compression result
 */
export interface CompressionResult {
  /** Compressed data URL */
  dataUrl: string;
  /** Format used ('image/webp' or 'image/jpeg') */
  format: string;
  /** Original size in bytes (approximate) */
  originalSize: number;
  /** Compressed size in bytes (approximate) */
  compressedSize: number;
  /** Compression ratio (0.0 to 1.0) */
  compressionRatio: number;
}

/**
 * Default compression options
 */
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  quality: IMAGE_COMPRESSION_CONSTANTS.DEFAULT_QUALITY,
  format: IMAGE_COMPRESSION_CONSTANTS.PREFERRED_FORMAT,
  maxDimension: IMAGE_COMPRESSION_CONSTANTS.MAX_DIMENSION,
};

/**
 * Check if WebP format is supported
 */
function isWebPSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}

/**
 * Resize canvas if it exceeds max dimension
 */
function resizeCanvasIfNeeded(
  canvas: HTMLCanvasElement,
  maxDimension: number
): HTMLCanvasElement {
  const { width, height } = canvas;
  const maxSize = Math.max(width, height);

  if (maxSize <= maxDimension) {
    return canvas;
  }

  const scale = maxDimension / maxSize;
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (!ctx) {
    logger.warn('ImageCompression', 'Failed to get context for resized canvas');
    return canvas;
  }

  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  logger.info('ImageCompression', 'Canvas resized', {
    original: { width, height },
    resized: { width: newWidth, height: newHeight },
  });

  return resizedCanvas;
}

/**
 * Calculate approximate size of base64 data URL in bytes
 */
function calculateDataUrlSize(dataUrl: string): number {
  // Base64 is ~4/3 the size of binary data
  // Remove data URL prefix (e.g., "data:image/webp;base64,")
  const base64Data = dataUrl.split(',')[1] || '';
  return (base64Data.length * 3) / 4;
}

/**
 * Compress a canvas image
 * 
 * @param canvas - Canvas element to compress
 * @param options - Compression options
 * @returns Compression result with data URL and statistics
 */
export async function compressCanvas(
  canvas: HTMLCanvasElement,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Resize if needed
    const processedCanvas = resizeCanvasIfNeeded(canvas, opts.maxDimension);

    // Determine format
    const useWebP = opts.format === 'webp' && isWebPSupported();
    const mimeType = useWebP ? 'image/webp' : 'image/jpeg';
    const format = useWebP ? 'webp' : 'jpeg';

    // Get original size (approximate)
    const originalDataUrl = processedCanvas.toDataURL('image/png');
    const originalSize = calculateDataUrlSize(originalDataUrl);

    // Compress
    const compressedDataUrl = processedCanvas.toDataURL(mimeType, opts.quality);
    const compressedSize = calculateDataUrlSize(compressedDataUrl);

    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    logger.info('ImageCompression', 'Canvas compressed', {
      format,
      quality: opts.quality,
      originalSizeKB: (originalSize / 1024).toFixed(2),
      compressedSizeKB: (compressedSize / 1024).toFixed(2),
      compressionRatio: (compressionRatio * 100).toFixed(1) + '%',
    });

    return {
      dataUrl: compressedDataUrl,
      format: mimeType,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    logger.error('ImageCompression', 'Failed to compress canvas', toError(error));
    
    // Fallback to JPEG
    const fallbackDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const fallbackSize = calculateDataUrlSize(fallbackDataUrl);
    
    return {
      dataUrl: fallbackDataUrl,
      format: 'image/jpeg',
      originalSize: fallbackSize,
      compressedSize: fallbackSize,
      compressionRatio: 1,
    };
  }
}

/**
 * Get recommended quality setting based on storage quota usage
 * 
 * @param percentUsed - Percentage of storage quota used (0-100)
 * @returns Recommended quality (0.0 to 1.0)
 */
export function getRecommendedQuality(percentUsed: number): number {
  if (percentUsed >= 90) {
    return IMAGE_COMPRESSION_CONSTANTS.QUALITY_LEVELS.CRITICAL_USAGE;
  } else if (percentUsed >= 75) {
    return IMAGE_COMPRESSION_CONSTANTS.QUALITY_LEVELS.HIGH_USAGE;
  } else if (percentUsed >= 50) {
    return IMAGE_COMPRESSION_CONSTANTS.QUALITY_LEVELS.MEDIUM_USAGE;
  } else {
    return IMAGE_COMPRESSION_CONSTANTS.QUALITY_LEVELS.LOW_USAGE;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

