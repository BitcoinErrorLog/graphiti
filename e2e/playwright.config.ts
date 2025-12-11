import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Playwright configuration for E2E testing of Graphiti Chrome Extension
 * 
 * Tests Chrome extension functionality in a real browser environment.
 * Extensions require persistent context to work properly.
 */
const extensionPath = path.resolve(__dirname, '../../dist');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially to avoid extension conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension testing
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use persistent context for extension loading
    channel: 'chromium',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Extension will be loaded via globalSetup
      },
    },
  ],
  
  // Global setup to create persistent context with extension
  globalSetup: async () => {
    // Ensure dist directory exists
    if (!fs.existsSync(extensionPath)) {
      throw new Error(`Extension not found at ${extensionPath}. Run 'npm run build' first.`);
    }
  },
});
