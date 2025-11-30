/**
 * Logger Utility Tests
 * 
 * Tests for the logging system that provides debug output,
 * log persistence, and export functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to re-import logger after mocking chrome
let logger: any;
let LogLevel: any;

// Mock chrome.storage before importing logger
const mockLogs: any[] = [];
const mockChromeStorage = {
  local: {
    get: vi.fn((key) => {
      if (key === 'debugLogs') {
        return Promise.resolve({ debugLogs: mockLogs });
      }
      return Promise.resolve({});
    }),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  },
};

(globalThis as any).chrome = { storage: mockChromeStorage };

// Mock console.log to prevent noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Logger', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
    
    // Re-import to get fresh logger instance
    vi.resetModules();
    const loggerModule = await import('../logger');
    logger = loggerModule.logger;
    LogLevel = loggerModule.LogLevel;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  // ============================================
  // LogLevel Enum Tests
  // ============================================
  describe('LogLevel', () => {
    it('should have DEBUG level', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
    });

    it('should have INFO level', () => {
      expect(LogLevel.INFO).toBe('INFO');
    });

    it('should have WARN level', () => {
      expect(LogLevel.WARN).toBe('WARN');
    });

    it('should have ERROR level', () => {
      expect(LogLevel.ERROR).toBe('ERROR');
    });
  });

  // ============================================
  // Logging Method Tests
  // ============================================
  describe('Logging Methods', () => {
    it('should log debug messages', () => {
      logger.debug('TestContext', 'Debug message', { data: 'value' });
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('TestContext', 'Info message');
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('TestContext', 'Warning message');
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('TestContext', 'Error message', error);
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should include context in log output', () => {
      logger.info('MyComponent', 'Test message');
      
      const logCall = (console.log as any).mock.calls[0];
      expect(logCall).toBeDefined();
      expect(logCall.some((arg: any) => 
        typeof arg === 'string' && arg.includes('MyComponent')
      )).toBe(true);
    });
  });

  // ============================================
  // Log Retrieval Tests
  // ============================================
  describe('Log Retrieval', () => {
    it('should get logs as array', async () => {
      const logs = await logger.getLogs();
      
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should accumulate logs', async () => {
      const initialLogs = await logger.getLogs();
      const initialCount = initialLogs.length;
      
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');
      
      const newLogs = await logger.getLogs();
      expect(newLogs.length).toBe(initialCount + 2);
    });
  });

  // ============================================
  // Log Export Tests
  // ============================================
  describe('Log Export', () => {
    it('should export logs as JSON string', async () => {
      logger.info('ExportTest', 'Test message');
      
      const exported = await logger.exportLogs();
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should export valid JSON array', async () => {
      logger.info('ExportTest', 'Message 1');
      logger.info('ExportTest', 'Message 2');
      
      const exported = await logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should include log entry properties in export', async () => {
      logger.info('ExportTest', 'Test message', { key: 'value' });
      
      const exported = await logger.exportLogs();
      const parsed = JSON.parse(exported);
      const lastEntry = parsed[parsed.length - 1];
      
      expect(lastEntry).toHaveProperty('timestamp');
      expect(lastEntry).toHaveProperty('level');
      expect(lastEntry).toHaveProperty('context');
      expect(lastEntry).toHaveProperty('message');
    });
  });

  // ============================================
  // Log Clear Tests
  // ============================================
  describe('Log Clear', () => {
    it('should clear logs', async () => {
      logger.info('Test', 'Before clear');
      
      await logger.clearLogs();
      
      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith('debugLogs');
    });
  });

  // ============================================
  // Log Entry Format Tests
  // ============================================
  describe('Log Entry Format', () => {
    it('should create entry with timestamp', async () => {
      const beforeTime = new Date().toISOString();
      logger.info('Test', 'Timestamp test');
      const afterTime = new Date().toISOString();
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.timestamp).toBeDefined();
      expect(new Date(lastLog.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime() - 1000
      );
      expect(new Date(lastLog.timestamp).getTime()).toBeLessThanOrEqual(
        new Date(afterTime).getTime() + 1000
      );
    });

    it('should include level in entry', async () => {
      logger.warn('Test', 'Level test');
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.level).toBe('WARN');
    });

    it('should include context in entry', async () => {
      logger.info('MyContext', 'Context test');
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.context).toBe('MyContext');
    });

    it('should include message in entry', async () => {
      logger.info('Test', 'My test message');
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.message).toBe('My test message');
    });

    it('should include data in entry when provided', async () => {
      const testData = { key: 'value', num: 42 };
      logger.info('Test', 'Data test', testData);
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.data).toEqual(testData);
    });

    it('should include error details when provided', async () => {
      const error = new Error('Test error message');
      logger.error('Test', 'Error test', error);
      
      const logs = await logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.error).toBeDefined();
      expect(lastLog.error.message).toBe('Test error message');
    });
  });

  // ============================================
  // Singleton Pattern Tests
  // ============================================
  describe('Singleton', () => {
    it('should return same instance', async () => {
      // The logger is a singleton, so multiple references should be the same
      const { logger: logger1 } = await import('../logger');
      const { logger: logger2 } = await import('../logger');
      
      // They should be the same object reference
      expect(logger1).toBe(logger2);
    });
  });
});

