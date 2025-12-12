# Production Readiness Audit: Web & Chrome Extensions

You are a team of expert auditors reviewing this web codebase for production deployment. This audit focuses on browser applications, Chrome extensions, and Pubky SDK integration. You must perform a comprehensive, hands-on audit - not a documentation review.

## MANDATORY FIRST STEPS (Do these before anything else)

### 1. Build & Test Verification

```bash
# Install dependencies
npm install 2>&1

# Run linter
npm run lint 2>&1 || npx eslint . 2>&1

# Run type checker (if TypeScript)
npm run typecheck 2>&1 || npx tsc --noEmit 2>&1

# Run tests
npm test 2>&1

# Build for production
npm run build 2>&1
```

### 2. Chrome Extension Validation (if applicable)

```bash
# Validate manifest.json exists and is valid JSON
cat manifest.json | jq .

# Check manifest version (should be v3 for new extensions)
cat manifest.json | jq '.manifest_version'

# List all permissions requested
cat manifest.json | jq '.permissions, .optional_permissions, .host_permissions'

# Find all content scripts
cat manifest.json | jq '.content_scripts'

# Find background/service worker
cat manifest.json | jq '.background'

# Check for keyboard commands
cat manifest.json | jq '.commands'

# Check for side panel configuration
cat manifest.json | jq '.side_panel'
```

### 3. Dependency Audit

```bash
# Check for known vulnerabilities
npm audit 2>&1

# List all dependencies
npm ls --depth=0

# Check for outdated packages
npm outdated

# Verify Pubky SDK version
npm ls @synonymdev/pubky
```

### 4. Code Quality Searches

```bash
# Find TODO/FIXME markers
grep -rn "TODO\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find console.log statements (should be removed in production)
grep -rn "console\.\(log\|debug\|info\)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/ | grep -v test

# Find debugger statements
grep -rn "debugger" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find eval() usage (security risk)
grep -rn "eval\s*(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find innerHTML usage (XSS risk)
grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

### 5. Build Configuration Validation (Vite/Webpack)

```bash
# Check Vite config exists and review entry points
cat vite.config.ts 2>/dev/null || cat vite.config.js 2>/dev/null || cat webpack.config.js 2>/dev/null

# Check for content script separate bundling (common pattern)
cat vite.content.config.ts 2>/dev/null

# Verify all manifest-referenced files are built
ls -la dist/

# Check for source maps in production (security concern)
find dist/ -name "*.map" 2>/dev/null

# Check build output size
du -sh dist/
```

**Verification Checklist:**
- [ ] Are all manifest.json entry points included in build config?
- [ ] Is content script bundled separately (required for manifest v3)?
- [ ] Are source maps excluded from production builds?
- [ ] Is code-splitting configured for optimal chunk sizes?
- [ ] Are vendor chunks separated (React, SDK, etc.)?

## DO NOT

- ❌ Read node_modules/ or dist/ directories
- ❌ Trust README claims without code verification
- ❌ Skim files - read the actual implementations
- ❌ Assume tests pass without running them
- ❌ Report issues from docs instead of code inspection
- ❌ Ignore Chrome extension manifest security implications
- ❌ Skip Pubky SDK usage verification

---

## PUBKY SDK USAGE AUDIT

This section ensures the `@synonymdev/pubky` SDK is used correctly.

### 1. SDK Initialization

```bash
# Find Pubky SDK imports
grep -rn "from ['\"]@synonymdev/pubky['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find Pubky instance creation
grep -rn "new Pubky\|Pubky\.testnet\|new Client" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find setLogLevel calls
grep -rn "setLogLevel" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `new Pubky()` or `new Client()` used for mainnet and `Pubky.testnet()` for development?
- [ ] Is `setLogLevel()` called ONCE before any other SDK usage (if used)?
- [ ] Is the SDK imported consistently (ESM vs CJS)?
- [ ] Are multiple Pubky instances avoided (singleton pattern preferred)?

### 2. Key Management

