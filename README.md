# Remarkable — Pubky URL Tagger

Remarkable is a Chrome Manifest V3 extension that lets you publish deterministic link posts to your Pubky homeserver, browse what your follows have shared about the current page, and keep quick local bookmarks.

## Features

- **QR-only Pubky Ring authentication**: Initiate the Ring flow from the Options page and scan the QR code on mobile to sign in.
- **Deterministic link posts**: Normalize URLs, hash them, and publish `LinkPost` JSON files to your Pubky space with tags and notes.
- **Realtime sidebar feed**: Toggle a Shadow DOM sidebar (Alt+P) that shows your follows’ posts for the active tab via Nexus search with Pubky fallback requests.
- **Popup quick actions**: Save the current tab as a link post or bookmark, jump to Options, or open the sidebar from the browser action popup.
- **Local bookmarks**: Store private bookmarks in `chrome.storage.local`, including tags and notes, with sync between popup and sidebar.
- **Context menu save**: Right-click any page or link and choose “Save link post to Pubky” to prefill the popup for publishing.
- **Omnibox search shortcut**: Type `pubky` in the Chrome address bar to search Nexus for link posts matching free text.
- **Viewer utility**: Open `viewer.html#<payload>` to inspect structured JSON payloads for debugging.

## Getting started

1. Copy your provided Pubky SDK assets (`lib/index.js` and `lib/pubky_bg.wasm`) into `remarkable/lib/` before loading the extension.
2. In Chrome, open `chrome://extensions`, enable **Developer mode**, then click **Load unpacked** and select the `remarkable/` folder.
3. The extension action icon will appear in the toolbar; pin it for quicker access.

## Usage

### Authenticate with Pubky Ring

1. Open the extension popup and click **Settings**, or visit **chrome://extensions → Remarkable → Extension options**.
2. In the Options page, review the relay/Nexus defaults and click **Sign in with Pubky Ring**.
3. A new tab with `auth.html` opens; scan the QR code using the Pubky Ring mobile app.
4. Once approved, the Options page will display your Pubky ID and session token status.

### Save link posts

- Use the popup: add tags (comma-separated) and a note, then click **Save link post** to publish to your Pubky storage.
- Use the sidebar: press **Alt+P** to open, then submit the form to publish and refresh the feed.
- Use the context menu: right-click a page or link and choose **Save link post to Pubky**, then finish the details in the popup.

### Manage bookmarks

- Toggle the **Bookmark** button in the sidebar or popup to save/remove a local bookmark for the current URL.
- Bookmarks are stored locally (`chrome.storage.local`) and can include tags and notes independent of published posts.

### Review follows’ posts

- Open the sidebar (Alt+P) to automatically fetch posts for the active tab.
- Entries are sorted by `created_at` and labeled with the author Pubky IDs when provided.
- If Nexus is unavailable, the extension falls back to fetching directly from each follow.

### Omnibox shortcut

- Type `pubky` followed by a space in the Chrome address bar, enter your query, and press Enter.
- Results open in the current tab; use **Shift+Enter** or **Alt+Enter** to open in a new tab or window per Chrome defaults.

### Viewer

- Navigate to `chrome-extension://<extension-id>/viewer.html#<encoded-json>` to inspect payloads (e.g., posts or bookmarks) for troubleshooting.

## Development notes

- The extension loads the Pubky SDK dynamically from `remarkable/lib/`. Ensure those assets exist before testing.
- No bundler is required; all scripts are ES modules compatible with MV3 service workers.
- Source files live in the `remarkable/` directory; update the manifest there if you customize permissions or resources.

