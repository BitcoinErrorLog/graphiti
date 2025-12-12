# Deployment Guide

This guide covers the process of building, packaging, and deploying the Graphiti Chrome Extension.

## Prerequisites

- Node.js 18+ and npm
- Chrome/Chromium browser for testing
- Chrome Web Store Developer account (for public release)

## Build Process

### Development Build

```bash
npm run dev
```

This builds the extension in watch mode with:
- Source maps enabled
- No minification
- Development environment variables

### Production Build

```bash
npm run build
```

This creates an optimized production build with:
- Minification enabled (esbuild)
- Source maps for debugging
- Production environment variables
- Optimized vendor chunks

### Build Output

The build process creates a `dist/` directory containing:
- `manifest.json` - Extension manifest
- `background.js` - Service worker
- `content.js` - Content script
- `popup.html` - Popup UI
- `sidepanel.html` - Side panel UI
- `assets/` - JavaScript bundles and CSS
- `icons/` - Extension icons
- `src/offscreen/offscreen.js` - Offscreen document

## Packaging

### Create ZIP Archive

```bash
cd dist
zip -r ../graphiti-extension.zip .
cd ..
```

Or use the automated release workflow (see CI/CD section).

### Verify Package

Before submitting to Chrome Web Store:

1. **Load unpacked extension** in Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

2. **Test all features**:
   - Authentication flow
   - Drawing mode
   - Annotations
   - Bookmarks
   - Side panel feed
   - Profile editing

3. **Check console for errors**:
   - Background script console
   - Popup console
   - Side panel console
   - Page console (for content scripts)

## Chrome Web Store Submission

### Preparation

1. **Update version** in `manifest.json`:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Update CHANGELOG.md** with release notes

3. **Create screenshots**:
   - 1280x800 or 640x400 pixels
   - Show key features
   - At least 1, up to 5 screenshots

4. **Prepare promotional images**:
   - Small promotional tile: 440x280
   - Large promotional tile: 920x680
   - Marquee promotional tile: 1400x560

### Submission Steps

1. **Go to Chrome Web Store Developer Dashboard**
   - https://chrome.google.com/webstore/devconsole

2. **Create new item** or update existing

3. **Upload ZIP file**:
   - Use the packaged `graphiti-extension.zip`

4. **Fill in store listing**:
   - Name: "Graphiti - Pubky URL Tagger"
   - Short description (132 chars max)
   - Detailed description
   - Category: Productivity or Social
   - Language: English

5. **Upload images**:
   - Screenshots
   - Promotional images (optional)

6. **Set visibility**:
   - Unlisted (for testing)
   - Public (for release)

7. **Submit for review**

### Review Process

Chrome Web Store review typically takes:
- **First submission**: 1-3 weeks
- **Updates**: 1-3 days

Common rejection reasons:
- Missing privacy policy
- Insufficient description
- Violation of Chrome Web Store policies
- Security issues

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version Bump Process

1. Update `manifest.json` version
2. Update `package.json` version
3. Update `CHANGELOG.md`
4. Create git tag: `git tag v1.0.0`
5. Push tag: `git push origin v1.0.0`
6. GitHub Actions will create release automatically

## Release Checklist

- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Version updated in manifest.json and package.json
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] Screenshots prepared
- [ ] Extension tested in unpacked mode
- [ ] No console errors
- [ ] All features working
- [ ] Privacy policy URL set (if required)
- [ ] ZIP package created
- [ ] Submitted to Chrome Web Store

## Post-Deployment

### Monitor

- Check Chrome Web Store dashboard for review status
- Monitor user reviews and ratings
- Check error reports (if available)
- Monitor analytics (if configured)

### Updates

For updates:
1. Follow version bump process
2. Update CHANGELOG.md
3. Create new ZIP package
4. Upload to Chrome Web Store
5. Submit for review

## Troubleshooting

### Build Failures

- **TypeScript errors**: Fix type errors before building
- **Missing dependencies**: Run `npm install`
- **Vite errors**: Check `vite.config.ts` configuration

### Submission Failures

- **Manifest errors**: Validate manifest.json
- **Policy violations**: Review Chrome Web Store policies
- **Missing information**: Complete all required fields

### Post-Release Issues

- **User reports**: Monitor reviews and support channels
- **Performance issues**: Check bundle sizes and optimize
- **Security issues**: Address immediately and release patch

## Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