```bash
# Find Keypair usage
grep -rn "Keypair\.\|keypair\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find PublicKey usage
grep -rn "PublicKey\.\|publicKey\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find recovery file handling
grep -rn "recoveryFile\|createRecoveryFile\|fromRecoveryFile" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are Keypairs created with `Keypair.random()` or `Keypair.fromRecoveryFile()`?
- [ ] Are PublicKeys parsed with `PublicKey.from(z32String)`?
- [ ] Are recovery files encrypted with strong passphrases?
- [ ] Are private keys NEVER stored in localStorage/sessionStorage unencrypted?
- [ ] Are passphrases prompted from users, not hardcoded?

### 3. Session Management

```bash
# Find session operations
grep -rn "\.signup\|\.signin\|\.signout\|session\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find signer usage
grep -rn "\.signer\|signer\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `signer.signin()` preferred over `signer.signinBlocking()` for better UX?
- [ ] Is `session.signout()` called when user logs out?
- [ ] Are session cookies handled automatically (not manually stored)?
- [ ] Is session state properly synchronized with UI?
- [ ] Are session errors (401, 403) handled gracefully?

### 4. Storage Operations

```bash
# Find storage operations
grep -rn "\.putJson\|\.putText\|\.putBytes\|\.getJson\|\.getText\|\.getBytes\|\.delete\|\.list\|\.exists\|\.stats" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find publicStorage usage
grep -rn "publicStorage\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find session.storage usage
grep -rn "session\.storage\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `publicStorage` used for read-only public data (addressed paths: `pubky<pk>/pub/...`)?
- [ ] Is `session.storage` used for authenticated writes (absolute paths: `/pub/...`)?
- [ ] Are paths always under `/pub/` (not `/priv/` which is forbidden)?
- [ ] Are app-specific paths namespaced (e.g., `/pub/my-app.com/...`)?
- [ ] Is `.list()` called with trailing `/` on directory paths?
- [ ] Are 404 errors handled gracefully (resource may not exist)?

### 5. Auth Flow (pubkyauth)

```bash
# Find auth flow usage
grep -rn "startAuthFlow\|authorizationUrl\|awaitApproval\|approveAuthRequest\|validateCapabilities\|authRequest" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find capability strings
grep -rn "/:rw\|/:r\|/:w" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find QR code generation
grep -rn "qrcode\|QRCode\|toDataURL" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `validateCapabilities()` called before `startAuthFlow()` when accepting user input?
- [ ] Are capabilities scoped to minimum required permissions (principle of least privilege)?
- [ ] Is a custom relay specified for production (not relying on default)?
- [ ] Is `awaitApproval()` properly awaited and errors handled?
- [ ] Are pubkyauth:// URLs handled securely (not logged, not exposed)?
- [ ] Is QR code generated for mobile authentication?

### 6. Error Handling

```bash
# Find try-catch around SDK calls
grep -rn "try\s*{" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find PubkyError handling
grep -rn "PubkyError\|error\.name\|error\.data" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are all SDK async calls wrapped in try-catch?
- [ ] Is `error.name` checked for specific error types (`RequestError`, `AuthenticationError`, etc.)?
- [ ] Is `error.data?.statusCode` checked for HTTP status codes?
- [ ] Are errors displayed to users without leaking sensitive details?
- [ ] Is there retry logic for transient network errors?

---

## CHROME EXTENSION SECURITY AUDIT

### 1. Manifest Security

```bash
# Check for overly broad permissions
grep -E "activeTab|tabs|<all_urls>|http://\*|https://\*|\*://\*" manifest.json

# Check for dangerous permissions
grep -E "webRequest|webRequestBlocking|debugger|nativeMessaging|management" manifest.json

# Check content security policy
cat manifest.json | jq '.content_security_policy'

# Check web accessible resources
cat manifest.json | jq '.web_accessible_resources'
```

**Verification Checklist:**
- [ ] Is `manifest_version: 3` used (not deprecated v2)?
- [ ] Are permissions scoped to minimum required?
- [ ] Is `<all_urls>` avoided (use specific host patterns)?
- [ ] Are `web_accessible_resources` limited and necessary?
- [ ] Is there a restrictive `content_security_policy`?
- [ ] Is `wasm-unsafe-eval` used only if WASM is required?

### 2. Content Script Security

```bash
# Find content script files
cat manifest.json | jq -r '.content_scripts[]?.js[]?' 2>/dev/null

