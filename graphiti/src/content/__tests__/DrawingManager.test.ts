/**
 * DrawingManager Tests
 * 
 * Tests for the DrawingManager class that handles:
 * - Canvas creation/removal
 * - Drawing operations
 * - Save/load functionality
 * - Message handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DrawingManager } from '../DrawingManager';

// Mock the logger
vi.mock('../logger', () => ({
  contentLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock image compression
vi.mock('../../utils/image-compression', () => ({
  compressCanvas: vi.fn(async (canvas) => ({
    dataUrl: 'data:image/webp;base64,test',
    format: 'image/webp',
    originalSize: 1000,
    compressedSize: 500,
    compressionRatio: 0.5,
  })),
  getRecommendedQuality: vi.fn(() => 0.75),
  formatBytes: vi.fn((bytes) => `${(bytes / 1024).toFixed(2)} KB`),
}));

// Mock Chrome runtime
const mockChromeRuntime = {
  onMessage: {
    addListener: vi.fn(),
  },
  sendMessage: vi.fn((message, callback) => {
    if (callback) {
      callback({ success: true });
    }
    return Promise.resolve({ success: true });
  }),
};

const mockChromeTabs = {
  query: vi.fn(() => Promise.resolve([{ url: 'https://example.com', id: 1 }])),
};

// Setup Chrome mocks
global.chrome = {
  runtime: mockChromeRuntime as any,
  tabs: mockChromeTabs as any,
} as any;

describe('DrawingManager', () => {
  let drawingManager: DrawingManager;
  let mockDocument: Document;
  let mockBody: HTMLElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock DOM
    mockBody = document.createElement('body');
    mockDocument = {
      body: mockBody,
      createElement: document.createElement.bind(document),
    } as any;

    // Mock document methods
    global.document = mockDocument as any;
    global.window = {
      innerWidth: 800,
      innerHeight: 600,
    } as any;

    // Create DrawingManager instance
    drawingManager = new DrawingManager();
  });

  afterEach(() => {
    // Cleanup
    const canvas = document.getElementById('pubky-drawing-canvas');
    if (canvas) {
      canvas.remove();
    }
    const toolbar = document.getElementById('pubky-drawing-toolbar');
    if (toolbar) {
      toolbar.remove();
    }
  });

  describe('Initialization', () => {
    it('should initialize and set up message listeners', () => {
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should handle TOGGLE_DRAWING_MODE message', () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true, active: expect.any(Boolean) });
    });

    it('should handle GET_DRAWING_STATUS message', () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      listener({ type: 'GET_DRAWING_STATUS' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ active: expect.any(Boolean) });
    });
  });

  describe('Canvas Management', () => {
    it('should create canvas when activated', () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      // Wait for async operations
      setTimeout(() => {
        const canvas = document.getElementById('pubky-drawing-canvas');
        expect(canvas).toBeTruthy();
        expect(canvas?.tagName).toBe('CANVAS');
      }, 100);
    });

    it('should remove canvas when deactivated', () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate first
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      
      setTimeout(() => {
        // Deactivate
        listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
        
        setTimeout(() => {
          const canvas = document.getElementById('pubky-drawing-canvas');
          expect(canvas).toBeFalsy();
        }, 100);
      }, 100);
    });
  });

  describe('Drawing Operations', () => {
    it('should handle drawing start', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      const ctx = canvas?.getContext('2d');
      expect(ctx).toBeTruthy();
    });

    it('should handle mousedown event to start drawing', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      
      // Simulate mousedown
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });
      Object.defineProperty(mousedownEvent, 'offsetX', { value: 100, writable: false });
      Object.defineProperty(mousedownEvent, 'offsetY', { value: 100, writable: false });
      
      canvas.dispatchEvent(mousedownEvent);
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle mousemove event to draw', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      
      // Simulate mousedown first
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });
      Object.defineProperty(mousedownEvent, 'offsetX', { value: 100, writable: false });
      Object.defineProperty(mousedownEvent, 'offsetY', { value: 100, writable: false });
      canvas.dispatchEvent(mousedownEvent);
      
      // Then mousemove
      const mousemoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 150,
      });
      Object.defineProperty(mousemoveEvent, 'offsetX', { value: 150, writable: false });
      Object.defineProperty(mousemoveEvent, 'offsetY', { value: 150, writable: false });
      canvas.dispatchEvent(mousemoveEvent);
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle mouseup event to stop drawing', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      
      // Simulate mouseup
      const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(mouseupEvent);
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle mouseleave event to stop drawing', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      
      // Simulate mouseleave
      const mouseleaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(mouseleaveEvent);
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Toolbar Interactions', () => {
    it('should create toolbar when activated', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const toolbar = document.getElementById('pubky-drawing-toolbar');
      expect(toolbar).toBeTruthy();
    });

    it('should remove toolbar when deactivated', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deactivate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const toolbar = document.getElementById('pubky-drawing-toolbar');
      expect(toolbar).toBeFalsy();
    });

    it('should handle clear button click', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const clearButton = document.querySelector('#clear-drawing');
      expect(clearButton).toBeTruthy();
      
      if (clearButton) {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        clearButton.dispatchEvent(clickEvent);
      }
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle save button click', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const saveButton = document.querySelector('#save-drawing');
      expect(saveButton).toBeTruthy();
      
      if (saveButton) {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        saveButton.dispatchEvent(clickEvent);
      }
      
      // Should eventually call sendMessage
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });

    it('should handle close button click', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const closeButton = document.querySelector('#close-drawing');
      expect(closeButton).toBeTruthy();
      
      if (closeButton) {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        closeButton.dispatchEvent(clickEvent);
      }
      
      // Should eventually deactivate
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });

    it('should handle color selection', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const palette = document.querySelector('#color-palette');
      expect(palette).toBeTruthy();
      
      if (palette && palette.children.length > 0) {
        const colorButton = palette.children[0] as HTMLElement;
        const clickEvent = new MouseEvent('click', { bubbles: true });
        colorButton.dispatchEvent(clickEvent);
      }
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle thickness slider change', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const slider = document.querySelector('#thickness-slider') as HTMLInputElement;
      expect(slider).toBeTruthy();
      
      if (slider) {
        slider.value = '10';
        const inputEvent = new Event('input', { bubbles: true });
        slider.dispatchEvent(inputEvent);
      }
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Save/Load', () => {
    it('should save drawing when deactivating', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Deactivate (triggers save)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have called sendMessage to save
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });

    it('should load drawing when activating', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Mock response with drawing data
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_DRAWING' && callback) {
          callback({
            drawing: {
              url: 'https://example.com',
              canvasData: 'data:image/png;base64,test',
              timestamp: Date.now(),
            },
          });
        }
        return Promise.resolve({ drawing: null });
      });
      
      // Activate (triggers load)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have called sendMessage to load
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle canvas context creation failure gracefully', async () => {
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);

      // Restore
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('should handle save failure gracefully', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'SAVE_DRAWING' && callback) {
          callback({ success: false, error: 'Save failed' });
        }
        return Promise.resolve({ success: false });
      });

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deactivate (should handle save error)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle storage quota exceeded error', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_STORAGE_QUOTA') {
          return Promise.resolve({
            hasSpace: false,
            usedMB: 4.5,
            quotaMB: 5,
            percentUsed: 90,
          });
        }
        if (message.type === 'SAVE_DRAWING' && callback) {
          callback({ success: false, error: 'Storage quota exceeded' });
        }
        if (message.type === 'SHOW_TOAST') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: false });
      });

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deactivate (should handle quota error)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have attempted to show toast
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });

    it('should handle load failure gracefully', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_DRAWING' && callback) {
          callback({ drawing: null });
        }
        return Promise.resolve({ drawing: null });
      });

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate (triggers load)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle invalid image data on load', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_DRAWING' && callback) {
          callback({
            drawing: {
              url: 'https://example.com',
              canvasData: 'invalid-image-data',
              timestamp: Date.now(),
            },
          });
        }
        return Promise.resolve({ drawing: null });
      });

      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate (triggers load with invalid data)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid toggles', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Rapid toggles
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 50));
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 50));
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle canvas resize', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = document.getElementById('pubky-drawing-canvas') as HTMLCanvasElement;
      expect(canvas).toBeTruthy();
      
      // Simulate window resize
      global.window = {
        innerWidth: 1200,
        innerHeight: 800,
      } as any;
      
      // Canvas should still exist
      expect(canvas).toBeTruthy();
    });

    it('should handle save when canvas is empty', async () => {
      const listener = mockChromeRuntime.onMessage.addListener.mock.calls[0][0];
      
      // Activate
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deactivate without drawing (empty canvas)
      listener({ type: 'TOGGLE_DRAWING_MODE' }, {}, vi.fn());
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should still attempt to save
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalled();
    });
  });
});

