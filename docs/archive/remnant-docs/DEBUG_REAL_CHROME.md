# Debugging Annotations in Real Chrome

## Current Issue
Annotations toggle is ON, but button doesn't appear when selecting text.

## Debug Steps

### 1. Check if Content Script is Loaded

Open DevTools Console on any webpage and run:
```javascript
window.__graphitiContentScriptLoaded
```
Should return `true` if content script loaded.

### 2. Check if Annotations are Actually Enabled

In console:
```javascript
chrome.storage.local.get('annotationsEnabled', (result) => {
  console.log('Annotations enabled:', result.annotationsEnabled);
});
```

### 3. Check Console for Errors

Look for:
- `[Graphiti] [ERROR]` messages
- `[Graphiti] [WARN]` messages
- Any red error messages

### 4. Test Selection Handler

Select text, then in console check:
```javascript
// Check if selection exists
const sel = window.getSelection();
console.log('Selection:', sel?.toString());
console.log('Is collapsed:', sel?.isCollapsed);

// Check if button exists (might be hidden)
const button = document.querySelector('.pubky-annotation-button');
console.log('Button exists:', !!button);
if (button) {
  console.log('Button style:', window.getComputedStyle(button).display);
  console.log('Button position:', button.style.left, button.style.top);
}
```

### 5. Check Validation

Selected text must be:
- At least 1 character
- Less than 1000 characters
- Not empty after trim

### 6. Manual Test

1. Open extension popup
2. Make sure Annotations toggle is ON
3. Go to example.com
4. Open DevTools Console
5. Select text (at least 5-10 characters)
6. Watch console for `[Graphiti]` messages
7. Check if button appears in DOM (even if not visible)

## Common Issues

**Button created but not visible:**
- Check button position (might be off-screen)
- Check z-index
- Check if display is none

**Content script not loading:**
- Reload extension
- Check for errors in chrome://extensions/
- Verify manifest.json is correct

**Selection not triggering:**
- Make sure you're actually selecting text (not just clicking)
- Check if mouseup event is firing
- Verify event listener is attached
