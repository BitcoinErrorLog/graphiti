# Archived Development Notes

This folder contains historical development notes from the Graphiti project. These documents were created during active development to track fixes, features, and improvements.

**Note:** These documents may be outdated. For current information, refer to the main documentation files.

## Archived Files

The following files have been moved here for historical reference:

- **BOOKMARK_FIX_FINAL.md** - Fix for bookmark creation (bookmarks must reference posts, not URLs)
- **BOOKMARK_SYNC_FIX.md** - Bookmark synchronization improvements
- **NAVIGATION_FIX.md** - Navigation bug fixes
- **SERVICE_WORKER_FIX.md** - Service worker "window is not defined" fix
- **DEBUG_HIGHLIGHTS.md** - Debugging annotation highlights
- **ANNOTATION_FEATURE.md** - Original annotation feature documentation
- **GRAFFITI_FEATURE.md** - Original drawing feature documentation
- **PROFILE_SYSTEM_IMPROVEMENTS.md** - Profile system enhancements
- **PUBKY_URL_PROFILE_FEATURE.md** - Pubky URL profile rendering
- **IMPROVEMENTS_V2.md** - V2 improvements documentation
- **TROUBLESHOOTING_DRAWING.md** - Drawing mode troubleshooting
- **TESTING_ANNOTATIONS.md** - Annotation testing notes
- **CREATE_PULL_REQUEST.md** - PR creation notes
- **QUICK_START.md** - Original quick start guide
- **INSTALLATION_INSTRUCTIONS.md** - Original installation guide
- **INSTALLATION.md** - Duplicate installation guide
- **SUMMARY.md** - Development summary
- **REVIEW_SUMMARY.md** - Comprehensive code review summary (January 2025)
- **URL_HASH_TAG_SYSTEM.md** - URL hash tag system documentation (superseded by UTF16_HASH_ENCODING.md)
- **CODE_REVIEW.md** - Historical code review (November 2025, superseded by REVIEW_SUMMARY.md)
- **SDK_INTEGRATION.md** - Pubky SDK integration technical reference
- **test.html** - Development test page for annotations
- **generate-icons.html** - Icon generator tool
- **create-icons.js** - Script to create SVG icons
- **create-png-icons.js** - Script to create PNG icons

## Key Historical Fixes

### Bookmark Architecture Fix

The most significant fix was understanding that Pubky bookmarks must point to **posts**, not external URLs:

```
HTTP URL (https://example.com)
    ↓
Link Post (pubky://.../posts/ABC)  ← Indexed by Nexus
    ↓
Bookmark (pubky://.../bookmarks/XYZ) → points to Post
    ↓
Appears in Pubky App ✅
```

### Service Worker Fix

Annotations had issues because service workers don't have `window` access. The fix implemented a two-phase sync:
1. Immediate local save (instant)
2. Background sync to Pubky (when possible)

### UTF-16 Encoding

The URL hash tag encoding evolved from Base64URL to UTF-16 encoding for creating unique, collision-resistant tags.

---

*Last archived: January 2025*

