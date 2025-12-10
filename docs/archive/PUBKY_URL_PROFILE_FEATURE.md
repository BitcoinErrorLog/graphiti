# Pubky URL Profile Rendering Feature

## Overview

This feature enables `pubky://` and `pk://` URLs to be clickable and render as beautiful profile pages when accessed from web pages or typed directly into the browser's address bar.

## Key Features

### 1. **URL Click Interception**
- Any `pubky://PUBLIC_KEY` or `pk://PUBLIC_KEY` URL on a web page is now clickable
- Clicking the URL opens a new tab with a beautifully rendered profile page
- Works in the address bar (omnibox) too - just type a pubky URL directly

### 2. **Automatic Profile Generation**
- When a user authenticates with the extension, an `index.html` profile is automatically created on their homeserver
- The profile is stored at `/pub/pubky.app/index.html`
- Pre-populates data from Nexus API if available (avatar, username, bio, links)
- Falls back to sensible defaults if no Nexus data exists

### 3. **Profile Editor**
- Accessible from the popup's "Edit Profile" button
- Edit the following fields:
  - **Username**: Display name
  - **Avatar**: Image URL
  - **Bio**: Description about yourself
  - **Status**: Emoji + text (e.g., 👋 Hello Pubky!)
  - **Links**: Multiple links with titles (social media, website, etc.)
- Real-time preview available
- Saves to homeserver and local cache automatically

### 4. **Profile Renderer**
- Standalone page that renders profile HTML
- Beautiful, modern design matching pubky-app aesthetics
- Features:
  - Hero section with gradient background
  - Circular avatar with border
  - Status badge with emoji
  - Clickable link cards
  - Public key display with copy button
  - Fully responsive design
  - Dark theme by default

### 5. **Path Resolution**
- **Root URLs** (`pubky://PUBLIC_KEY`): Loads `/pub/pubky.app/index.html`
- **Folder paths** (`pubky://PUBLIC_KEY/folder/path`):
  - First tries to load `/folder/path/index.html`
  - Falls back to displaying raw file contents
- **Direct files** (`pubky://PUBLIC_KEY/file.txt`): Displays raw content

### 6. **Caching**
- Profile data cached locally for 1 hour (configurable TTL)
- Reduces homeserver requests for frequently viewed profiles
- Automatic cache expiration and refresh

## Usage

### For End Users

1. **View a Profile**:
   - Click any `pubky://` or `pk://` link on a web page
   - Or type `pubky://PUBLIC_KEY` directly in the address bar
   - Profile opens in a new tab

2. **Edit Your Profile**:
   - Open the Graphiti extension popup
   - Sign in (if not already signed in)
   - Click the "Edit Profile" button
   - Fill in your details
   - Click "Save Profile"
   - Your profile is now live at `pubky://YOUR_PUBLIC_KEY`

3. **Preview Your Profile**:
   - In the profile editor, click "Preview" to see how it looks
   - Or share your `pubky://` URL with others

### For Developers

#### Profile Data Structure
```typescript
interface ProfileData {
  avatar?: string;           // URL or base64 image
  username: string;          // Display name
  bio?: string;              // Biography
  status?: {
    text: string;            // Status message
    emoji: string;           // Status emoji
  };
  links?: Array<{
    title: string;           // Link title
    url: string;             // Link URL
  }>;
  publicKey: string;         // User's public key
  updatedAt: number;         // Last update timestamp
}
```

#### Storage API
```typescript
// Save profile data
await storage.saveProfile(profileData);

// Get profile data
const profile = await storage.getProfile();

// Cache profile for another user
await storage.cacheProfile(pubkey, profileData, ttl);

// Get cached profile
const cachedProfile = await storage.getCachedProfile(pubkey);
```

#### Profile Generator
```typescript
import { generateProfileHTML } from './utils/profile-generator';

// Generate HTML from profile data
const html = generateProfileHTML(profileData);

// Upload to homeserver
const profilePath = `pubky://${publicKey}/pub/pubky.app/index.html`;
await client.fetch(profilePath, {
  method: 'PUT',
  body: html,
  credentials: 'include',
});
```

## Technical Details

### Files Added
- `src/utils/profile-generator.ts` - HTML profile generator
- `src/profile/profile-renderer.html` - Profile renderer page
- `src/profile/profile-renderer.ts` - Profile renderer logic
- `src/popup/components/ProfileEditor.tsx` - Profile editor UI

### Files Modified
- `src/content/content.ts` - Added URL click interception
- `src/background/background.ts` - Added profile tab handler and omnibox interception
- `src/utils/storage.ts` - Added profile storage interfaces
- `src/utils/auth-sdk.ts` - Added profile generation on auth
- `src/popup/components/MainView.tsx` - Added "Edit Profile" button
- `src/popup/App.tsx` - Added profile editor navigation
- `vite.config.ts` - Added profile renderer as build entry
- `manifest.json` - Added `webNavigation` permission

### Permissions
- `webNavigation` - Required for omnibox/address bar interception

### Profile Storage Location
- **Homeserver**: `/pub/pubky.app/index.html`
- **Local Cache**: Chrome storage (`profile` key)
- **User-specific Cache**: Chrome storage (`profile_cache_{pubkey}` keys)

## Design Philosophy

1. **Self-Contained**: Profile HTML is fully self-contained with inline CSS and minimal JavaScript
2. **Beautiful**: Modern, gradient-based design matching pubky-app aesthetics
3. **Performant**: Caching reduces homeserver requests
4. **User-Controlled**: Users have full control over their profile data
5. **Privacy-First**: No tracking, no analytics, just pure decentralized profiles

## Future Enhancements

Potential improvements for future iterations:
- [ ] Batch profile uploads for multiple users
- [ ] Profile themes/templates
- [ ] Animated avatars support
- [ ] Rich text bio formatting
- [ ] Social graph visualization
- [ ] Profile verification badges
- [ ] Custom CSS injection
- [ ] Profile analytics (privacy-preserving)

## Testing

To test the feature:

1. Build the extension: `npm run build`
2. Load the unpacked extension from the `dist` folder in Chrome
3. Sign in to the extension
4. Go to your profile editor and fill in details
5. Save your profile
6. Share your `pubky://YOUR_PUBLIC_KEY` URL
7. Click it to see your rendered profile!

## Support

For issues or questions:
- Check the debug panel in the extension popup (🔧 Debug button)
- Review console logs in the profile renderer tab
- Check homeserver connectivity

---

**Built with ❤️ for the Pubky ecosystem**

