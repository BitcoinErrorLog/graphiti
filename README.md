# Remarkable — Pubky URL Tagger

This repository contains the source for the Remarkable Chrome MV3 extension.

## Getting started

1. Copy your provided Pubky SDK assets (`lib/index.js` and `lib/pubky_bg.wasm`) into `remarkable/lib/` before loading the extension.
2. Load the unpacked extension from the `remarkable/` directory.
3. In Chrome, open `chrome://extensions`, enable **Developer mode**, then click **Load unpacked** and select the `remarkable/` folder.

The extension supports QR-only Pubky Ring authentication, deterministic link posts, Nexus-backed sidebar reads, and local bookmarks. Refer to the in-extension Options page for configuration details.
