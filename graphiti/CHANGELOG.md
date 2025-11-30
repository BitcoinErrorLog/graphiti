# Changelog

All notable changes to the Graphiti extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### Added

#### Core Features
- **Authentication** - QR code-based sign-in with Pubky Ring mobile app
- **Bookmarks** - Save URLs to your Pubky homeserver with automatic link post creation
- **Tags** - Add custom tags to bookmarked URLs for organization and discovery
- **Annotations** - Highlight text on any webpage and add comments
- **Drawing** - Canvas overlay for drawing/graffiti on webpages (Alt+D)
- **Social Feed** - View posts from your network about the current page

#### UI Components
- Extension popup with quick actions
- Side panel feed viewer (Alt+S)
- Profile editor for Pubky identity management
- Debug panel for troubleshooting

#### Technical
- UTF-16 encoded URL hash tags for privacy-preserving content discovery
- Local-first data storage with optional Pubky sync
- Manifest V3 Chrome Extension architecture
- React 18 with TypeScript for UI components
- Tailwind CSS for styling

### Security
- Encrypted auth tokens with client secret
- URL hashing preserves privacy (original URL not exposed in tags)
- Service worker isolation for background operations

---

## [1.1.0] - 2025-11-30

### Added

#### Documentation
- CHANGELOG.md for tracking version history
- CONTRIBUTING.md with code style guide and PR process
- Practical code examples in API_REFERENCE.md

#### Error Handling
- React Error Boundaries in popup and sidepanel to prevent crashes
- Retry utility with exponential backoff for API calls
- Rate limiter utility using token bucket algorithm

#### Developer Experience
- SessionContext for React state management
- Section markers and architecture docs in content.ts
- Type improvements: replaced `any` with `unknown`/generics

#### Security
- Security guidelines in logger.ts documentation
- Log output audit (no sensitive data exposed)
- Typed NexusPost relationships and bookmark fields

### Changed
- Updated nexus-client.ts to use retry logic for resilience
- Improved AuthToken type usage in auth.ts
- Added 40+ new unit tests (207 total passing)

### Fixed
- TypeScript strict mode compliance in tests
- Removed unused variables from test files

---

## [Unreleased]

### Planned
- Offline mode for cached content viewing
- Notification system for new posts
- Import/export functionality
- Tag autocomplete suggestions

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-11-30 | Initial production release |