# Find DOM manipulation in content scripts
grep -rn "document\.\|window\.\|\.innerHTML" --include="*.ts" --include="*.js" . | grep -v node_modules/ | grep -v background

# Find CSS injection patterns
grep -rn "document.head.appendChild\|insertAdjacentHTML\|insertRule" --include="*.ts" . | grep -v node_modules/

# Check for namespaced class names
grep -rn "className\s*=\|classList" --include="*.ts" . | grep content | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Do content scripts use `textContent` instead of `innerHTML`?
- [ ] Are content scripts isolated from page context?
- [ ] Is `matches` pattern specific (not `<all_urls>`)?
- [ ] Is data from page DOM sanitized before use?
- [ ] Are content scripts minimal (delegate to background)?
- [ ] Are injected element class names namespaced (e.g., `pubky-*`)?
- [ ] Are injected styles scoped to avoid page conflicts?
- [ ] Is z-index managed to avoid conflicts with page elements?
- [ ] Are MutationObservers disconnected on cleanup?
- [ ] Are event listeners removed on page unload?

### 3. Background/Service Worker Security

```bash
# Find background script
cat manifest.json | jq -r '.background.service_worker // .background.scripts[]?' 2>/dev/null

# Find message handling
grep -rn "chrome\.runtime\.onMessage\|browser\.runtime\.onMessage" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find external message handling
grep -rn "onMessageExternal\|onConnectExternal" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find alarm usage (for periodic tasks)
grep -rn "chrome.alarms\|onAlarm" --include="*.ts" --include="*.js" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `service_worker` used (not persistent background pages)?
- [ ] Are message senders validated before processing?
- [ ] Is `onMessageExternal` sender origin validated?
- [ ] Are sensitive operations only triggered by trusted senders?
- [ ] Is there no `eval()` or dynamic code execution?
- [ ] Is `chrome.alarms` used instead of `setInterval` for periodic tasks?
- [ ] Is global state initialized on each service worker activation?
- [ ] Is `onInstalled` used for one-time setup (alarm creation, etc.)?
- [ ] Are there handlers for `unhandledrejection` and `error` events?

### 4. Message Type Consistency

```bash
# Find message type definitions
grep -rn "MESSAGE_TYPES\|const.*=.*{" --include="constants.ts" . | head -50

# Find all message senders
grep -rn "sendMessage\s*(" --include="*.ts" --include="*.tsx" . | grep -v node_modules/ | grep -v "\.test\."

# Find all message listeners
grep -rn "onMessage.addListener" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Check for message type validation in handlers
grep -rn "message.type\s*===\|message.type\s*==" --include="*.ts" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are message types centralized in a constants file?
- [ ] Do all `sendMessage` calls use defined constants (not string literals)?
- [ ] Do message handlers validate `message.type` before processing?
- [ ] Is `return true` used for async responses in `onMessage`?
- [ ] Are message handlers properly typed (not `any`)?
- [ ] Is there a default/fallback case for unknown message types?

### 5. Service Worker Lifecycle (Manifest V3)

```bash
# Check for user gesture requirements
grep -rn "sidePanel.open\|popup.open" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find alarm usage for periodic tasks
grep -rn "chrome.alarms\|onAlarm" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Check for persistent state patterns (problematic in service workers)
grep -rn "let\s\+\w\+\s*=\|var\s\+\w\+\s*=" --include="background.ts" . | head -20

# Find service worker event handlers
grep -rn "chrome.runtime.onInstalled\|chrome.runtime.onStartup" --include="*.ts" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are user gesture-requiring APIs called synchronously (not after await)?
- [ ] Is `chrome.alarms` used instead of `setInterval` for periodic tasks?
- [ ] Is global state initialized on each service worker activation?
- [ ] Is `onInstalled` used for one-time setup (alarm creation, etc.)?
- [ ] Are there handlers for `unhandledrejection` and `error` events?
- [ ] Is there proper cleanup for event listeners?

### 6. Storage Security

```bash
# Find storage usage
grep -rn "chrome\.storage\|browser\.storage\|localStorage\|sessionStorage" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find what's being stored
grep -rn "\.set\(.*key\|\.set\(.*secret\|\.set\(.*token\|\.set\(.*password" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find quota checking
grep -rn "getBytesInUse\|QUOTA_BYTES\|checkStorageQuota" --include="*.ts" . | grep -v node_modules/

