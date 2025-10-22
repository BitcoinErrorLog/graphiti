# Graphiti Chrome Extension

Graphiti is a Manifest V3 extension for publishing deterministic link posts to your Pubky storage and browsing what your network has already shared about the page you are viewing. The extension now lives at the repository root so you can load this directory directly in `chrome://extensions` without any build tooling.

## Highlights
- **Pubky Ring authentication** – Launch the Ring flow from the options page or popup, scan the QR code, and Graphiti will persist the approved session and your pubkey automatically.
- **Deterministic link posts** – Normalize URLs, hash them, and store the resulting JSON into `/pub/graphiti/<hash>.json` on your homeserver.
- **Sidebar feed** – Toggle an overlay (Alt+P) to review your follows' posts for the active page with Nexus lookups and direct Pubky fallbacks.
- **Popup quick actions** – Save link posts, flip bookmarks, jump to options, or open the sidebar from the browser action popup. Context-menu saves respect the right-clicked link.
- **Local bookmarks** – Keep private notes and tags for any URL in `chrome.storage.local`; the popup and sidebar stay in sync.
- **Omnibox search** – Type `pubky` in the address bar to search Nexus for matching link posts.

## Repository layout
- `manifest.json` – Chrome MV3 manifest pointing to the service worker, popup, options page, and content script.
- `background.js` – Service worker that wires messaging, context-menu saves, Pubky Ring auth, and omnibox routing.
- `contentScript.js` – Sidebar UI injected into pages with save/bookmark actions and realtime feed rendering.
- `popup.html` / `popup.js` – Browser action UI for quick saves, bookmarks, sidebar toggle, and Ring auth.
- `options.html` / `options.js` – Settings page for homeserver configuration, follow lists, and Ring sign-in.
- `sdk.js` – Shared helpers for config storage, Pubky writes, bookmark management, search caching, and Ring polling.
- `auth.html` – Minimal page that renders the QR code and status while waiting for Ring approval.
- `styles/` – Shared Tailwind-derived base styles for popup/options/sidebar surfaces.

## Loading the extension
1. (Optional) If you were provided Pubky SDK binaries (`lib/index.js`, `lib/pubky_bg.wasm`, etc.), copy them into a `lib/` directory at the repository root. Graphiti operates with its built-in fetch helpers, but the folder is listed in `web_accessible_resources` so bundled SDK assets can be shipped with the extension.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
3. Pin the Graphiti icon for easier access.

## Using Graphiti
### Sign in with Pubky Ring
1. Open the popup and press **Sign in** (or use **Sign in with Pubky Ring** on the options page).
2. A new tab (`auth.html`) opens showing a QR code generated from the relay request.
3. Scan the code with the Pubky Ring mobile app and approve the request. When the relay reports approval, your session token and pubkey are stored and displayed in the options page.

### Save link posts and bookmarks
- **Popup** – Fill optional tags/notes and press **Save** to publish. Toggle the star button to store/remove a local bookmark.
- **Context menu** – Right-click any link or page and choose **Save link post to Pubky**; the popup will prefill with the clicked URL.
- **Sidebar** – Press `Alt+P` to open the overlay, then submit the form to publish and refresh the feed. Bookmarks and posts stay in sync with the popup.

### Browse posts
The sidebar fetches Nexus search results for the current URL and falls back to direct Pubky reads from your follow list. Results are cached briefly (`sdk.js`) and sorted by `created_at`.

### Omnibox shortcut
Type `pubky` followed by a space in Chrome's address bar, enter a query, and submit. Results open in the active tab by default.

## Development notes
- All scripts are ES modules and run without a bundler; edits take effect immediately after reloading the extension in Chrome.
- Messaging namespaces follow the `graphiti:*` prefix. Background handlers clear cached sidebar data when sync storage changes.
- The repository intentionally omits third-party build steps so it can be loaded directly after cloning.
