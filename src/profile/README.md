# Profile Renderer

Renders Pubky user profiles in a standalone HTML page.

## Files

- `profile-renderer.html` - HTML template
- `profile-renderer.ts` - TypeScript entry point

## Purpose

When a user clicks a `pubky://` or `pk://` URL, this page renders the user's profile by:
1. Extracting the Pubky ID from the URL
2. Fetching profile data from Nexus API
3. Rendering a styled profile card

## URL Format

```
chrome-extension://<id>/src/profile/profile-renderer.html?pubky=<pubky_id>
```

## Profile Display

Shows:
- Avatar image
- Username
- Bio
- Status (emoji + text)
- Social links
- Profile creation/update time

## Data Fetching

Uses Nexus API to fetch user profiles:

```typescript
const response = await fetch(
  `https://nexus.pubky.app/v0/user/${pubkyId}`
);
const profile = await response.json();
```

## Styling

Dark theme matching the rest of the extension:
- Gradient backgrounds
- Rounded card design
- Link buttons with hover effects

## Integration

Content script creates links to this page:

```typescript
const profileUrl = chrome.runtime.getURL(
  `src/profile/profile-renderer.html?pubky=${pubkyId}`
);
window.open(profileUrl, '_blank');
```

## See Also

- [Content Script](../content/README.md) - URL linkification
- [Nexus Client](../utils/nexus-client.ts) - API calls