# Find large data storage (drawings, images)
grep -rn "saveDrawing\|canvasData\|base64" --include="*.ts" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `chrome.storage.local` used (not `localStorage` for extensions)?
- [ ] Are sensitive values encrypted before storage?
- [ ] Are Pubky private keys NEVER stored in plain storage?
- [ ] Is `chrome.storage.session` used for ephemeral session data?
- [ ] Are storage keys namespaced to avoid collisions?
- [ ] Is storage quota checked before large writes?
- [ ] Are users warned when storage is near capacity?
- [ ] Is there a storage management UI for users?
- [ ] Are old/synced items cleaned up automatically?
- [ ] Is there graceful handling of quota exceeded errors?

---

## CHROME OFFSCREEN DOCUMENT AUDIT

Extensions using WASM or SDKs that require DOM/window access must use offscreen documents.

### 1. Offscreen Document Usage

```bash
# Find offscreen document references
grep -rn "chrome.offscreen\|offscreen.html" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Find offscreen document file
find . -name "*offscreen*.html" -not -path "./node_modules/*"

# Find offscreen bridge/communication patterns
grep -rn "sendToOffscreen\|target.*offscreen" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Check for offscreen reasons
grep -rn "createDocument" --include="*.ts" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `chrome.offscreen.createDocument()` called with valid reasons?
- [ ] Is `hasDocument()` or `getContexts()` checked before creating to prevent duplicates?
- [ ] Is the offscreen document closed when no longer needed?
- [ ] Are messages properly targeted to offscreen with `target: 'offscreen'`?
- [ ] Does the offscreen document handle errors gracefully?
- [ ] Is there a timeout/retry mechanism for offscreen communication?
- [ ] Is the justification for offscreen document reasonable?

---

## MULTI-ENTRY POINT ARCHITECTURE AUDIT

### 1. Entry Point Structure

```bash
# Find all HTML entry points
find . -name "*.html" -not -path "./node_modules/*" -not -path "./dist/*"

# Find React entry points
grep -rn "createRoot\|ReactDOM.render" --include="*.tsx" --include="*.ts" . | grep -v node_modules/

# Find shared context providers
grep -rn "createContext\|Provider" --include="*.tsx" . | grep -v node_modules/ | grep -v "\.test\."

# Check for shared state between popup/sidepanel
grep -rn "chrome.storage.onChanged" --include="*.tsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Does each HTML entry have a corresponding React mount point?
- [ ] Are context providers shared appropriately between entries?
- [ ] Is there sync mechanism for state changes across popup/sidepanel?
- [ ] Are entry points importing from shared `src/` directories?
- [ ] Is lazy loading used for non-critical components?

---

## WEB APPLICATION SECURITY AUDIT

### 1. XSS Prevention

```bash
# Find dangerous DOM operations
grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML\|document\.write" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find dangerouslySetInnerHTML (React)
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" . | grep -v node_modules/

# Find template literal HTML construction
grep -rn "\`.*<.*\${.*}.*>\`" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `innerHTML` avoided (use `textContent` or framework methods)?
- [ ] Is `dangerouslySetInnerHTML` justified and sanitized (DOMPurify)?
- [ ] Are user inputs escaped before display?
- [ ] Are URLs validated before use in `href` or `src`?
- [ ] Is there a strict Content Security Policy?

### 2. Content Security Policy

```bash
# Find CSP headers/meta tags
grep -rn "Content-Security-Policy\|content=\"default-src" --include="*.html" --include="*.ts" --include="*.js" . | grep -v node_modules/

