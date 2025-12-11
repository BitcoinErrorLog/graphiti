#!/usr/bin/env node
/**
 * Build validation script - checks for common issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const errors = [];
const warnings = [];

console.log('🔍 Checking build...\n');

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  errors.push('❌ dist/ directory does not exist. Run: npm run build');
  console.error(errors[0]);
  process.exit(1);
}

// Check content.js
const contentJs = path.join(distDir, 'content.js');
if (!fs.existsSync(contentJs)) {
  errors.push('❌ dist/content.js is missing. Run: npm run build');
} else {
  const content = fs.readFileSync(contentJs, 'utf8');
  
  // Check format
  if (content.trim().startsWith('var ') || content.trim().startsWith('(function')) {
    console.log('✅ content.js is in IIFE format');
  } else if (content.includes('const _vite_mapDeps') || content.includes('import ') || content.includes('export ')) {
    errors.push('❌ content.js contains ES module syntax (import/export). Should be IIFE format.');
  } else {
    warnings.push('⚠️  content.js format unclear - may need manual inspection');
  }
  
  // Check size
  const size = fs.statSync(contentJs).size;
  if (size < 10000) {
    warnings.push(`⚠️  content.js is very small (${size} bytes) - may be incomplete`);
  } else {
    console.log(`✅ content.js size: ${(size / 1024).toFixed(1)} KB`);
  }
}

// Check manifest.json
const manifestJson = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestJson)) {
  errors.push('❌ dist/manifest.json is missing');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestJson, 'utf8'));
  
  // Check content script config
  if (manifest.content_scripts && manifest.content_scripts[0]) {
    const cs = manifest.content_scripts[0];
    if (cs.js && cs.js.includes('content.js')) {
      console.log('✅ manifest.json correctly references content.js');
    } else {
      errors.push('❌ manifest.json content_scripts does not reference content.js');
    }
  } else {
    errors.push('❌ manifest.json missing content_scripts configuration');
  }
}

// Check background.js
const backgroundJs = path.join(distDir, 'background.js');
if (!fs.existsSync(backgroundJs)) {
  errors.push('❌ dist/background.js is missing');
} else {
  console.log('✅ background.js exists');
}

// Check icons
const iconsDir = path.join(distDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  warnings.push('⚠️  dist/icons/ directory missing');
} else {
  const requiredIcons = ['icon16.png', 'icon48.png', 'icon128.png'];
  const missingIcons = requiredIcons.filter(icon => 
    !fs.existsSync(path.join(iconsDir, icon))
  );
  if (missingIcons.length > 0) {
    warnings.push(`⚠️  Missing icons: ${missingIcons.join(', ')}`);
  } else {
    console.log('✅ All required icons present');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
  console.error('\n❌ ERRORS FOUND:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ Build validation passed!');
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.warn('  ' + w));
  }
  console.log('\n📦 Extension is ready to load in Chrome');
  console.log('   Location: ' + distDir);
  process.exit(0);
}
