/**
 * Error capture utility - captures browser errors and stores them for debugging
 * This allows us to see errors without requiring screenshots
 */

interface CapturedError {
  timestamp: number;
  message: string;
  source: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url?: string;
}

interface ErrorInput {
  message: string;
  source: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url?: string;
}

class ErrorCapture {
  private static instance: ErrorCapture;
  private errors: CapturedError[] = [];
  private maxErrors = 100;

  private constructor() {
    this.setupErrorCapture();
  }

  static getInstance(): ErrorCapture {
    if (!ErrorCapture.instance) {
      ErrorCapture.instance = new ErrorCapture();
    }
    return ErrorCapture.instance;
  }

  private setupErrorCapture() {
    // Capture unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError({
          message: event.message,
          source: event.filename || 'unknown',
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          url: event.filename,
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          source: 'promise',
          stack: event.reason?.stack,
        });
      });
    }

    // Capture console errors if possible
    if (typeof console !== 'undefined' && console.error) {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        this.captureError({
          message: `Console Error: ${message}`,
          source: 'console',
        });
        originalError.apply(console, args);
      };
    }
  }

  private captureError(error: ErrorInput) {
    const captured: CapturedError = {
      ...error,
      timestamp: Date.now(),
    };

    this.errors.push(captured);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Try to save to storage (non-blocking)
    this.saveErrors().catch(() => {
      // Ignore storage errors
    });

    // Log to console for immediate visibility
    console.error('[ErrorCapture]', captured.message, captured);
  }

  private async saveErrors() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ 
          capturedErrors: this.errors,
          lastErrorCapture: Date.now()
        });
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  async getErrors(): Promise<CapturedError[]> {
    // Try to load from storage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const result = await chrome.storage.local.get('capturedErrors');
        if (result.capturedErrors) {
          this.errors = result.capturedErrors;
        }
      } catch (e) {
        // Ignore
      }
    }
    return [...this.errors];
  }

  async clearErrors() {
    this.errors = [];
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.remove('capturedErrors');
      } catch (e) {
        // Ignore
      }
    }
  }

  // Export errors as text for debugging
  async exportErrors(): Promise<string> {
    const errors = await this.getErrors();
    return errors.map((err, i) => {
      return `Error ${i + 1} (${new Date(err.timestamp).toISOString()}):
Message: ${err.message}
Source: ${err.source}${err.lineno ? `:${err.lineno}:${err.colno}` : ''}
${err.stack ? `Stack:\n${err.stack}` : ''}
${err.url ? `URL: ${err.url}` : ''}
---`;
    }).join('\n\n');
  }
}

export const errorCapture = ErrorCapture.getInstance();