# Check for inline scripts (CSP violation)
grep -rn "<script>" --include="*.html" . | grep -v node_modules/ | grep -v src=
```

**Verification Checklist:**
- [ ] Is there a CSP that blocks `unsafe-inline` and `unsafe-eval`?
- [ ] Are external scripts loaded from trusted origins only?
- [ ] Is `script-src 'self'` used (no external scripts)?
- [ ] Are styles handled without `unsafe-inline` (use classes)?

### 3. Sensitive Data Handling

```bash
# Find localStorage/sessionStorage usage
grep -rn "localStorage\|sessionStorage" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find what's being stored
grep -rn "setItem\|getItem" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find cookie handling
grep -rn "document\.cookie\|cookie" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are private keys NEVER stored in localStorage (use encrypted storage)?
- [ ] Are session tokens handled by SDK cookies (not manual storage)?
- [ ] Is sensitive data cleared on logout?
- [ ] Are recovery files not stored in browser storage?
- [ ] Is IndexedDB usage encrypted if storing sensitive data?

### 4. CORS and Network Security

```bash
# Find fetch/axios calls
grep -rn "fetch\s*(\|axios\.\|XMLHttpRequest" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find CORS configuration
grep -rn "Access-Control\|cors\|credentials" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are requests made to HTTPS endpoints only?
- [ ] Is `credentials: 'include'` used only when necessary?
- [ ] Are API responses validated before use?
- [ ] Is the Pubky SDK used for pubky:// requests (not raw fetch)?

---

## TYPESCRIPT/JAVASCRIPT AUDIT

### 1. Type Safety

```bash
# Find 'any' type usage
grep -rn ": any\|as any" --include="*.ts" --include="*.tsx" . | grep -v node_modules/

# Find type assertions
grep -rn "as \w\+\|<\w\+>" --include="*.ts" --include="*.tsx" . | grep -v node_modules/

# Find @ts-ignore comments
grep -rn "@ts-ignore\|@ts-nocheck" --include="*.ts" --include="*.tsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is `any` type avoided (use `unknown` with type guards)?
- [ ] Are type assertions (`as`) justified and safe?
- [ ] Are `@ts-ignore` comments documented with reasons?
- [ ] Is strict mode enabled in `tsconfig.json`?

### 2. Async/Await Patterns

```bash
# Find floating promises (missing await)
grep -rn "\.then\s*(\|\.catch\s*(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find async functions
grep -rn "async\s\+function\|async\s*(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are all promises awaited (no floating promises)?
- [ ] Is there proper error handling for async operations?
- [ ] Are loading states managed for async UI updates?
- [ ] Is there race condition prevention for concurrent requests?

### 3. Error Handling

```bash
# Find empty catch blocks
grep -rn "catch\s*(\s*[^)]*)\s*{\s*}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/

# Find error logging
grep -rn "console\.error\|throw\|reject" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are catch blocks not empty (at least log errors)?
- [ ] Are errors typed properly (not `catch (e: any)`)?
- [ ] Are user-facing error messages friendly (no stack traces)?
- [ ] Are errors reported to monitoring (Sentry, etc.) if applicable?

---

## REACT APPLICATION AUDIT

### 1. React Security Patterns

```bash
# Find error boundaries
grep -rn "componentDidCatch\|ErrorBoundary" --include="*.tsx" . | grep -v node_modules/

# Find context usage
grep -rn "useContext\|createContext" --include="*.tsx" . | grep -v node_modules/ | grep -v test

# Find effect cleanup patterns
grep -rn "useEffect" --include="*.tsx" . | grep -v node_modules/ | head -20

# Find uncontrolled inputs (security risk)
grep -rn "defaultValue\|ref.*input" --include="*.tsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are error boundaries wrapping critical components?
- [ ] Do all `useEffect` with subscriptions have cleanup functions?
- [ ] Is context used appropriately (not overused)?
- [ ] Are form inputs controlled (not using `defaultValue` for sensitive data)?
- [ ] Is React.lazy used for code splitting where appropriate?
- [ ] Are keys stable and unique in lists?

### 2. React Performance

```bash
# Find memo usage
grep -rn "React.memo\|useMemo\|useCallback" --include="*.tsx" . | grep -v node_modules/

# Find expensive re-renders
grep -rn "console.log.*render\|useEffect.*\[\]" --include="*.tsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are expensive components memoized?
- [ ] Are callbacks memoized to prevent unnecessary re-renders?
- [ ] Are dependencies arrays correct in hooks?
- [ ] Is there no state in loops or conditions?

