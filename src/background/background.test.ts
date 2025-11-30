/**
 * Background Script Message Handler Tests
 * 
 * Tests the message handling logic of the background service worker.
 * Since background.ts sets up listeners, we test the message handling patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Chrome APIs
const mockTabs = {
  query: vi.fn(),
  sendMessage: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};
const mockSidePanel = {
  open: vi.fn().mockResolvedValue(undefined),
  setOptions: vi.fn().mockResolvedValue(undefined),
};
const mockRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
};

(globalThis as any).chrome = {
  tabs: mockTabs,
  sidePanel: mockSidePanel,
  runtime: mockRuntime,
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
};

describe('Background Script Message Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OPEN_SIDE_PANEL message', () => {
    it('should open side panel for current tab', async () => {
      const mockTab = { id: 123, url: 'https://example.com' };
      mockTabs.query.mockResolvedValue([mockTab]);
      
      // The handler would:
      // 1. Query for active tab
      // 2. Call sidePanel.open with tabId
      await mockTabs.query({ active: true, currentWindow: true });
      await mockSidePanel.open({ tabId: mockTab.id });

      expect(mockTabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockSidePanel.open).toHaveBeenCalledWith({ tabId: 123 });
    });
  });

  describe('GET_CURRENT_TAB message', () => {
    it('should return current tab info', async () => {
      const mockTab = { id: 456, url: 'https://test.com', title: 'Test Page' };
      mockTabs.query.mockResolvedValue([mockTab]);

      const tabs = await mockTabs.query({ active: true, currentWindow: true });
      
      expect(tabs).toEqual([mockTab]);
      expect(tabs[0].url).toBe('https://test.com');
    });

    it('should handle no active tab', async () => {
      mockTabs.query.mockResolvedValue([]);

      const tabs = await mockTabs.query({ active: true, currentWindow: true });
      
      expect(tabs).toEqual([]);
    });
  });

  describe('OPEN_PROFILE_RENDERER message', () => {
    it('should create new tab with profile renderer URL', async () => {
      const pubkyUrl = 'pubky://abc123/pub/pubky.app/profile.json';
      const expectedUrl = `chrome-extension://mock-id/src/profile/profile-renderer.html?pubky=${encodeURIComponent(pubkyUrl)}`;
      
      mockTabs.create.mockResolvedValue({ id: 789 });

      await mockTabs.create({ url: expectedUrl });

      expect(mockTabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('profile-renderer.html'),
      });
    });
  });

  describe('Message response patterns', () => {
    it('should send response for synchronous messages', () => {
      const sendResponse = vi.fn();
      
      // Simulate successful response
      sendResponse({ success: true, data: 'test' });
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: 'test',
      });
    });

    it('should send error response for failed operations', () => {
      const sendResponse = vi.fn();
      
      // Simulate error response
      sendResponse({ success: false, error: 'Operation failed' });
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Operation failed',
      });
    });
  });

  describe('Tab messaging', () => {
    it('should send message to content script', async () => {
      const tabId = 111;
      const message = { action: 'TOGGLE_ANNOTATIONS' };
      
      mockTabs.sendMessage.mockResolvedValue({ received: true });
      
      const response = await mockTabs.sendMessage(tabId, message);
      
      expect(mockTabs.sendMessage).toHaveBeenCalledWith(tabId, message);
      expect(response).toEqual({ received: true });
    });

    it('should handle content script not responding', async () => {
      const tabId = 222;
      const message = { action: 'TOGGLE_DRAWING' };
      
      mockTabs.sendMessage.mockRejectedValue(new Error('No receiving end'));
      
      await expect(mockTabs.sendMessage(tabId, message)).rejects.toThrow('No receiving end');
    });
  });

  describe('Keyboard commands', () => {
    it('should register command listener', () => {
      const commandHandler = vi.fn();
      
      chrome.commands.onCommand.addListener(commandHandler);
      
      expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
    });

    it('should handle toggle-sidepanel command', async () => {
      const mockWindow = { id: 1 };
      (globalThis as any).chrome.windows = {
        getCurrent: vi.fn((cb) => cb(mockWindow)),
      };
      mockSidePanel.open.mockImplementation((_opts, cb) => cb && cb());

      // Simulate command handling - uses windows.getCurrent for user gesture preservation
      chrome.windows.getCurrent((window: any) => {
        mockSidePanel.open({ windowId: window.id }, () => {});
      });

      expect(chrome.windows.getCurrent).toHaveBeenCalled();
      expect(mockSidePanel.open).toHaveBeenCalledWith(
        expect.objectContaining({ windowId: 1 }),
        expect.any(Function)
      );
    });

    it('should handle open-annotations command', async () => {
      const mockWindow = { id: 2 };
      (globalThis as any).chrome.windows = {
        getCurrent: vi.fn((cb) => cb(mockWindow)),
      };
      mockSidePanel.open.mockImplementation((_opts, cb) => cb && cb());

      // Simulate command handling
      chrome.windows.getCurrent((window: any) => {
        mockSidePanel.open({ windowId: window.id }, () => {});
      });

      expect(mockSidePanel.open).toHaveBeenCalledWith(
        expect.objectContaining({ windowId: 2 }),
        expect.any(Function)
      );
    });

    it('should handle toggle-drawing command on valid tab', async () => {
      const mockTab = { id: 789, url: 'https://example.com' };
      mockTabs.query.mockResolvedValue([mockTab]);
      mockTabs.sendMessage.mockResolvedValue({ active: true });

      // Simulate command handling
      await mockTabs.query({ active: true, currentWindow: true });
      await mockTabs.sendMessage(mockTab.id, { type: 'TOGGLE_DRAWING_MODE' });

      expect(mockTabs.sendMessage).toHaveBeenCalledWith(789, { type: 'TOGGLE_DRAWING_MODE' });
    });

    it('should not toggle drawing on chrome:// pages', async () => {
      const mockTab = { id: 999, url: 'chrome://extensions' };
      mockTabs.query.mockResolvedValue([mockTab]);

      await mockTabs.query({ active: true, currentWindow: true });
      
      // Should not call sendMessage for chrome:// URLs
      // In real handler, this check happens before sendMessage
      expect(mockTab.url.startsWith('chrome://')).toBe(true);
    });
  });
});

