import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of Graphiti Chrome Extension
 * 
 * Tests Chrome extension functionality in a real browser environment.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
