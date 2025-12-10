# Profile System Improvements

## Overview
Complete overhaul of the profile system to align with Pubky App specifications and best practices.

## Key Changes

### 1. ✅ **Pubky App Specs Integration** (`src/utils/pubky-specs.ts`)
- Now uses [`pubky-app-specs`](https://www.npmjs.com/package/pubky-app-specs) for proper profile validation
- Based on the official Pubky.app Data Model Specification
- Uses `PubkySpecsBuilder.createUser()` to validate profiles before saving
- Ensures all profiles are compliant with Pubky standards

**Source of Truth:** `profile.json` at `/pub/pubky.app/profile.json`

### 2. ✅ **Image Upload Functionality** (`src/popup/components/ProfileEditor.tsx`)
- **Upload Button**: Click "📤 Upload Image" to select and upload a photo from your device
- **Multiple Input Methods**:
  - Upload local files (max 5MB)
  - Paste HTTP/HTTPS URLs
  - Use homeserver paths (e.g., `/pub/pubky.app/files/avatar.jpg`)
- **Image Validation**: Checks file type and size before upload
- **Preview**: Shows uploaded/selected image with option to remove

### 3. ✅ **Proper Image Handling** (`src/utils/image-handler.ts`)
Supports three types of image URLs:
1. **HTTP/HTTPS URLs** - External images (e.g., `https://i.imgur.com/example.jpg`)
2. **Pubky URLs** - Full homeserver URLs (e.g., `pubky://PUBKEY/pub/pubky.app/files/avatar.jpg`)
3. **Relative paths** - Homeserver paths (e.g., `/pub/pubky.app/files/avatar.jpg`)

**How it works:**
- Uses `client.fetch()` from `@synonymdev/pubky` SDK to fetch images from homeservers
- Converts fetched images to data URLs (base64) for display in HTML
- External HTTP/HTTPS URLs are passed through unchanged
- `uploadImage()` method uploads blobs to homeserver at `/pub/pubky.app/files/`

### 4. ✅ **Tag Colors from Franky** (`src/utils/tag-colors.ts`)
Implemented the same tag color system as [Franky](https://github.com/pubky/franky/blob/master/src/libs/utils/utils.ts):

```typescript
const TAG_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B195', // Peach
  '#6C5CE7', // Indigo
];
```

- `getTagColor(tag)` - Returns consistent color based on tag hash
- `getTagStyle(tag)` - Returns style object for inline use

### 5. ✅ **Emoji Picker** (Restored)
- 150+ emojis organized in a grid
- Click the emoji button next to status field
- Automatically prepends selected emoji to status
- Button shows current emoji from your status

### 6. ✅ **Profile Data Flow**

```
User edits profile in Profile Editor
          ↓
Uses pubky-app-specs to validate
          ↓
Saves to profile.json (source of truth)
          ↓
Generates index.html from profile.json
          ↓
Both saved to homeserver
          ↓
Changes reflected in Pubky App
```

**Files Updated:**
1. `profile.json` at `/pub/pubky.app/profile.json` (validated with pubky-app-specs)
2. `index.html` at `/pub/pubky.app/index.html` (generated from profile.json)
3. Images stored at `/pub/pubky.app/files/avatar-{timestamp}.{ext}`

### 7. ✅ **Profile Renderer Updates** (`src/profile/profile-renderer.ts`)
Priority order when rendering profiles:
1. **profile.json** (source of truth) → Renders with resolved images
2. **index.html** (fallback) → Displays cached HTML
3. **Nexus data** (last resort) → Generates profile from available data

### 8. ✅ **Profile Manager** (`src/utils/profile-manager.ts`)
- `saveProfileJSON()` - Uses pubky-app-specs for validation before saving
- `generateIndexHTML()` - Resolves images to data URLs, then generates HTML
- `ensureProfile()` - Checks for profile.json, creates if missing, syncs with index.html

## Data Model (Pubky App Standard)

```typescript
interface ProfileData {
  name: string;           // Display name (required)
  bio?: string;          // Biography
  image?: string;        // Avatar URL or homeserver path
  status?: string;       // Status with emoji (e.g., "🚀 Building")
  links?: Array<{        // Social links
    title: string;
    url: string;
  }>;
}
```

## Usage

### Editing Your Profile:
1. Open the extension popup
2. Click "Edit Profile"
3. Fill in your details:
   - **Name**: Your display name
   - **Bio**: About yourself
   - **Avatar**: Upload or paste image URL
   - **Status**: Click emoji button + add text
   - **Links**: Add social media, website, etc.
4. Click "Save Profile"

### What Happens on Save:
1. Profile validated with `pubky-app-specs`
2. Saved as `profile.json` to your homeserver
3. `index.html` generated from `profile.json`
4. Images resolved (homeserver paths → data URLs)
5. Changes immediately visible in Pubky App

### Viewing Profiles:
- Click any `pubky://` URL on a webpage
- Profile renderer fetches `profile.json`
- Resolves avatar images using Pubky SDK
- Displays beautiful profile page

## Technical Details

### Image Resolution Process:
```javascript
// When displaying profile
1. Check if image is HTTP/HTTPS → use directly
2. Check if image is pubky:// → fetch with client.fetch()
3. Check if image is relative path → construct full pubky:// URL
4. Convert fetched image blob → data URL (base64)
5. Embed data URL in generated HTML
```

### Profile Validation (pubky-app-specs):
```javascript
const specsBuilder = new PubkySpecsBuilder(pubkeyId);
const { user, meta } = specsBuilder.createUser(
  name,       // Required
  bio,        // Optional
  image,      // Optional
  linksJson,  // Optional (JSON string)
  status      // Optional
);
// Returns validated JSON + homeserver URL
```

## Benefits

1. **Standards Compliant**: Uses official pubky-app-specs
2. **Source of Truth**: profile.json is authoritative
3. **Pubky App Sync**: Changes reflected in main app
4. **Image Upload**: Easy photo management
5. **Proper SDK Usage**: Leverages @synonymdev/pubky correctly
6. **Tag Consistency**: Matches Franky/Pubky App colors
7. **Better UX**: Upload photos, pick emojis, preview changes

## References

- [pubky-app-specs on npm](https://www.npmjs.com/package/pubky-app-specs)
- [Pubky.app Data Model Specification](https://docs.rs/pubky-app-specs)
- [Franky Tag Colors](https://github.com/pubky/franky/blob/master/src/libs/utils/utils.ts#L99)
- [@synonymdev/pubky SDK](https://www.npmjs.com/package/@synonymdev/pubky)

## Next Steps

1. Reload the extension
2. Edit your profile
3. Upload a photo or paste image URL
4. Save and view your profile
5. Your changes will be visible in Pubky App!

