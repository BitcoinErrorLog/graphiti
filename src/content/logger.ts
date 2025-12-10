/**
 * Inline logger for content script contexts where importing the shared logger
 * would pull in unnecessary dependencies. Provides lightweight logging helpers.
 */
export class ContentLogger {
  private logPrefix = '[Graphiti]';

  info(context: string, message: string, data?: unknown) {
    console.log(`${this.logPrefix} [INFO] ${context}: ${message}`, data || '');
  }

  warn(context: string, message: string, data?: unknown) {
    console.warn(`${this.logPrefix} [WARN] ${context}: ${message}`, data || '');
  }

  error(context: string, message: string, error?: Error | unknown) {
    console.error(`${this.logPrefix} [ERROR] ${context}: ${message}`, error || '');
  }

  debug(context: string, message: string, data?: unknown) {
    console.debug(`${this.logPrefix} [DEBUG] ${context}: ${message}`, data || '');
  }
}

export const contentLogger = new ContentLogger();