---

## CANVAS/DRAWING SECURITY AUDIT

```bash
# Find canvas creation and usage
grep -rn "getContext\|canvas\|Canvas" --include="*.ts" --include="*.tsx" . | grep -v node_modules/

# Find base64 data handling
grep -rn "toDataURL\|base64\|data:image" --include="*.ts" . | grep -v node_modules/

# Find canvas size validation
grep -rn "width\s*=\|height\s*=" --include="*.ts" . | grep -i canvas | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Is canvas size limited to prevent memory exhaustion?
- [ ] Is base64 data size validated before storage?
- [ ] Is canvas data sanitized before any HTML insertion?
- [ ] Are canvas operations in try-catch blocks?
- [ ] Is there cleanup for canvas resources?
- [ ] Are canvas overlays properly positioned and sized?

---

## TAILWIND CSS AUDIT

```bash
# Check Tailwind config
cat tailwind.config.js 2>/dev/null

# Find inline style usage (should prefer Tailwind)
grep -rn "style={{" --include="*.tsx" . | grep -v node_modules/ | wc -l

# Check for theme consistency
grep -rn "bg-\[#\|text-\[#" --include="*.tsx" . | grep -v node_modules/ | head -10
```

**Verification Checklist:**
- [ ] Is Tailwind purging unused styles in production?
- [ ] Are custom colors defined in config (not inline)?
- [ ] Is dark mode properly configured and consistent?
- [ ] Are accessibility utilities used (sr-only, focus:, etc.)?
- [ ] Is there a consistent spacing/sizing scale?

---

## THIRD-PARTY LIBRARY AUDIT

```bash
# Find all imports from node_modules
grep -rn "from ['\"][^./]" --include="*.ts" --include="*.tsx" . | grep -v node_modules/ | cut -d'"' -f2 | cut -d"'" -f2 | sort | uniq

# Find @ts-ignore for library issues
grep -rn "@ts-ignore" --include="*.ts" --include="*.tsx" . | grep -v node_modules/

# Check for CDN/external script loads
grep -rn "cdn\|unpkg\|jsdelivr" --include="*.html" --include="*.ts" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Do all imported libraries have TypeScript definitions?
- [ ] Are `@ts-ignore` comments justified and documented?
- [ ] Are library versions pinned (not `latest`)?
- [ ] Are libraries tree-shakeable for smaller bundles?
- [ ] Are CDN/external script loads avoided (CSP issues)?

---

## KEYBOARD ACCESSIBILITY AUDIT

```bash
# Find keyboard shortcut definitions
cat manifest.json | jq '.commands'

# Find keydown/keyup handlers
grep -rn "keydown\|keyup\|onKeyDown\|onKeyUp" --include="*.ts" --include="*.tsx" . | grep -v node_modules/

# Find focus management
grep -rn "focus()\|tabIndex\|aria-" --include="*.tsx" . | grep -v node_modules/

# Find skip links and landmarks
grep -rn "skip\|main-content\|role=" --include="*.tsx" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are keyboard shortcuts documented in UI?
- [ ] Do modals trap focus appropriately?
- [ ] Is there a skip link for keyboard users?
- [ ] Are all interactive elements focusable?
- [ ] Is focus visible on all interactive elements?
- [ ] Are ARIA labels used for icon-only buttons?

---

## UI/UX SECURITY PATTERNS

### 1. Form Security

```bash
# Find form elements
grep -rn "<form\|<input\|<textarea" --include="*.tsx" --include="*.jsx" --include="*.html" . | grep -v node_modules/

