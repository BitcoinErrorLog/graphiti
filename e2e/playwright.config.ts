import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright configuration for E2E testing of Graphiti Chrome Extension
 * 
 * Tests Chrome extension functionality in a real browser environment.
 */
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
    // Load Chrome extension
    launchOptions: {
      args: [
        `--disable-extensions-except=${path.resolve(__dirname, '../../dist')}`,
        `--load-extension=${path.resolve(__dirname, '../../dist')}`,
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Load extension
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname, '../../dist')}`,
            `--load-extension=${path.resolve(__dirname, '../../dist')}`,
          ],
        },
      },
    },
  ],
});
