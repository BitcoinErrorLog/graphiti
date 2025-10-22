# Graphiti — Pubky URL Tagger

Graphiti is a Chrome Manifest V3 extension that lets you publish deterministic link posts to your Pubky homeserver, browse what your follows have shared about the current page, and keep quick local bookmarks. The extension now lives at the repository root so you can load this folder directly in `chrome://extensions`.

## Features

- **QR-only Pubky Ring authentication**: Launch the Ring flow from the options page, scan the QR code with the mobile app, and Graphiti will persist the approved session automatically.
- **Deterministic link posts**: Normalize URLs, hash them, and publish `LinkPost` JSON files to your Pubky storage with tags and notes.
- **Realtime sidebar feed**: Toggle a Shadow DOM sidebar (Alt+P) that shows your follows’ posts for the active tab via Nexus search with Pubky fallback requests.
- **Popup quick actions**: Save the current tab as a link post or bookmark, open the sidebar, or jump to options directly from the browser action popup.
- **Local bookmarks**: Store private bookmarks in `chrome.storage.local`, including tags and notes, with sync between popup and sidebar.
- **Context menu save**: Right-click any page or link and choose “Save link post to Pubky” to prefill the popup for publishing.
- **Omnibox search shortcut**: Type `pubky` in the Chrome address bar to search Nexus for link posts matching free text.
- **Viewer utility**: Open `viewer.html#<payload>` to inspect structured JSON payloads for debugging.

## Getting started

1. (Optional) Copy your provided Pubky SDK assets (`lib/index.js`, `lib/pubky_bg.wasm`, etc.) into a local `lib/` directory at the repository root if you want SDK-powered helpers. Graphiti gracefully degrades when the bundle is absent.
2. In Chrome, open `chrome://extensions`, enable **Developer mode**, then click **Load unpacked** and select this repository folder.
3. Pin the Graphiti action icon in the toolbar for quicker access.

## Usage

### Authenticate with Pubky Ring

1. Open the extension popup and click **Settings**, or visit **chrome://extensions → Graphiti → Extension options**.
2. In the options page, review the relay/Nexus defaults and click **Sign in with Pubky Ring**.
3. A new tab with `auth.html` opens; scan the QR code using the Pubky Ring mobile app.
4. Once approved, the options page will display your Pubky ID and session token status.

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
- If Nexus is unavailable, Graphiti falls back to fetching directly from each follow.

### Omnibox shortcut

- Type `pubky` followed by a space in the Chrome address bar, enter your query, and press Enter.
- Results open in the current tab; use **Shift+Enter** or **Alt+Enter** to open in a new tab or window per Chrome defaults.

### Viewer

- Navigate to `chrome-extension://<extension-id>/viewer.html#<encoded-json>` to inspect payloads (e.g., posts or bookmarks) for troubleshooting.

## Development notes

- Graphiti loads the Pubky SDK dynamically from `lib/` when the bundle is present so you can ship the assets alongside the extension.
- No bundler is required; all scripts are ES modules compatible with MV3 service workers.
- Source files live at the repository root.
