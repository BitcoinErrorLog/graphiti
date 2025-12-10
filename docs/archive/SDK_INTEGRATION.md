# Pubky SDK Integration

This document explains how the Graphiti extension integrates with the official Pubky ecosystem.

## Official Packages Used

### @synonymdev/pubky
The official JavaScript/TypeScript SDK for Pubky, providing:
- **Client**: Main class for interacting with Pubky network
- **AuthRequest**: QR-based authentication flow
- **Keypair**: Cryptographic key management
- **PublicKey**: Public key utilities
- **Session**: Authenticated session management

**Package**: https://www.npmjs.com/package/@synonymdev/pubky

### pubky-app-specs
The official Pubky App data model specifications and validation library:
- **PubkySpecsBuilder**: Creates and validates all Pubky App models
- **Automatic ID Generation**: Proper Crockford Base32 timestamp/hash IDs
- **Data Validation**: Ensures compliance with pubky-app-specs v0.4.0
- **URI Builders**: Generate correctly formatted Pubky URIs
- **WASM-based**: Uses Blake3 hashing for deterministic IDs

**Package**: https://www.npmjs.com/package/pubky-app-specs  
**GitHub**: https://github.com/pubky/pubky-app-specs

## Architecture

### Authentication Flow (`src/utils/auth-sdk.ts`)

The extension uses the official SDK authentication:

```typescript
import { Client } from '@synonymdev/pubky';

// 1. Initialize client
const client = new Client();

// 2. Create auth request
const authRequest = client.authRequest(
  'https://demo.httprelay.io/link',  // Relay URL
  '/pub/pubky.app/:rw'                 // Capabilities
);

// 3. Generate QR code
const authUrl = authRequest.url(); // Returns pubkyauth:// URL
// Display QR code to user

// 4. Wait for approval
const publicKey = await authRequest.response();
const pubkyId = publicKey.z32(); // Get z-base32 encoded public key
```

**Key Features:**
- No manual cryptography - SDK handles everything
- Secure channel-based auth via HTTP relay
- Returns PublicKey object for user identification
- Capabilities string format: `/path/:rw` (read-write)

### Nexus API Client (`src/utils/nexus-client.ts`)

Direct REST API client for querying the Pubky Nexus:

```typescript
// Stream posts from following
const response = await nexusClient.streamPosts({
  source: 'following',
  observer_id: userPubky,
  limit: 20
});

// Search posts by tag
const posts = await nexusClient.searchPostsByTag('webdev', {
  limit: 10,
  sorting: 'latest'
});

// Get user profile
const user = await nexusClient.getUser(userId, viewerId);
```

**API Base URL**: `https://api.nexus.pubky.app` (configure as needed)

**Key Endpoints Used:**
- `GET /v0/stream/posts` - Stream posts with filters
- `GET /v0/search/posts/by_tag/{tag}` - Search by tag
- `GET /v0/post/{author_id}/{post_id}` - Get specific post
- `GET /v0/user/{user_id}` - Get user profile

### Homeserver Operations (`src/utils/pubky-api-sdk.ts`)

Using the SDK Client for data operations:

```typescript
import { Client } from '@synonymdev/pubky';

const client = new Client();

// Read public data
const response = await client.fetch('pubky://user_id/pub/pubky.app/profile.json');
const data = await response.json();

// List directory
const files = await client.list(
  'pubky://user_id/pub/pubky.app/posts/',
  null,    // cursor
  false,   // reverse
  10,      // limit
  false    // shallow
);
```

**Write Operations**: Implemented using SDK's `Client.fetch()` with PUT method:

```typescript
await client.fetch(pubkyUrl, {
  method: 'PUT',
  body: JSON.stringify(data)
});
```

The extension attempts to write to homeserver and falls back to local storage if the write fails (e.g., permission issues).

## Data Models

### Pubky App Schema

All data follows the official Pubky App specifications:

**Bookmark** (`/pub/pubky.app/bookmarks/{id}`):
```json
{
  "uri": "https://example.com",
  "created_at": 1234567890
}
```

**Tag** (`/pub/pubky.app/tags/{id}`):
```json
{
  "uri": "pubky://user_id/pub/pubky.app/posts/1234567890",
  "label": "webdev",
  "created_at": 1234567890
}
```

**Note**: Tags reference the POST URI, not the HTTP URL. When tagging a URL, you first create a post, then create tags that point to that post.

**Post** (`/pub/pubky.app/posts/{id}`):
```json
{
  "content": "Check out this link! https://example.com",
  "kind": "link",
  "parent": null,
  "embed": null,
  "attachments": []
}
```

**Note**: For link posts, the URL should be in the `content` field. The `attachments` array is only for Pubky file URIs (e.g., `pubky://user_id/pub/pubky.app/files/...`), not regular HTTP/HTTPS URLs.

IDs are generated using the official `pubky-app-specs` library (v0.4.0):
- **Post ID**: 13-character Crockford Base32 timestamp ID (microseconds)
- **Bookmark ID**: Hash ID derived from Blake3(uri), Crockford Base32 encoded
- **Tag ID**: Hash ID derived from Blake3(uri + ":" + label), Crockford Base32 encoded

**Crockford Base32**: Uses alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes I, L, O, U)

