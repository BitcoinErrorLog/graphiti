/**
 * Helper utilities for Chrome extension E2E testing with Playwright
 */

import { BrowserContext, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Load the Chrome extension for testing
 * Extension is loaded via Playwright config, this just gets the ID
 */
export async function loadExtension(context: BrowserContext): Promise<string> {
  // Wait for extension background page
  const backgroundPages = (context as any).backgroundPages();
  if (backgroundPages && backgroundPages.length > 0) {
    const bgPage = backgroundPages[0];
    const url = bgPage.url();
    const match = url.match(/chrome-extension:\/\/([a-z]{32})\//);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: try to get from service worker
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Extension ID format is 32 character hex string
  // We'll get it from the first page that loads
  return 'extension-id-placeholder';
}

/**
 * Get the extension ID from the browser context
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  // Extension ID is available after loading
  const backgroundPage = await context.waitForEvent('backgroundpage');
  return backgroundPage.url().split('/')[2];
}

/**
 * Open the extension popup
 */
export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await popup.goto(popupUrl);
  return popup;
}

/**
 * Open the extension side panel
 */
export async function openSidePanel(context: BrowserContext, extensionId: string): Promise<Page> {
  const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
  const sidePanel = await context.newPage();
  await sidePanel.goto(sidePanelUrl);
  return sidePanel;
}

/**
 * Wait for extension to be ready
 */
export async function waitForExtensionReady(page: Page): Promise<void> {
  // Wait for extension to initialize
  await page.waitForFunction(() => {
    return typeof chrome !== 'undefined' && chrome.runtime !== undefined;
  });
}
