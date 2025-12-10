# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue. Instead, please report it privately:

1. **Email**: [security@example.com] (replace with actual security contact)
2. **Subject**: "Graphiti Security Vulnerability"
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide an update within 7 days.

## Security Best Practices

### For Developers

When contributing to this project:

1. **Never commit secrets**:
   - API keys
   - Private keys
   - Auth tokens
   - Passwords

2. **Validate all user input**:
   - Use the centralized validation utilities
   - Sanitize user-provided content
   - Check length limits

3. **Handle errors securely**:
   - Don't expose sensitive information in error messages
   - Use the centralized error handler
   - Log errors without sensitive data

4. **Follow secure coding practices**:
   - Use type guards instead of type assertions
   - Check for null/undefined before operations
   - Use HTTPS for all network requests

### For Users

1. **Keep the extension updated**
2. **Review permissions** before installing
3. **Report suspicious behavior** immediately
4. **Don't share your Pubky private keys**

## Security Features

### Authentication

- **QR-based authentication**: Secure authentication via Pubky Ring mobile app
- **No password storage**: Passwords are never stored
- **Encrypted tokens**: Auth tokens encrypted with client secrets
- **Session management**: Secure session storage in Chrome storage

### Data Privacy

- **Local-first storage**: Data stored locally before sync
- **URL hashing**: Privacy-preserving URL tags using SHA-256
- **No tracking**: No analytics or tracking code
- **User control**: Users control what data is synced

### Input Validation

- **Centralized validation**: All inputs validated through `validation.ts`
- **XSS prevention**: Content sanitized before display
- **Length limits**: Prevents DoS attacks via large inputs
- **Type checking**: TypeScript strict mode enabled

### Network Security

- **HTTPS only**: All network requests use HTTPS
- **Rate limiting**: Client-side rate limiting to prevent abuse
- **Error handling**: Secure error handling without information leakage

## Known Security Considerations

### Chrome Extension Limitations

- **Content Script Isolation**: Content scripts run in page context but are isolated
- **Service Worker**: Background script runs in service worker context
- **Storage Quota**: Chrome storage has 5MB limit (shared with other extensions)

### Pubky Protocol

- **Decentralized**: No central authority controls data
- **Public by default**: Data synced to homeserver is public
- **User responsibility**: Users responsible for their private keys

## Security Checklist

Before each release:

- [ ] No secrets in code or configuration
- [ ] All user inputs validated
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS used for all network requests
- [ ] Dependencies up to date
- [ ] Security audit completed
- [ ] Privacy policy updated (if needed)

## Disclosure Policy

We follow responsible disclosure:

1. **Report privately** (see Reporting section)
2. **Acknowledge** within 48 hours
3. **Investigate** and develop fix
4. **Release fix** in timely manner
5. **Credit** reporter (if desired)

## Security Updates

Security updates are released as:
- **Patch versions** (1.0.x) for critical vulnerabilities
- **Minor versions** (1.x.0) for important security improvements
- **Major versions** (x.0.0) for breaking security changes

## Resources

- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Pubky Security Documentation](https://github.com/pubky/pubky)