**Example using PubkySpecsBuilder**:
```typescript
import { PubkySpecsBuilder, PubkyAppPostKind } from 'pubky-app-specs';

const builder = new PubkySpecsBuilder(userId);

// Create a link post
const result = builder.createPost(
  'https://example.com',
  PubkyAppPostKind.Link,
  null, // parent
  null, // embed  
  []    // attachments
);

console.log(result.meta.id);   // e.g., "00F7K3Q0Z9X2G"
console.log(result.meta.url);  // Full pubky:// URI
console.log(result.post.toJson()); // Validated post object
```

### Workflow: Tagging a URL

When a user tags a URL, the extension follows this workflow:

1. **Create a Link Post** with `kind: 'link'`, URL in `content`, and empty `attachments`
2. **Create Tags** that reference the POST's Pubky URI (not the HTTP URL)
3. Tags allow discovery and organization of posts through Nexus

Example:
```typescript
// User tags https://example.com with "webdev", "tech"

// Step 1: Create post with Crockford Base32 timestamp ID
POST pubky://user_id/pub/pubky.app/posts/00F7K3Q0Z9X2G
{
  "content": "https://example.com",
  "kind": "link",
  "parent": null,
  "embed": null,
  "attachments": []
}

// Step 2: Create tags pointing to the POST
POST pubky://user_id/pub/pubky.app/tags/8H4M9PQRST2VWX
{
  "uri": "pubky://user_id/pub/pubky.app/posts/00F7K3Q0Z9X2G",
  "label": "webdev",
  "created_at": 1234567890123
}

POST pubky://user_id/pub/pubky.app/tags/3N5K7JMVWXY01Z
{
  "uri": "pubky://user_id/pub/pubky.app/posts/00F7K3Q0Z9X2G",
  "label": "tech",
  "created_at": 1234567890456
}
```

**Note**: IDs are now in Crockford Base32 format (e.g., `00F7K3Q0Z9X2G`) not decimal timestamps.

## Configuration

### Relay URL
The extension uses the official Pubky HTTP relay for auth:
```typescript
const RELAY_URL = 'https://httprelay.pubky.app/link/';
```

### Capabilities
Required permissions for the extension:
```typescript
const REQUIRED_CAPABILITIES = '/pub/pubky.app/:rw';
```

This grants read-write access to `/pub/pubky.app/` path on user's homeserver.

### Nexus API
The extension uses the official Pubky Nexus API:
```typescript
const NEXUS_API_URL = 'https://nexus.pubky.app';
```

## Testing

### Local Development

The SDK supports testnet mode for local testing:

```typescript
import { Client } from '@synonymdev/pubky';

// Create testnet client
const client = Client.testnet('localhost');
```

This configures:
- Pkarr relays at `http://localhost:15411`
- Homeserver URLs use HTTP instead of HTTPS
- Reads homeserver ports from Pkarr records

### Running Testnet

See [pubky-testnet](https://github.com/pubky/pubky-testnet) for setting up a local test environment.

## Production Readiness

### Current Status
✅ Authentication flow (fully integrated with SDK)
✅ Nexus API queries (REST client)
✅ Public data reading (SDK Client.fetch)
✅ Data writing (using SDK Client.fetch with PUT)

### To Enable Full Homeserver Writing

1. **Persist authenticated session:**
```typescript
// After auth success
const publicKey = await authRequest.response();
// Store publicKey for session recreation
```

2. **Recreate client with auth:**
```typescript
// When making authenticated requests
const client = new Client();
// Use client methods with proper auth headers
```

3. **Implement PUT operations:**
```typescript
// Use SDK's fetch with PUT method
await client.fetch(pubkyUrl, {
  method: 'PUT',
  body: JSON.stringify(data)
});
```

### Security Considerations

- **Session Storage**: Sessions are stored in Chrome's local storage
- **No Key Storage**: Extension never stores private keys
- **QR-only Auth**: All auth happens via mobile app scan
- **Capabilities**: Fine-grained permissions per path

## Bundle Size

The `@synonymdev/pubky` package includes WASM:
- Total size: ~1.07 MB (uncompressed)
- Gzipped: ~456 KB
- Includes: `pubky_bg.wasm` (~770 KB)

This is expected for a WASM-based cryptographic library.

## Debugging

### SDK Logs

Enable SDK logging:
```typescript
import { setLogLevel } from '@synonymdev/pubky';

setLogLevel('debug'); // or 'info', 'warn', 'error'
```

### Extension Logs

All SDK operations are logged via the extension's logger:
```typescript
logger.info('AuthSDK', 'Operation details', { data });
```

View logs in the extension's debug panel.

## References

- [Pubky SDK NPM](https://www.npmjs.com/package/@synonymdev/pubky)
- [Pubky Core Docs](https://github.com/pubky/pubky-core)
- [Pubky App Specs](https://github.com/pubky/pubky-app-specs)
- [Nexus API](https://github.com/pubky/pubky-nexus)
- [HTTP Relay](https://httprelay.io/)

## Future Enhancements

- [ ] Complete write operations with session persistence
- [ ] Implement DHT homeserver resolution
- [ ] Add offline caching with IndexedDB
- [ ] Support multiple accounts
- [ ] Implement post creation UI
- [ ] Add real-time updates via Nexus
- [ ] Support for file uploads
- [ ] Advanced tag filtering

