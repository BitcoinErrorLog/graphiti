/**
 * E2E test to capture screenshot of annotation button
 */

import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('annotation button screenshot', async () => {
  // Create persistent context with extension loaded
  const extensionPath = path.resolve(__dirname, '../../dist');
  const userDataDir = path.join(os.tmpdir(), `playwright-annotation-test-${Date.now()}`);
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Need headed mode for screenshot
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  
  try {
    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Navigate to a test page
    const page = await context.newPage();
    
    // Set up console logging
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Graphiti') || text.includes('ContentScript') || msg.type() === 'error') {
        console.log(`[Browser ${msg.type()}] ${text}`);
      }
    });
    
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    
    // Wait for content script to initialize - try multiple times
    let contentScriptLoaded = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      contentScriptLoaded = await page.evaluate(() => {
        return typeof window !== 'undefined' && 
               (window as any).__graphitiContentScriptLoaded === true;
      });
      if (contentScriptLoaded) break;
    }
    
    console.log('Content script loaded:', contentScriptLoaded);
    
    if (!contentScriptLoaded) {
      // Check for errors
      const errors = await page.evaluate(() => {
        return (window as any).__graphitiErrors || [];
      });
      console.log('Errors:', errors);
    }
    
    // Enable annotations if needed
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ annotationsEnabled: true }, () => {
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
    
    // Wait a bit more
    await page.waitForTimeout(1000);
    
    // Find some text to select
    const textToSelect = await page.evaluate(() => {
      const p = document.querySelector('p');
      return p ? p.textContent : null;
    });
    
    console.log('Text to select:', textToSelect?.substring(0, 50));
    
    // Select text by simulating mouse selection AND mouseup event
    await page.evaluate(() => {
      const p = document.querySelector('p');
      if (p && p.firstChild) {
        const range = document.createRange();
        const textNode = p.firstChild;
        range.setStart(textNode, 0);
        range.setEnd(textNode, Math.min(20, textNode.textContent?.length || 0));
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Trigger mouseup event to trigger handleTextSelection
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window,
          pageX: 100,
          pageY: 200
        });
        document.dispatchEvent(mouseUpEvent);
      }
    });
    
    // Wait for button to appear - wait longer
    await page.waitForTimeout(2000);
    
    // Check console logs
    const logs = await page.evaluate(() => {
      return (window as any).__graphitiLogs || [];
    });
    if (logs.length > 0) {
      console.log('Content script logs:', logs);
    }
    
    // Check if button exists
    const buttonExists = await page.evaluate(() => {
      return document.querySelector('.pubky-annotation-button') !== null;
    });
    
    console.log('Button exists:', buttonExists);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'annotation-button-screenshot.png',
      fullPage: false 
    });
    
    // Also check console for any errors
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(text);
      }
    });
    
    await page.waitForTimeout(1000);
    
    if (consoleMessages.length > 0) {
      console.log('Console errors/warnings:', consoleMessages);
    }
    
    // Verify button is visible
    const button = page.locator('.pubky-annotation-button');
    if (await button.count() > 0) {
      console.log('✅ Annotation button found!');
      await expect(button).toBeVisible();
    } else {
      console.log('❌ Annotation button not found');
      // Take another screenshot to see what's on the page
      await page.screenshot({ 
        path: 'annotation-button-missing.png',
        fullPage: true 
      });
    }
    
  } finally {
    await context.close();
  }
});
