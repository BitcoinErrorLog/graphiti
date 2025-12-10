/**
 * @fileoverview Centralized error handling utility.
 * 
 * Provides standardized error handling across the extension:
 * - Error categorization and codes
 * - User-friendly error messages
 * - Automatic logging
 * - User notifications for critical errors
 * - Error reporting support (future: analytics)
 * 
 * @module utils/error-handler
 */

import { logger } from './logger';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /** Network/API errors */
  NETWORK = 'NETWORK',
  /** Authentication/authorization errors */
  AUTH = 'AUTH',
  /** Storage/quota errors */
  STORAGE = 'STORAGE',
  /** Validation errors */
  VALIDATION = 'VALIDATION',
  /** Configuration errors */
  CONFIG = 'CONFIG',
  /** Unknown/unexpected errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error codes for specific error types
 */
export enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_FAILED = 'NETWORK_FAILED',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  
  // Auth errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',
  STORAGE_READ_FAILED = 'STORAGE_READ_FAILED',
  
  // Validation errors
  VALIDATION_INVALID_URL = 'VALIDATION_INVALID_URL',
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  VALIDATION_LENGTH_EXCEEDED = 'VALIDATION_LENGTH_EXCEEDED',
  
  // Config errors
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Standardized error information
 */
export interface ErrorInfo {
  /** Error category */
  category: ErrorCategory;
  /** Specific error code */
  code: ErrorCode;
  /** User-friendly message */
  userMessage: string;
  /** Technical error message */
  technicalMessage: string;
  /** Original error object */
  originalError?: Error;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Whether this error should be shown to the user */
  showToUser: boolean;
  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Context where error occurred */
  context?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
  /** Whether to show notification to user */
  showNotification?: boolean;
  /** Custom user message */
  userMessage?: string;
  /** Whether error is retryable */
  retryable?: boolean;
}

/**
 * Categorize an error based on its message and properties
 */
