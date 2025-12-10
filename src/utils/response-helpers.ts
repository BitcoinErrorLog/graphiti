/**
 * @fileoverview Helper utilities for fetch response handling.
 * 
 * Provides safe response parsing and validation to reduce duplication.
 * 
 * @module utils/response-helpers
 */

import { logger } from './logger';
import { toError } from './type-guards';

/**
 * Safely parse JSON from a response
 */
export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  try {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      throw new Error('Empty response body');
    }

    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      logger.error('ResponseHelpers', 'Failed to parse JSON', toError(parseError), {
        status: response.status,
        statusText: response.statusText,
        bodyPreview: text.substring(0, 100),
      });
      throw new Error('Invalid JSON response');
    }
  } catch (error) {
    const errorObj = toError(error);
    logger.error('ResponseHelpers', 'Failed to parse response', errorObj);
    throw errorObj;
  }
}

/**
 * Validate response is OK before parsing
 */
export function validateResponse(response: Response): void {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

/**
 * Safely get response text
 */
export async function getResponseText(response: Response): Promise<string> {
  try {
    validateResponse(response);
    return await response.text();
  } catch (error) {
    logger.error('ResponseHelpers', 'Failed to get response text', toError(error));
    throw error;
  }
}

/**
 * Check if response is JSON
 */
export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  return contentType?.includes('application/json') ?? false;
}

