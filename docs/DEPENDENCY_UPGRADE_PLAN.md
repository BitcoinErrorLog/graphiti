# Dependency Upgrade Plan

This document outlines the planned dependency upgrades for post-launch maintenance.

## Current Status

### Production Dependencies
- `@synonymdev/pubky`: `^0.5.4` (pinned)
- `dompurify`: `^3.3.1`
- `react`: `^18.3.1`
- `react-dom`: `^18.3.1`

### Dev Dependencies
- `vite`: `^5.3.3`
- `vitest`: `^1.3.1`
- `typescript`: `^5.5.3`
- `@playwright/test`: `^1.40.0`

## Upgrade Priorities

### High Priority (Post-Launch)

1. **@synonymdev/pubky** (when stable)
   - Current: `^0.5.4`
   - Target: Latest stable (check changelog for breaking changes)
   - Risk: Medium - Core SDK, test thoroughly
   - Timeline: After 1-2 months of stable production use

2. **React** (when 19.x stable)
   - Current: `^18.3.1`
   - Target: `^19.0.0` (when released)
   - Risk: Medium - May require code changes
   - Timeline: Wait for ecosystem adoption

### Medium Priority (Quarterly)

3. **Vite** (when 6.x stable)
   - Current: `^5.3.3`
   - Target: `^6.0.0` (when released)
   - Risk: Medium - Build tool, test build process
   - Timeline: After Vite 6 stable release

4. **TypeScript** (quarterly)
   - Current: `^5.5.3`
   - Target: Latest 5.x (avoid 6.x until stable)
   - Risk: Low - Usually backward compatible
   - Timeline: Every 3 months

5. **Playwright** (quarterly)
   - Current: `^1.40.0`
   - Target: Latest 1.x
   - Risk: Low - Test framework, update tests if needed
   - Timeline: Every 3 months

### Low Priority (As Needed)

6. **DOMPurify** (security updates)
   - Current: `^3.3.1`
   - Target: Latest 3.x
   - Risk: Low - Security library, patch updates only
   - Timeline: When security patches released

7. **Vitest** (quarterly)
   - Current: `^1.3.1`
   - Target: Latest 1.x
   - Risk: Low - Test framework
   - Timeline: Every 3 months

## Upgrade Process

1. **Create feature branch**: `chore/upgrade-{package}-{version}`
2. **Update package.json**: Change version range
3. **Run `npm install`**: Install new version
4. **Run `npm run typecheck`**: Check for type errors
5. **Run `npm run lint`**: Check for linting issues
6. **Run `npm test`**: Run unit tests
7. **Run `npm run test:e2e`**: Run E2E tests
8. **Manual testing**: Test critical user flows
9. **Update CHANGELOG.md**: Document upgrade
10. **Create PR**: Get review before merging

## Breaking Changes Tracking

### @synonymdev/pubky
- Monitor: https://github.com/synonymdev/pubky/releases
- Watch for: API changes, Client constructor changes, auth flow changes

### React 19
- Monitor: https://react.dev/blog
- Watch for: Hook changes, component API changes, concurrent features

### Vite 6
- Monitor: https://vitejs.dev/blog
- Watch for: Config changes, plugin API changes, build output changes

## Security Updates

For security-related updates:
1. Create hotfix branch immediately
2. Test critical paths only
3. Deploy to production ASAP
4. Full testing in follow-up PR

## Notes

- Always test in development environment first
- Keep backup of working package-lock.json
- Document any breaking changes in code comments
- Update type definitions if needed
- Check peer dependency requirements

