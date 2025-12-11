#!/usr/bin/env node
/**
 * Load extension via Chrome DevTools Protocol Extensions.loadUnpacked
 * Requires Chrome with --remote-debugging-pipe and --enable-unsafe-extension-debugging
 */

import { chromium } from 'playwright';
import * as fs from 'path';

const extensionPath = '/tmp/graphiti-test';

console.log('Connecting to Chrome via CDP...');

try {
  // Connect to Chrome - try different endpoints
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  } catch (e) {
    // Try to get endpoint from chrome-devtools-mcp
    const version = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json()).catch(() => null);
    if (version?.webSocketDebuggerUrl) {
      browser = await chromium.connectOverCDP(version.webSocketDebuggerUrl);
    } else {
      throw new Error('Could not connect to Chrome. Make sure chrome-devtools-mcp is running.');
    }
  }
  
  console.log('Connected to Chrome');
  
  // Get CDP session - need to enable Extensions domain first
  const context = browser.contexts()[0];
  if (!context) {
    // Create a page to get CDP session
    const page = await browser.newPage();
    const client = await page.context().newCDPSession(page);
    
    // Enable Extensions domain
    try {
      await client.send('Runtime.enable');
      console.log('Enabled Runtime domain');
    } catch (e) {
      console.warn('Could not enable Runtime:', e.message);
    }
    
    // Try to load extension
    console.log('Loading extension via Extensions.loadUnpacked...');
    try {
      const result = await client.send('Extensions.loadUnpacked', {
        path: extensionPath
      });
      console.log('✅ Extension loaded!', result);
    } catch (e) {
      if (e.message.includes('Method not available')) {
        console.error('❌ Extensions domain not available.');
        console.error('Chrome needs to be started with:');
        console.error('  --remote-debugging-pipe');
        console.error('  --enable-unsafe-extension-debugging');
        console.error('\nFor chrome-devtools-mcp, you may need to manually load the extension.');
      } else {
        throw e;
      }
    }
    
    await browser.close();
  }
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}
