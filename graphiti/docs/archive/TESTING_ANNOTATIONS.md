# Testing the Annotation Feature

## Step-by-Step Instructions

### 1. Reload the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Find the "Graphiti - Pubky URL Tagger" extension
3. Click the **reload button** (circular arrow icon) on the extension card
   - This loads the newly built content script

### 2. Open the Test Page

Two options:

**Option A - Use the test page:**
1. Navigate to: `file:///Users/johncarvalho/Downloads/hackathon-2025-main/test.html`
2. Or open the `test.html` file from your Downloads folder

**Option B - Use any website:**
1. Navigate to any website (e.g., https://news.ycombinator.com or https://wikipedia.org)
2. The annotation feature works on any webpage

### 3. Test the Annotation Feature

1. **Select some text** on the page by clicking and dragging your mouse
2. An **"Add Annotation"** button should appear near your selection with a purple gradient
3. Click the button
4. A modal will appear asking for your comment
5. Type your annotation comment
6. Click "Post Annotation"
7. The text will be highlighted in yellow!

### 4. View Annotations in the Sidebar

1. Click the Graphiti extension icon in your toolbar
2. Click "Open Side Panel"
3. Click the "Annotations" tab (orange/yellow button)
4. You'll see your annotation listed
5. Click any annotation card to highlight it on the page

## Troubleshooting

### "I still don't see the button"

1. **Check the console:**
   - Press F12 to open DevTools
   - Look for messages starting with "[ContentScript]" or "[Graphiti]"
   - You should see: `Annotation manager initialized`

2. **Make sure you're signed in:**
   - Click the extension icon
   - Sign in with your Pubky credentials
   - You must be authenticated to create annotations

3. **Verify the extension reloaded:**
   - Go to `chrome://extensions/`
   - Look at the "Graphiti" extension
   - Check that it shows "Errors" as 0
   - If there are errors, click "Errors" to see what went wrong

4. **Hard refresh the page:**
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
   - This clears the cache and reloads scripts

5. **Check the content script loaded:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Under your Graphiti extension, you should see "content script" listed
   - Click "Inspect views: service worker" to check for errors

### "The button appears but nothing happens"

- Check that you're signed in to the extension
- Check the browser console for error messages
- Try selecting a smaller amount of text (under 1000 characters)

### "I can create annotations but don't see others' annotations"

- This is expected for now - you'll see your own annotations immediately
- Other users' annotations will appear when they create them
- The system uses Pubky's Nexus API to sync annotations across users
- Refresh the page or click the refresh button in the sidebar to fetch new annotations

## What Should Happen

### ✅ Expected Behavior

1. **Text Selection:**
   - Selecting text shows a gradient purple button that says "Add Annotation"
   - The button appears slightly below your selection
   - The button disappears if you click elsewhere

2. **Creating Annotation:**
   - Modal appears with the selected text shown in a quote box
   - You can type a comment
   - Clicking "Post Annotation" creates the annotation
   - The selected text gets a yellow highlight
   - A success message appears

3. **Viewing Annotations:**
   - Sidebar shows all annotations for the current page
   - Annotations show: selected text, comment, author, timestamp
   - Clicking an annotation highlights it on the page
   - The page scrolls to show the annotation

4. **Highlighting:**
   - Highlights have yellow background
   - Highlights have orange underline
   - Hovering makes highlights brighter
   - Clicking a highlight opens the sidebar

## Demo GIF

Try this on the test page:
1. Select the text "The quick brown fox jumps over the lazy dog"
2. Click "Add Annotation"
3. Type "This is my first annotation!"
4. Click "Post Annotation"
5. See the yellow highlight appear
6. Open sidebar and see your annotation

## Known Limitations

- Very complex HTML (like tables) may not highlight correctly
- Selecting across multiple paragraphs might fail
- Selections over 1000 characters are ignored
- Dynamic content (SPAs) may lose highlights on navigation

## Need Help?

If you still can't get it working:
1. Check the browser console for errors
2. Look at the extension service worker console
3. Verify the `dist/content.js` file exists (13+ KB)
4. Make sure you're testing on `http://` or `https://` URLs (not `chrome://` pages)

