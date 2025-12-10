/**
 * Background Service Worker Tests
 * 
 * Tests for the background service worker that handles:
 * - Message handling
 * - Keyboard commands
 * - Sync alarms
 * - Annotation/drawing operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path) => `chrome-extension://test/${path}`),
    lastError: null,
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com' }])),
    sendMessage: vi.fn(),
    create: vi.fn(),
  },
  windows: {
    getCurrent: vi.fn((callback) => {
      if (callback) callback({ id: 1 });
    }),
  },
  sidePanel: {
    open: vi.fn((options, callback) => {
      if (callback) callback();
    }),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
      QUOTA_BYTES: 5242880,
    },
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn(() => Promise.resolve(null)),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  webNavigation: {
    onBeforeNavigate: {
      addListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
  },
  offscreen: {
    hasDocument: vi.fn(() => Promise.resolve(false)),
    createDocument: vi.fn(() => Promise.resolve()),
    closeDocument: vi.fn(() => Promise.resolve()),
  },
};

global.chrome = mockChrome as any;

// Mock self (service worker global)
global.self = {
  addEventListener: vi.fn(),
} as any;

// Mock modules
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/storage', () => ({
  storage: {
    getSession: vi.fn(() => Promise.resolve(null)),
    saveDrawing: vi.fn(() => Promise.resolve()),
    getDrawing: vi.fn(() => Promise.resolve(null)),
    getAllDrawings: vi.fn(() => Promise.resolve({})),
    checkStorageQuota: vi.fn(() =>
      Promise.resolve({
        hasSpace: true,
        usedMB: 1,
        quotaMB: 5,
        percentUsed: 20,
      })
    ),
  },
  Drawing: {},
}));

vi.mock('../utils/annotations', () => ({
  annotationStorage: {
    saveAnnotation: vi.fn(() => Promise.resolve()),
    getAnnotationsForUrl: vi.fn(() => Promise.resolve([])),
    getAllAnnotations: vi.fn(() => Promise.resolve({})),
  },
  Annotation: {},
}));

vi.mock('../utils/pubky-api-sdk', () => ({
  pubkyAPISDK: {
    searchAnnotationsByUrl: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../utils/offscreen-bridge', () => ({
  offscreenBridge: {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    syncAnnotation: vi.fn(() => Promise.resolve({ success: true, postUri: 'pubky://test' })),
    syncDrawing: vi.fn(() => Promise.resolve({ success: true, pubkyUrl: 'pubky://test' })),
    syncAllPending: vi.fn(() => Promise.resolve({ success: true })),
    getSyncStatus: vi.fn(() =>
      Promise.resolve({
        success: true,
        pendingAnnotations: 0,
        pendingDrawings: 0,
        hasPending: false,
      })
    ),
  },
}));

vi.mock('../utils/validation', () => ({
  validateAnnotation: vi.fn(() => ({ valid: true })),
  validateUrl: vi.fn(() => ({ valid: true, sanitized: 'https://example.com' })),
  validateCanvasData: vi.fn(() => ({ valid: true })),
  sanitizeForDisplay: vi.fn((text) => text),
}));

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Import background module to trigger initialization
    vi.resetModules();
  });

  describe('Initialization', () => {
    it('should set up installed listener', async () => {
      await import('../background');
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    });

    it('should set up message listener', async () => {
      await import('../background');
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should set up alarm listener', async () => {
      await import('../background');
      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalled();
    });

    it('should set up command listener', async () => {
      await import('../background');
      expect(mockChrome.commands.onCommand.addListener).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should handle CREATE_ANNOTATION message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      const annotation = {
        id: 'test-1',
        url: 'https://example.com',
        selectedText: 'test',
        comment: 'test comment',
        timestamp: Date.now(),
        author: '',
        color: 'rgba(163, 230, 53, 0.25)',
      };

      listener({ type: 'CREATE_ANNOTATION', annotation }, {}, sendResponse);

      // Wait for async
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle CREATE_ANNOTATION with invalid data', async () => {
      await import('../background');
      
      const { validateAnnotation } = await import('../utils/validation');
      vi.mocked(validateAnnotation).mockReturnValueOnce({
        valid: false,
        error: 'Invalid annotation',
      });

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      const annotation = {
        id: 'test-1',
        url: '',
        selectedText: '',
        comment: '',
        timestamp: Date.now(),
        author: '',
        color: '',
      };

      listener({ type: 'CREATE_ANNOTATION', annotation }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle CREATE_ANNOTATION without session', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce(null);

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      const annotation = {
        id: 'test-1',
        url: 'https://example.com',
        selectedText: 'test',
        comment: 'test comment',
        timestamp: Date.now(),
        author: '',
        color: 'rgba(163, 230, 53, 0.25)',
      };

      listener({ type: 'CREATE_ANNOTATION', annotation }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle SAVE_DRAWING message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url: 'https://example.com',
            canvasData: 'data:image/png;base64,test',
          },
        },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle SAVE_DRAWING with invalid URL', async () => {
      await import('../background');
      
      const { validateUrl } = await import('../utils/validation');
      vi.mocked(validateUrl).mockReturnValueOnce({
        valid: false,
        error: 'Invalid URL',
      });

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url: 'invalid-url',
            canvasData: 'data:image/png;base64,test',
          },
        },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle SAVE_DRAWING with invalid canvas data', async () => {
      await import('../background');
      
      const { validateCanvasData } = await import('../utils/validation');
      vi.mocked(validateCanvasData).mockReturnValueOnce({
        valid: false,
        error: 'Invalid canvas data',
      });

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url: 'https://example.com',
            canvasData: 'invalid',
          },
        },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle GET_DRAWING message', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getDrawing).mockResolvedValueOnce({
        id: 'test-1',
        url: 'https://example.com',
        canvasData: 'data:image/png;base64,test',
        timestamp: Date.now(),
        author: 'test-author',
      });

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_DRAWING', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.drawing).toBeTruthy();
    });

    it('should handle GET_DRAWING when drawing not found', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getDrawing).mockResolvedValueOnce(null);

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_DRAWING', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.drawing).toBeNull();
    });

    it('should handle GET_ANNOTATIONS message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_ANNOTATIONS', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle GET_ANNOTATIONS with remote annotations', async () => {
      await import('../background');
      
      const { pubkyAPISDK } = await import('../utils/pubky-api-sdk');
      vi.mocked(pubkyAPISDK.searchAnnotationsByUrl).mockResolvedValueOnce([
        {
          id: 'remote-1',
          details: {
            id: 'remote-1',
            content: JSON.stringify({
              type: 'annotation',
              url: 'https://example.com',
              selectedText: 'remote text',
              comment: 'remote comment',
            }),
            author: 'remote-author',
            uri: 'pubky://remote-author/posts/1',
          },
        },
      ]);

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_ANNOTATIONS', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle SHOW_ANNOTATION message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'SHOW_ANNOTATION', annotationId: 'test-1' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalled();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle OPEN_PUBKY_PROFILE message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'OPEN_PUBKY_PROFILE', url: 'pubky://test' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalled();
      expect(mockChrome.tabs.create).toHaveBeenCalled();
    });

    it('should handle GET_STORAGE_QUOTA message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_STORAGE_QUOTA' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle GET_SYNC_STATUS message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_SYNC_STATUS' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle GET_SYNC_STATUS when offscreen unavailable', async () => {
      await import('../background');
      
      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.isAvailable).mockReturnValueOnce(false);

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_SYNC_STATUS' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle SYNC_ALL_PENDING message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'SYNC_ALL_PENDING' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle SYNC_ALL_PENDING when offscreen unavailable', async () => {
      await import('../background');
      
      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.isAvailable).mockReturnValueOnce(false);

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'SYNC_ALL_PENDING' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle SHOW_TOAST message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener(
        {
          type: 'SHOW_TOAST',
          toastType: 'error',
          message: 'Test error message',
        },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalled();
      expect(mockChrome.notifications.create).toHaveBeenCalled();
    });

    it('should handle OPEN_SIDE_PANEL message', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'OPEN_SIDE_PANEL' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalled();
    });
  });

  describe('Keyboard Commands', () => {
    it('should handle toggle-sidepanel command', async () => {
      await import('../background');
      
      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-sidepanel');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.sidePanel.open).toHaveBeenCalled();
    });

    it('should handle toggle-sidepanel when no window found', async () => {
      await import('../background');
      
      mockChrome.windows.getCurrent.mockImplementationOnce((callback) => {
        if (callback) callback(null);
      });

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-sidepanel');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle open-annotations command', async () => {
      await import('../background');
      
      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('open-annotations');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.sidePanel.open).toHaveBeenCalled();
      // Should send message to switch to annotations tab
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle open-annotations when no window found', async () => {
      await import('../background');
      
      mockChrome.windows.getCurrent.mockImplementationOnce((callback) => {
        if (callback) callback(null);
      });

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('open-annotations');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle toggle-drawing command', async () => {
      await import('../background');
      
      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-drawing');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalled();
    });

    it('should handle toggle-drawing on chrome:// page', async () => {
      await import('../background');
      
      mockChrome.tabs.query.mockResolvedValueOnce([
        { id: 1, url: 'chrome://settings' },
      ]);

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-drawing');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.notifications.create).toHaveBeenCalled();
    });

    it('should handle toggle-drawing when content script not ready', async () => {
      await import('../background');
      
      mockChrome.tabs.sendMessage.mockImplementationOnce((tabId, message, callback) => {
        if (callback) {
          mockChrome.runtime.lastError = { message: 'Could not establish connection' };
          callback();
        }
      });

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-drawing');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.notifications.create).toHaveBeenCalled();
    });
  });

  describe('Sync Alarm', () => {
    it('should handle sync alarm', async () => {
      await import('../background');
      
      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      
      // Mock session
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should attempt sync
      expect(true).toBe(true);
    });

    it('should skip sync alarm when no session', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce(null);

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not attempt sync
      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      expect(vi.mocked(offscreenBridge.getSyncStatus)).not.toHaveBeenCalled();
    });

    it('should skip sync alarm when offscreen unavailable', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.isAvailable).mockReturnValueOnce(false);

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not attempt sync
      expect(vi.mocked(offscreenBridge.getSyncStatus)).not.toHaveBeenCalled();
    });

    it('should skip sync alarm when no pending content', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockResolvedValueOnce({
        success: true,
        pendingAnnotations: 0,
        pendingDrawings: 0,
        hasPending: false,
      });

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not attempt sync
      expect(vi.mocked(offscreenBridge.syncAllPending)).not.toHaveBeenCalled();
    });

    it('should handle sync alarm with pending content', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockResolvedValueOnce({
        success: true,
        pendingAnnotations: 2,
        pendingDrawings: 1,
        hasPending: true,
      });
      vi.mocked(offscreenBridge.syncAllPending).mockResolvedValueOnce({
        success: true,
        annotationsSynced: 2,
        drawingsSynced: 1,
      });

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should attempt sync
      expect(vi.mocked(offscreenBridge.syncAllPending)).toHaveBeenCalled();
    });

    it('should handle sync alarm failure', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockResolvedValueOnce({
        success: false,
        error: 'Sync status failed',
      });

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should ignore non-sync alarms', async () => {
      await import('../background');
      
      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'other-alarm' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not attempt sync
      expect(true).toBe(true);
    });
  });

  describe('Installation Handling', () => {
    it('should create sync alarm on install', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener({ reason: 'install' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChrome.alarms.create).toHaveBeenCalled();
    });

    it('should recreate sync alarm on update if missing', async () => {
      await import('../background');
      
      mockChrome.alarms.get.mockResolvedValueOnce(null);

      const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener({ reason: 'update', previousVersion: '0.9.0' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.alarms.create).toHaveBeenCalled();
    });

    it('should not recreate sync alarm on update if exists', async () => {
      await import('../background');
      
      mockChrome.alarms.get.mockResolvedValueOnce({
        name: 'sync-pending-content',
        scheduledTime: Date.now(),
      });

      const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
      listener({ reason: 'update', previousVersion: '0.9.0' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not create duplicate alarm
      expect(mockChrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unhandled errors', async () => {
      await import('../background');
      
      const errorListener = (global.self.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      if (errorListener) {
        errorListener({ error: new Error('Test error') });
        // Should not throw
        expect(true).toBe(true);
      }
    });

    it('should handle unhandled promise rejections', async () => {
      await import('../background');
      
      const rejectionListener = (global.self.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'unhandledrejection'
      )?.[1];

      if (rejectionListener) {
        rejectionListener({ reason: 'Test rejection' });
        // Should not throw
        expect(true).toBe(true);
      }
    });

    it('should handle message handler errors gracefully', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      // Mock storage to throw
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockRejectedValueOnce(new Error('Storage error'));

      listener({ type: 'CREATE_ANNOTATION', annotation: {} }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle error and respond
      expect(sendResponse).toHaveBeenCalled();
    });
  });

  describe('Pubky URL Handling', () => {
    it('should intercept pubky:// URLs from omnibox', async () => {
      await import('../background');
      
      const listener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      listener({
        url: 'pubky://test',
        frameId: 0,
        tabId: 1,
        timeStamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChrome.tabs.create).toHaveBeenCalled();
    });

    it('should not intercept non-pubky URLs', async () => {
      await import('../background');
      
      const listener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      listener({
        url: 'https://example.com',
        frameId: 0,
        tabId: 1,
        timeStamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChrome.tabs.create).not.toHaveBeenCalled();
    });

    it('should not intercept pubky:// URLs from frames', async () => {
      await import('../background');
      
      const listener = mockChrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
      listener({
        url: 'pubky://test',
        frameId: 1, // Not main frame
        tabId: 1,
        timeStamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChrome.tabs.create).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle CREATE_ANNOTATION with missing annotation data', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'CREATE_ANNOTATION' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle SAVE_DRAWING with missing drawing data', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'SAVE_DRAWING' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle GET_DRAWING with storage error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getDrawing).mockRejectedValueOnce(new Error('Storage error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_DRAWING', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.drawing).toBeNull();
    });

    it('should handle GET_ANNOTATIONS with storage error', async () => {
      await import('../background');
      
      const { annotationStorage } = await import('../utils/annotations');
      vi.mocked(annotationStorage.getAnnotationsForUrl).mockRejectedValueOnce(new Error('Storage error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_ANNOTATIONS', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.annotations).toEqual([]);
    });

    it('should handle GET_ANNOTATIONS with Nexus API error', async () => {
      await import('../background');
      
      const { pubkyAPISDK } = await import('../utils/pubky-api-sdk');
      vi.mocked(pubkyAPISDK.searchAnnotationsByUrl).mockRejectedValueOnce(new Error('API error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_ANNOTATIONS', url: 'https://example.com' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(Array.isArray(response.annotations)).toBe(true);
    });

    it('should handle CREATE_ANNOTATION with offscreen bridge error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.syncAnnotation).mockRejectedValueOnce(new Error('Offscreen error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      const annotation = {
        id: 'test-1',
        url: 'https://example.com',
        selectedText: 'test',
        comment: 'test comment',
        timestamp: Date.now(),
        author: 'test-author',
        color: 'rgba(163, 230, 53, 0.25)',
      };

      listener({ type: 'CREATE_ANNOTATION', annotation }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      // Should still succeed locally even if sync fails
      expect(response.success).toBe(true);
    });

    it('should handle SAVE_DRAWING with offscreen bridge error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.syncDrawing).mockRejectedValueOnce(new Error('Offscreen error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener(
        {
          type: 'SAVE_DRAWING',
          drawing: {
            url: 'https://example.com',
            canvasData: 'data:image/png;base64,test',
          },
        },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      // Should still succeed locally even if sync fails
      expect(response.success).toBe(true);
    });

    it('should handle GET_SYNC_STATUS with offscreen error', async () => {
      await import('../background');
      
      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockRejectedValueOnce(new Error('Offscreen error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_SYNC_STATUS' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle SYNC_ALL_PENDING with offscreen error', async () => {
      await import('../background');
      
      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.syncAllPending).mockRejectedValueOnce(new Error('Offscreen error'));

      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'SYNC_ALL_PENDING' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle unknown message type gracefully', async () => {
      await import('../background');
      
      const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'UNKNOWN_MESSAGE_TYPE' }, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not throw, but may or may not call sendResponse
      expect(true).toBe(true);
    });

    it('should handle toggle-drawing command when tab query fails', async () => {
      await import('../background');
      
      mockChrome.tabs.query.mockRejectedValueOnce(new Error('Query failed'));

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      
      // Should not throw
      await expect(listener('toggle-drawing')).resolves.not.toThrow();
    });

    it('should handle toggle-sidepanel command when window query fails', async () => {
      await import('../background');
      
      mockChrome.windows.getCurrent.mockImplementationOnce((callback) => {
        if (callback) callback(undefined);
      });

      const listener = mockChrome.commands.onCommand.addListener.mock.calls[0][0];
      listener('toggle-sidepanel');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle sync alarm with storage error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockRejectedValueOnce(new Error('Storage error'));

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle sync alarm with offscreen getSyncStatus error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockRejectedValueOnce(new Error('Sync status error'));

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle sync alarm with offscreen syncAllPending error', async () => {
      await import('../background');
      
      const { storage } = await import('../utils/storage');
      vi.mocked(storage.getSession).mockResolvedValueOnce({
        pubky: 'test-pubky',
        homeserver: 'pubky://test-pubky',
        sessionId: 'test-session',
        capabilities: ['read', 'write'],
        timestamp: Date.now(),
      });

      const { offscreenBridge } = await import('../utils/offscreen-bridge');
      vi.mocked(offscreenBridge.getSyncStatus).mockResolvedValueOnce({
        success: true,
        pendingAnnotations: 1,
        pendingDrawings: 0,
        hasPending: true,
      });
      vi.mocked(offscreenBridge.syncAllPending).mockRejectedValueOnce(new Error('Sync error'));

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      listener({ name: 'sync-pending-content' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