# Find password/secret fields
grep -rn "type=\"password\"\|type='password'\|passphrase\|secret" --include="*.tsx" --include="*.jsx" --include="*.html" . | grep -v node_modules/
```

**Verification Checklist:**
- [ ] Are password fields using `type="password"`?
- [ ] Are forms protected against CSRF (if applicable)?
- [ ] Are autocomplete attributes set appropriately?
- [ ] Are passphrases cleared from memory after use?

### 2. Authentication UX

**Verification Checklist:**
- [ ] Is there clear feedback during authentication?
- [ ] Are users warned before signing out?
- [ ] Is session expiration handled gracefully?
- [ ] Are failed login attempts rate-limited client-side?
- [ ] Is there a secure "remember me" option (if offered)?

---

## COMMON CHROME EXTENSION ANTI-PATTERNS

Flag these issues if found:

1. **Async before sidePanel.open()**: User gesture lost after await
2. **setInterval in service worker**: Use chrome.alarms instead
3. **Global mutable state in background**: Service worker may restart
4. **Missing return true in onMessage**: Async responses fail
5. **innerHTML in content script without sanitization**: XSS risk
6. **Unprefixed CSS in content scripts**: Style conflicts
7. **Missing MutationObserver disconnect**: Memory leaks
8. **Hardcoded extension ID**: Breaks in different installations
9. **Using localStorage in extension pages**: Use chrome.storage
10. **No quota checking before large writes**: Silent failures

---

## OUTPUT FORMAT

```markdown
# Web Audit Report: [Project Name]

## Build Status
- [ ] Dependencies install: YES/NO
- [ ] Linting passes: YES/NO
- [ ] Type checking passes: YES/NO
- [ ] Tests pass: YES/NO
- [ ] Production build succeeds: YES/NO

## Build & Bundling
- [ ] Vite/Webpack config valid: YES/NO
- [ ] Content script bundled separately: YES/NO
- [ ] Source maps excluded from prod: YES/NO
- [ ] Code splitting configured: YES/NO

## Pubky SDK Usage
- [ ] SDK initialized correctly: YES/NO
- [ ] Key management is secure: YES/NO
- [ ] Session handling is correct: YES/NO
- [ ] Storage paths are valid: YES/NO
- [ ] Auth flow implemented correctly: YES/NO/N/A
- [ ] Errors handled properly: YES/NO

## Chrome Extension Security (if applicable)
- [ ] Manifest v3: YES/NO/N/A
- [ ] Permissions minimal: YES/NO/N/A
- [ ] Content scripts secure: YES/NO/N/A
- [ ] Background worker secure: YES/NO/N/A
- [ ] Storage encrypted: YES/NO/N/A
- [ ] Offscreen document used correctly: YES/NO/N/A
- [ ] Message types centralized: YES/NO
- [ ] Service worker lifecycle handled: YES/NO

## Extension Architecture
- [ ] Multi-entry points structured: YES/NO
- [ ] Context providers appropriate: YES/NO
- [ ] State sync mechanism exists: YES/NO

## React Patterns
- [ ] Error boundaries present: YES/NO
- [ ] Effect cleanup implemented: YES/NO
- [ ] Context used appropriately: YES/NO

## Content Script Isolation
- [ ] Class names namespaced: YES/NO
- [ ] Z-index managed: YES/NO
- [ ] DOM cleanup on unload: YES/NO

## Web Security
- [ ] XSS prevention: YES/NO
- [ ] CSP configured: YES/NO
- [ ] No secrets in localStorage: YES/NO
- [ ] HTTPS enforced: YES/NO

## Accessibility
- [ ] Keyboard shortcuts documented: YES/NO
- [ ] Focus management correct: YES/NO
- [ ] ARIA labels present: YES/NO

## Critical Issues (blocks release)
1. [Issue]: [Location] - [Description]

## High Priority (fix before release)
1. [Issue]: [Location] - [Description]

## Medium Priority (fix soon)
1. [Issue]: [Location] - [Description]

## Low Priority (technical debt)
1. [Issue]: [Location] - [Description]

## Pubky SDK Issues
1. [Issue]: [Location] - [Description] - [Correct Usage]

## What's Actually Good
- [Positive finding with specific evidence]

