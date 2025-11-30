/**
 * Vitest Test Setup
 * 
 * This file runs before all tests to configure the testing environment.
 */

import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock Chrome Extension APIs
const mockChromeStorage = {
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

const mockChromeRuntime = {
  sendMessage: vi.fn().mockResolvedValue(undefined),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
};

const mockChromeTabs = {
  query: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue({}),
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

const mockChromeSidePanel = {
  open: vi.fn().mockResolvedValue(undefined),
  setOptions: vi.fn().mockResolvedValue(undefined),
};

const mockChromeAction = {
  openPopup: vi.fn(),
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
};

// Attach mocks to global
(globalThis as any).chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  tabs: mockChromeTabs,
  sidePanel: mockChromeSidePanel,
  action: mockChromeAction,
};

// Mock window.alert
vi.spyOn(window, 'alert').mockImplementation(() => {});

// Mock crypto.subtle for Node.js environment
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('crypto');
  (globalThis as any).crypto = webcrypto;
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

