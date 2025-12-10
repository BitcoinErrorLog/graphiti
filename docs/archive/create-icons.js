/**
 * Simple script to create placeholder icons for the extension
 * Run with: node create-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Create SVG icons
const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9333EA;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-size="${size * 0.5}" font-family="Arial, sans-serif" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">G</text>
</svg>`;
};

// Write SVG files
[16, 48, 128].forEach(size => {
  const svg = createSVGIcon(size);
  fs.writeFileSync(
    path.join(iconsDir, `icon${size}.svg`),
    svg
  );
  console.log(`✓ Created icon${size}.svg`);
});

console.log('\n📝 Note: SVG icons have been created.');
console.log('For production, you should convert these to PNG format.');
console.log('You can use an online tool like https://svgtopng.com/ or imagemagick:');
console.log('  convert icon16.svg icon16.png');
console.log('  convert icon48.svg icon48.png');
console.log('  convert icon128.svg icon128.png');
console.log('\nFor development, you can temporarily update manifest.json to use .svg files.');