## Recommended Fix Order
1. [First fix]
2. [Second fix]
```

---

## EXPERT PERSPECTIVES

Review as ALL of these experts simultaneously:

- **Web Security Engineer**: XSS, CSP, CORS, injection attacks, storage security
- **Chrome Extension Architect**: Manifest v3 patterns, offscreen documents, service worker lifecycle, message passing, side panel/popup architecture
- **Pubky SDK Expert**: Correct SDK usage, auth flows, storage patterns, key management
- **Frontend Developer**: React/Vue/Svelte patterns, state management, component security
- **TypeScript Expert**: Type safety, strict mode, proper error typing
- **UX Designer**: Authentication flows, error messaging, security UX patterns
- **DevOps Engineer**: Build pipeline, dependency security, production configuration
- **Performance Engineer**: Bundle size, lazy loading, storage quota, canvas optimization, memory leaks
- **Accessibility Specialist**: Keyboard navigation, screen reader support, focus management, color contrast
- **React Architect**: Context patterns, error boundaries, effect cleanup, component lifecycle

---

## PUBKY ECOSYSTEM CONSIDERATIONS

### Pubky SDK Patterns

**Correct Initialization:**
```typescript
// Mainnet
const pubky = new Pubky();
// or
const client = new Client();

// Testnet (development only)
const pubky = Pubky.testnet();

// With logging (call ONCE at app start)
setLogLevel("debug");
const pubky = new Pubky();
```

**Correct Path Formats:**
```typescript
// Public storage (read-only, addressed paths)
await pubky.publicStorage.getJson(`pubky${userPk}/pub/my-app/data.json`);

// Session storage (authenticated, absolute paths)
await session.storage.putJson('/pub/my-app/data.json', data);

// Directory listing (trailing slash required)
await pubky.publicStorage.list(`pubky${userPk}/pub/my-app/`);
```

**Correct Auth Flow:**
```typescript
// Validate user input first
const caps = validateCapabilities(userInput);

// Start flow with validated caps
const flow = pubky.startAuthFlow(caps);

// Handle approval
try {
  const session = await flow.awaitApproval();
} catch (e) {
  if (e.name === 'AuthenticationError') {
    // Handle auth failure
  }
}
```

**Correct Key Handling:**
```typescript
// Generate new keypair
const keypair = Keypair.random();

// Create recovery file (PROMPT for passphrase, don't hardcode)
const passphrase = await promptUser("Enter a strong passphrase");
const recoveryFile = keypair.createRecoveryFile(passphrase);

// Store recovery file securely (NOT in localStorage)
await downloadFile(recoveryFile, 'my-pubky.recovery');

// Restore from recovery file
const restored = Keypair.fromRecoveryFile(recoveryFile, passphrase);
```

### Common Mistakes to Flag

1. **Wrong path format**: Using `/pub/...` with `publicStorage` (should be `pubky<pk>/pub/...`)
2. **Missing trailing slash**: Calling `.list()` without trailing `/`
3. **Storing keys in localStorage**: Private keys should NEVER be in browser storage unencrypted
4. **Hardcoded passphrases**: Passphrases should be prompted from users
5. **Missing error handling**: Not catching SDK errors properly
6. **Multiple Pubky instances**: Creating new Pubky() multiple times
7. **Using testnet in production**: `Pubky.testnet()` should only be in dev
8. **Unvalidated capabilities**: Not calling `validateCapabilities()` on user input
9. **Writing outside /pub/**: Attempting to write to `/priv/` (will fail with 403)

---

## FINAL CHECKLIST

Before concluding the audit:

1. [ ] Ran all build/test/lint commands and recorded output
2. [ ] Verified Pubky SDK is used correctly for all operations
3. [ ] Checked all key management follows best practices
4. [ ] Verified no secrets in browser storage unencrypted
5. [ ] Checked Chrome extension permissions are minimal (if applicable)
6. [ ] Verified XSS prevention measures are in place
7. [ ] Checked CSP is configured properly
8. [ ] Reviewed all error handling for SDK calls
9. [ ] Verified auth flows use correct patterns
10. [ ] Checked for proper session management
11. [ ] Verified build configuration is correct
12. [ ] Checked offscreen document pattern (if applicable)
13. [ ] Verified message passing uses typed constants
14. [ ] Checked service worker lifecycle handling
15. [ ] Reviewed React patterns (error boundaries, effect cleanup)
16. [ ] Checked content script isolation and cleanup
17. [ ] Verified keyboard accessibility
18. [ ] Checked storage quota handling

---

Now audit the codebase.
