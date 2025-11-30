/**
 * Chrome Extension API Mocks
 * 
 * Provides mock implementations of Chrome extension APIs for testing.
 */

import { vi } from 'vitest';

export const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
  sync: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
};

export const mockRuntime = {
  sendMessage: vi.fn().mockResolvedValue(undefined),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListeners: vi.fn().mockReturnValue(false),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
  lastError: null,
};

export const mockTabs = {
  query: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue({ id: 1 }),
  update: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue({}),
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onActivated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

export const mockSidePanel = {
  open: vi.fn().mockResolvedValue(undefined),
  setOptions: vi.fn().mockResolvedValue(undefined),
};

export const mockCommands = {
  onCommand: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

export const mockAction = {
  openPopup: vi.fn(),
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
};

const chrome = {
  storage: mockStorage,
  runtime: mockRuntime,
  tabs: mockTabs,
  sidePanel: mockSidePanel,
  commands: mockCommands,
  action: mockAction,
};

export default chrome;

/**
 * Helper to reset all Chrome API mocks
 */
export function resetChromeMocks(): void {
  vi.clearAllMocks();
}

/**
 * Helper to set up storage mock with initial data
 */
export function setupStorageMock(data: Record<string, any>): void {
  mockStorage.local.get.mockImplementation((keys) => {
    if (typeof keys === 'string') {
      return Promise.resolve({ [keys]: data[keys] });
    }
    if (Array.isArray(keys)) {
      const result: Record<string, any> = {};
      keys.forEach((key) => {
        if (key in data) result[key] = data[key];
      });
      return Promise.resolve(result);
    }
    return Promise.resolve(data);
  });
}

