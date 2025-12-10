/**
 * @fileoverview Visual regression tests for UI components.
 * 
 * These tests capture screenshots of key UI components and compare them
 * against baseline images to detect visual regressions.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load extension
    // Note: In a real scenario, you would load the built extension
    // This is a placeholder structure
  });

  test('popup - main view', async ({ page }) => {
    // Navigate to popup
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="main-view"]', { timeout: 5000 }).catch(() => {});
    
    // Take screenshot
    await expect(page).toHaveScreenshot('popup-main-view.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });

  test('popup - auth view', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    // Wait for auth view
    await page.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 }).catch(() => {});
    
    await expect(page).toHaveScreenshot('popup-auth-view.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });

  test('sidepanel - posts feed', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/sidepanel.html');
    
    // Wait for posts feed
    await page.waitForSelector('[data-testid="posts-feed"]', { timeout: 5000 }).catch(() => {});
    
    await expect(page).toHaveScreenshot('sidepanel-posts-feed.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });

  test('sidepanel - empty state', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/sidepanel.html');
    
    // Wait for empty state
    await page.waitForSelector('[data-testid="empty-state"]', { timeout: 5000 }).catch(() => {});
    
    await expect(page).toHaveScreenshot('sidepanel-empty-state.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });

  test('post card component', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/sidepanel.html');
    
    // Wait for post card
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 5000 }).catch(() => {});
    
    const postCard = page.locator('[data-testid="post-card"]').first();
    await expect(postCard).toHaveScreenshot('post-card.png', {
      maxDiffPixels: 50,
    });
  });

  test('popup - loading state', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    // Wait for loading spinner
    await page.waitForSelector('.animate-spin', { timeout: 2000 }).catch(() => {});
    
    await expect(page).toHaveScreenshot('popup-loading-state.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });

  test('sidepanel - annotations tab', async ({ page }) => {
    await page.goto('chrome-extension://[extension-id]/sidepanel.html');
    
    // Click annotations tab
    await page.click('button:has-text("Annotations")').catch(() => {});
    
    // Wait for annotations
    await page.waitForSelector('[data-testid="annotations-feed"]', { timeout: 5000 }).catch(() => {});
    
    await expect(page).toHaveScreenshot('sidepanel-annotations-tab.png', {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });
});
