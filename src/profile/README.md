# Profile Renderer

Renders Pubky user profiles in a standalone HTML page when users click `pubky://` or `pk://` URLs.

## Overview

When a user clicks a Pubky URL (e.g., `pubky://abc123...` or `pk://abc123...`), this page renders the user's profile by fetching data from their homeserver and displaying it in a clean, modern interface.

## Purpose

The profile renderer provides:
- **Profile Display** - Shows user's name, bio, avatar, status, and links
- **Content Rendering** - Displays any content from the user's homeserver
- **Security** - Sanitizes all HTML content before display (DOMPurify)
- **Navigation** - Allows browsing user's public content

## Files

| File | Purpose |
|------|---------|
| `profile-renderer.html` | HTML template for the profile page |
| `profile-renderer.ts` | TypeScript entry point that handles rendering |

## URL Format

The profile renderer is accessed via:
```
chrome-extension://<extension-id>/src/profile/profile-renderer.html?pubky=<pubky_id>&path=<optional_path>
```

**Parameters:**
- `pubky` (required) - The user's Pubky ID (public key, z32 encoded)
- `path` (optional) - Path to specific content (e.g., `/posts/123.json`)

## Profile Display

Shows the following information:
- **Avatar Image** - User's profile picture
- **Name** - Display name
- **Bio** - User biography
- **Status** - Status text with emoji
- **Social Links** - Array of links (Twitter, GitHub, etc.)
- **Public Key** - Copyable public key
- **Profile Metadata** - Creation/update timestamps

## Data Fetching

### Profile Data

Fetches from homeserver:
```typescript
const profileUrl = `pubky://${pubkyId}/pub/pubky.app/profile.json`;
const response = await client.fetch(profileUrl);
const profileData = await response.json();
```

### Content Data

For non-profile paths:
```typescript
const contentUrl = `pubky://${pubkyId}${path}`;
const response = await client.fetch(contentUrl);
const content = await response.text(); // or .json()
```

## Security

**Critical:** All HTML content from homeservers is sanitized before display:

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML before displaying
const sanitizedHtml = DOMPurify.sanitize(html);
contentEl.innerHTML = sanitizedHtml;
```

This prevents XSS attacks from malicious homeserver content.

## Rendering Flow

1. **Extract Parameters** - Get pubky ID and path from URL
2. **Initialize SDK** - Get Pubky Client singleton
3. **Fetch Data** - Load profile.json or content from homeserver
4. **Process Images** - Resolve image URLs to data URLs if needed
5. **Sanitize HTML** - Clean all HTML content with DOMPurify
6. **Render** - Display content in the page

## Image Handling

Images from homeservers are resolved:
- `pubky://` URLs → Fetched and converted to data URLs
- Relative paths → Resolved relative to homeserver
- External URLs → Used directly (if HTTPS)

## Error Handling

Handles various error cases:
- **Profile not found** - Shows friendly message
- **Network errors** - Displays error with retry option
- **Invalid pubky ID** - Shows error message
- **Content errors** - Graceful error display

## Styling

Dark theme matching the extension:
- Gradient backgrounds
- Rounded card design
- Link buttons with hover effects
- Responsive layout
- Modern typography

## Integration

Content script creates links to this page:

```typescript
// In content script (PubkyURLHandler.ts)
const profileUrl = chrome.runtime.getURL(
  `src/profile/profile-renderer.html?pubky=${pubkyId}`
);
button.onclick = () => window.open(profileUrl, '_blank');
```

## Example URLs

```
# Profile page
chrome-extension://abc123.../src/profile/profile-renderer.html?pubky=abc123def456...

# Specific post
chrome-extension://abc123.../src/profile/profile-renderer.html?pubky=abc123...&path=/pub/pubky.app/posts/123.json

# Directory listing
chrome-extension://abc123.../src/profile/profile-renderer.html?pubky=abc123...&path=/pub/pubky.app/posts/
```

## Content Types

The renderer handles:
- **JSON** - Pretty-printed JSON display
- **HTML** - Sanitized HTML rendering
- **Text** - Plain text display
- **Images** - Image display
- **Directories** - Directory listing

## See Also

- [Content Script](../content/README.md) - URL linkification
- [Pubky Client Factory](../utils/pubky-client-factory.ts) - SDK singleton
- [Image Handler](../utils/image-handler.ts) - Image resolution
- [Profile Generator](../utils/profile-generator.ts) - Profile HTML generation
