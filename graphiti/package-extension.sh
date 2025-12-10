#!/bin/bash
# Package Chrome extension for distribution
# This script builds the extension and creates a zip file ready for Chrome installation

set -e

echo "Building extension..."
npm run build

if [ ! -d "dist" ]; then
  echo "Error: dist directory not found after build"
  exit 1
fi

echo "Creating extension package..."
cd dist
zip -r ../graphiti-extension.zip . -x "*.DS_Store" "*.map"
cd ..

echo "✓ Extension package created: graphiti-extension.zip"
ls -lh graphiti-extension.zip

echo ""
echo "To install in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo "   OR drag and drop graphiti-extension.zip onto the extensions page"
