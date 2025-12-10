/**
 * @fileoverview Type guard utilities for safe type checking.
 * 
 * Provides type guards to replace unsafe type assertions throughout the codebase.
 * 
 * @module utils/type-guards
 */

/**
 * Type guard to check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is an Error-like object
 */
export function isErrorLike(value: unknown): value is { message: string; name?: string; stack?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Convert unknown value to Error safely
 */
export function toError(value: unknown): Error {
  if (isError(value)) {
    return value;
  }
  if (isErrorLike(value)) {
    const error = new Error(value.message);
    if (value.name) error.name = value.name;
    if (value.stack) error.stack = value.stack;
    return error;
  }
  return new Error(String(value));
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a valid HTML element
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

/**
 * Type guard to check if a value is a valid HTMLInputElement
 */
export function isHTMLInputElement(value: unknown): value is HTMLInputElement {
  return value instanceof HTMLInputElement;
}

/**
 * Type guard to check if a value is a valid HTMLButtonElement
 */
export function isHTMLButtonElement(value: unknown): value is HTMLButtonElement {
  return value instanceof HTMLButtonElement;
}

/**
 * Type guard to check if a value is a valid HTMLCanvasElement
 */
export function isHTMLCanvasElement(value: unknown): value is HTMLCanvasElement {
  return value instanceof HTMLCanvasElement;
}

/**
 * Type guard to check if a value is a valid HTMLTextAreaElement
 */
export function isHTMLTextAreaElement(value: unknown): value is HTMLTextAreaElement {
  return value instanceof HTMLTextAreaElement;
}

/**
 * Type guard to check if a value is a valid Range
 */
export function isRange(value: unknown): value is Range {
  return value instanceof Range;
}

/**
 * Type guard to check if a value is a valid Selection
 */
export function isSelection(value: unknown): value is Selection {
  return value instanceof Selection;
}

/**
 * Type guard to check if Chrome runtime has getContexts method
 */
export function hasGetContexts(chrome: typeof global.chrome): chrome is typeof global.chrome & {
  runtime: typeof global.chrome.runtime & {
    getContexts: (options: { contextTypes: string[]; documentUrls: string[] }) => Promise<any[]>;
  };
} {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    'getContexts' in chrome.runtime &&
    typeof (chrome.runtime as any).getContexts === 'function'
  );
}

/**
 * Safely get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isErrorLike(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Safely check if error message contains a string
 */
export function errorMessageIncludes(error: unknown, searchString: string): boolean {
  const message = getErrorMessage(error);
  return message.toLowerCase().includes(searchString.toLowerCase());
}

