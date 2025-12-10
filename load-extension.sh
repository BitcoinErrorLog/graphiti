#!/bin/bash

# Script to build and prepare extension for Chrome loading

cd "$(dirname "$0")"

echo "Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "To load in Chrome:"
    echo "1. Open chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select this folder: $(pwd)/dist"
    echo ""
    echo "Opening Chrome extensions page..."
    open -a "Google Chrome" "chrome://extensions/" 2>/dev/null || open -a "Chromium" "chrome://extensions/" 2>/dev/null || echo "Please open chrome://extensions/ manually"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