function categorizeError(error: Error | unknown): ErrorCategory {
  if (!(error instanceof Error)) {
    return ErrorCategory.UNKNOWN;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    name.includes('network')
  ) {
    return ErrorCategory.NETWORK;
  }

  // Auth errors
  if (
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('session') ||
    message.includes('token')
  ) {
    return ErrorCategory.AUTH;
  }

  // Storage errors
  if (
    message.includes('quota') ||
    message.includes('storage') ||
    message.includes('disk') ||
    message.includes('space')
  ) {
    return ErrorCategory.STORAGE;
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('required')
  ) {
    return ErrorCategory.VALIDATION;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine error code from error
 */
function determineErrorCode(error: Error, category: ErrorCategory): ErrorCode {
  const message = error.message.toLowerCase();

  switch (category) {
    case ErrorCategory.NETWORK:
      if (message.includes('timeout')) return ErrorCode.NETWORK_TIMEOUT;
      if (message.includes('unavailable') || message.includes('offline')) {
        return ErrorCode.NETWORK_UNAVAILABLE;
      }
      return ErrorCode.NETWORK_FAILED;

    case ErrorCategory.AUTH:
      if (message.includes('required') || message.includes('not authenticated')) {
        return ErrorCode.AUTH_REQUIRED;
      }
      if (message.includes('expired') || message.includes('invalid')) {
        return ErrorCode.AUTH_INVALID;
      }
      return ErrorCode.AUTH_EXPIRED;

    case ErrorCategory.STORAGE:
      if (message.includes('quota')) return ErrorCode.STORAGE_QUOTA_EXCEEDED;
      if (message.includes('write') || message.includes('save')) {
        return ErrorCode.STORAGE_WRITE_FAILED;
      }
      return ErrorCode.STORAGE_READ_FAILED;

    case ErrorCategory.VALIDATION:
      if (message.includes('url')) return ErrorCode.VALIDATION_INVALID_URL;
      if (message.includes('length') || message.includes('exceeded')) {
        return ErrorCode.VALIDATION_LENGTH_EXCEEDED;
      }
      return ErrorCode.VALIDATION_INVALID_INPUT;

    default:
      return ErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Generate user-friendly error message
 */
function generateUserMessage(
  code: ErrorCode,
  _category: ErrorCategory, // Reserved for future use
  customMessage?: string
): string {
  if (customMessage) {
    return customMessage;
  }

  switch (code) {
    case ErrorCode.NETWORK_TIMEOUT:
      return 'The request timed out. Please check your internet connection and try again.';
    case ErrorCode.NETWORK_FAILED:
      return 'Network request failed. Please check your internet connection.';
    case ErrorCode.NETWORK_UNAVAILABLE:
      return 'Network unavailable. Please check your internet connection.';

    case ErrorCode.AUTH_REQUIRED:
      return 'Please sign in to continue.';
    case ErrorCode.AUTH_INVALID:
      return 'Authentication failed. Please sign in again.';
    case ErrorCode.AUTH_EXPIRED:
      return 'Your session has expired. Please sign in again.';

    case ErrorCode.STORAGE_QUOTA_EXCEEDED:
      return 'Storage quota exceeded. Please delete some drawings or annotations to free up space.';
    case ErrorCode.STORAGE_WRITE_FAILED:
      return 'Failed to save data. Please try again.';
    case ErrorCode.STORAGE_READ_FAILED:
      return 'Failed to load data. Please try again.';

    case ErrorCode.VALIDATION_INVALID_URL:
      return 'Invalid URL. Please check the URL and try again.';
    case ErrorCode.VALIDATION_INVALID_INPUT:
      return 'Invalid input. Please check your data and try again.';
    case ErrorCode.VALIDATION_LENGTH_EXCEEDED:
      return 'Input too long. Please shorten your input and try again.';

    case ErrorCode.CONFIG_MISSING:
      return 'Configuration error. Please contact support.';
    case ErrorCode.CONFIG_INVALID:
      return 'Invalid configuration. Please contact support.';

    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determine if error should be shown to user
 */
function shouldShowToUser(category: ErrorCategory, code: ErrorCode): boolean {
  // Always show critical errors
  if (category === ErrorCategory.AUTH || category === ErrorCategory.STORAGE) {
    return true;
  }

  // Show network errors that affect user actions
  if (category === ErrorCategory.NETWORK && code !== ErrorCode.NETWORK_UNAVAILABLE) {
    return true;
  }

  // Show validation errors
  if (category === ErrorCategory.VALIDATION) {
    return true;
  }

  return false;
}

/**
 * Determine if error is retryable
 */
function isRetryable(category: ErrorCategory, code: ErrorCode): boolean {
  // Network errors are usually retryable
  if (category === ErrorCategory.NETWORK) {
    return code !== ErrorCode.NETWORK_UNAVAILABLE;
  }

  // Storage write failures might be retryable
  if (category === ErrorCategory.STORAGE && code === ErrorCode.STORAGE_WRITE_FAILED) {
    return true;
  }

  // Auth and validation errors are not retryable
  return false;
}

/**
 * Show error notification to user
 */
function showNotification(errorInfo: ErrorInfo): void {
  // In Chrome Extension context, we can use chrome.notifications
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Graphiti Error',
      message: errorInfo.userMessage,
    });
  } else {
    // Fallback to console for non-extension contexts
    console.error('[Graphiti Error]', errorInfo.userMessage);
  }
}

/**
 * Centralized error handler class
 */
class ErrorHandler {
  /**
   * Handle an error with standardized processing
   */
  static handle(
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ): ErrorInfo {
    // Convert to Error if needed
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Categorize error
    const category = categorizeError(errorObj);
    const code = determineErrorCode(errorObj, category);

    // Generate messages
    const userMessage = generateUserMessage(code, category, options.userMessage);
    const technicalMessage = errorObj.message || 'Unknown error';

    // Determine flags
    const showToUser = options.showNotification ?? shouldShowToUser(category, code);
    const retryable = options.retryable ?? isRetryable(category, code);

    // Create error info
    const errorInfo: ErrorInfo = {
      category,
      code,
      userMessage,
      technicalMessage,
      originalError: errorObj,
      context: options.data,
      showToUser,
      retryable,
    };

    // Log error
    const logContext = options.context || 'ErrorHandler';
    logger.error(logContext, technicalMessage, errorObj, {
      category,
      code,
      ...options.data,
    });

    // Show notification if needed
    if (showToUser && options.showNotification !== false) {
      showNotification(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Handle error and throw standardized error
   */
  static handleAndThrow(
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ): never {
    const errorInfo = this.handle(error, options);
    const standardizedError = new Error(errorInfo.userMessage);
    (standardizedError as any).errorInfo = errorInfo;
    throw standardizedError;
  }

  /**
   * Handle error and return error info (doesn't throw)
   */
  static handleAndReturn(
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ): ErrorInfo {
    return this.handle(error, { ...options, showNotification: false });
  }

  /**
   * Create a user-friendly error message from error info
   */
  static formatUserMessage(errorInfo: ErrorInfo): string {
    return errorInfo.userMessage;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(errorInfo: ErrorInfo): boolean {
    return errorInfo.retryable;
  }
}

export default ErrorHandler;

