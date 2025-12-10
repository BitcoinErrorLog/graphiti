/**
 * Helper utilities for Chrome extension E2E testing with Playwright
 */

import { BrowserContext, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Load the Chrome extension for testing
 */
export async function loadExtension(context: BrowserContext): Promise<void> {
  const extensionPath = path.resolve(__dirname, '../../dist');
  await context.addInitScript(() => {
    // Extension will be loaded automatically
  });
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
