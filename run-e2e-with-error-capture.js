#!/usr/bin/env node
/**
 * Run E2E tests with comprehensive error capture
 * This script runs Playwright tests and captures all browser errors
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running E2E tests with error capture...\n');

try {
  // Run Playwright tests
  const testOutput = execSync('npx playwright test --reporter=list,json', {
    encoding: 'utf8',
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  console.log(testOutput);
  
  // Check for test results JSON
  const resultsPath = path.join(__dirname, 'test-results.json');
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed`);
  }
  
} catch (error) {
  console.error('❌ E2E tests failed');
  console.error(error.stdout || error.stderr || error.message);
  
  // Check for error logs
  const errorLogPath = path.join(__dirname, 'browser-errors.log');
  if (fs.existsSync(errorLogPath)) {
    console.log('\n📋 Browser Errors Captured:');
    const errors = fs.readFileSync(errorLogPath, 'utf8');
    console.log(errors);
  }
  
  process.exit(1);
}
