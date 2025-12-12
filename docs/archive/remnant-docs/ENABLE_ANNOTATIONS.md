# Enable Annotations - Quick Fix

## The Problem

Your annotations are **disabled** in the extension. The toggle in the popup is OFF.

## Quick Fix

**Option 1: Toggle in Extension Popup**
1. Open the Graphiti extension popup
2. Find the "Annotations" toggle
3. **Turn it ON** (toggle to the right/enabled)

**Option 2: Reset via Console**
1. Open any webpage
2. Open DevTools Console (F12)
3. Run:
```javascript
chrome.storage.local.set({ annotationsEnabled: true }, () => {
  console.log('Annotations enabled!');
  location.reload();
});
```

**Option 3: Keyboard Shortcut**
- Press `Alt+Shift+A` (Mac: `Option+Shift+A`) to toggle annotations on/off

## After Enabling

1. **Reload the webpage** you're testing on
2. **Select some text**
3. **Annotation button should appear** near your selection

## Why This Happened

The extension saves your preference. If you toggled it off before, it stays off. The code now defaults to enabled if never set, but if you explicitly disabled it, it remembers that.

## Verify It's Working

After enabling:
1. Select text on any webpage
2. Purple "Add Annotation" button should appear
3. Click it to create annotation
