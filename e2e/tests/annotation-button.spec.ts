/**
 * E2E test for annotation button functionality
 * This test captures browser console errors and validates the button appears
 */

import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Annotation Button Feature', () => {
  let extensionId: string;
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let context: any;

  test.beforeAll(async () => {
    // Create persistent context with extension loaded
    const extensionPath = path.resolve(__dirname, '../../dist');
    const userDataDir = path.join(os.tmpdir(), `playwright-extension-test-${Date.now()}`);
    
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions need headed mode
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    
    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get extension ID from service worker
    const [serviceWorker] = context.serviceWorkers();
    if (serviceWorker) {
      const url = serviceWorker.url();
      const match = url.match(/chrome-extension:\/\/([a-z]{32})\//);
      if (match) {
        extensionId = match[1];
      }
    }
  });

  test.beforeEach(async () => {
    // Create new page in the persistent context
    const page = await context.newPage();
    
    // Capture console errors and warnings
    context.on('page', (page) => {
      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          consoleErrors.push(text);
          console.error(`[Browser Error] ${text}`);
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(text);
          console.warn(`[Browser Warning] ${text}`);
        }
      });
      
      // Capture uncaught exceptions
      page.on('pageerror', (error) => {
        consoleErrors.push(`Uncaught Exception: ${error.message}`);
        console.error(`[Uncaught Exception] ${error.message}\n${error.stack}`);
      });
      
      // Capture failed requests
      page.on('requestfailed', (request) => {
        const failure = request.failure();
        if (failure) {
          consoleErrors.push(`Request Failed: ${request.url()} - ${failure.errorText}`);
        }
      });
    });
    
    consoleErrors = [];
    consoleWarnings = [];
  });

  test('annotation button should appear when text is selected', async () => {
    const page = await context.newPage();
    // Navigate to a test page
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    
    // Wait for content script to load and check for errors
    await page.waitForTimeout(2000);
    
    // Check if content script loaded
    const contentScriptLoaded = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             (window as any).__graphitiContentScriptLoaded === true;
    });
    
    if (!contentScriptLoaded) {
      console.error('❌ Content script did not load');
      if (consoleErrors.length > 0) {
        console.error('Errors that may have prevented loading:');
        consoleErrors.forEach(err => console.error(`  - ${err}`));
      }
    } else {
      console.log('✅ Content script loaded');
    }
    
    // Check if annotations are enabled
    const annotationsEnabled = await page.evaluate(async () => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get('annotationsEnabled', (result) => {
            resolve(result.annotationsEnabled !== false);
          });
        } else {
          resolve(true); // Default to enabled
        }
      });
    });
    
    console.log(`Annotations enabled: ${annotationsEnabled}`);
    
    // Select text on the page - use a more reliable method
    await page.evaluate(() => {
      const selection = window.getSelection();
      const range = document.createRange();
      const p = document.querySelector('p');
      if (p && p.firstChild) {
        range.setStart(p.firstChild, 0);
        range.setEnd(p.firstChild, Math.min(10, p.textContent?.length || 0));
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
    
    // Trigger mouseup event to simulate selection
    await page.evaluate(() => {
      const event = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
      });
      document.dispatchEvent(event);
    });
    
    // Wait for annotation button to appear
    const annotationButton = page.locator('.pubky-annotation-button');
    
    try {
      await expect(annotationButton).toBeVisible({ timeout: 5000 });
      console.log('✅ Annotation button appeared');
    } catch (error) {
      // Button didn't appear - check for errors
      console.error('❌ Annotation button did NOT appear');
      
      // Log all console errors
      if (consoleErrors.length > 0) {
        console.error('\n📋 Browser Console Errors:');
        consoleErrors.forEach((err, i) => {
          console.error(`  ${i + 1}. ${err}`);
        });
      }
      
      // Debug: Check what's in the DOM
      const hasButton = await page.locator('.pubky-annotation-button').count();
      console.log(`Button elements found: ${hasButton}`);
      
      // Check if event listener is set up
      const hasListeners = await page.evaluate(() => {
        // Check if AnnotationManager is initialized
        return (window as any).__graphitiContentScriptLoaded === true;
      });
      console.log(`Content script loaded: ${hasListeners}`);
      
      throw error;
    }
    
    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('window is not defined') ||
      err.includes('Cannot use import statement') ||
      err.includes('chrome.storage') && err.includes('undefined')
    );
    
    if (criticalErrors.length > 0) {
      console.error('\n❌ Critical errors found:');
      criticalErrors.forEach(err => console.error(`  - ${err}`));
      throw new Error(`Critical errors detected: ${criticalErrors.join('; ')}`);
    }
  });

  test('should capture and report all browser errors', async () => {
    const page = await context.newPage();
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for extension to initialize
    
    // Try to trigger annotation flow
    try {
      await page.locator('body').selectText();
      await page.waitForSelector('.pubky-annotation-button', { timeout: 3000 });
    } catch {
      // Button didn't appear, but we want to capture errors
    }
    
    // Report all errors found
    if (consoleErrors.length > 0) {
      console.log('\n📋 All Browser Errors Captured:');
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      
      // Log errors (can't write to file from browser context)
      if (consoleErrors.length > 0) {
        console.log('\n📋 All Browser Errors:');
        consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      }
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Fail test if there are critical errors
    const hasCriticalErrors = consoleErrors.some(err =>
      err.includes('window is not defined') ||
      err.includes('Cannot use import statement') ||
      err.includes('chrome.storage') && err.includes('undefined')
    );
    
    if (hasCriticalErrors) {
      throw new Error('Critical browser errors detected - see browser-errors.log');
    }
  });

  test.afterEach(async () => {
    // Log summary
    if (consoleErrors.length > 0 || consoleWarnings.length > 0) {
      console.log(`\n📊 Summary: ${consoleErrors.length} errors, ${consoleWarnings.length} warnings`);
    }
  });

  test.afterAll(async () => {
    await context.close();
  });
});
