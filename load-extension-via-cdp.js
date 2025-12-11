#!/usr/bin/env node
/**
 * Script to load extension via Chrome DevTools Protocol
 * This works around Chrome 137+ removing --load-extension flag
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const extensionPath = '/tmp/graphiti-test';

if (!fs.existsSync(extensionPath)) {
  console.error(`Extension not found at ${extensionPath}`);
  process.exit(1);
}

console.log('Loading extension via CDP...');

// Connect to existing Chrome or start new one
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222').catch(async () => {
  // If no existing Chrome, we can't load extension this way
  console.error('No Chrome instance found at http://127.0.0.1:9222');
  console.error('Start Chrome with: --remote-debugging-port=9222 --enable-unsafe-extension-debugging');
  process.exit(1);
});

const client = await browser.newBrowserCDPSession();
await client.send('Extensions.loadUnpacked', { path: extensionPath });
console.log('✅ Extension loaded via CDP');

await browser.close();
