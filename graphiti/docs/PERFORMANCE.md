# Performance Tuning Guide

This guide covers performance optimization techniques for the Graphiti Chrome Extension.

## Bundle Size Optimization

### Current Bundle Analysis

Analyze bundle sizes using:
```bash
npm run build:analyze
```

This opens a visual bundle analyzer showing:
- Total bundle size
- Individual chunk sizes
- Dependency tree
- Code splitting effectiveness

### Optimization Strategies

1. **Code Splitting**
   - Vendor chunks are already separated (React, Pubky SDK)
   - Consider lazy loading for less-used features
   - Dynamic imports for heavy dependencies

2. **Tree Shaking**
   - Ensure unused exports are removed
   - Use ES modules for better tree shaking
   - Avoid importing entire libraries when only a function is needed

3. **Minification**
   - Currently using esbuild minification
   - Source maps enabled for debugging
   - Consider terser for better compression (slower build)

4. **Dependency Management**
   - Regularly audit dependencies: `npm audit`
   - Remove unused dependencies
   - Consider lighter alternatives for heavy libraries

### Target Bundle Sizes

- Background script: < 200KB
- Content script: < 150KB
- Popup: < 300KB
- Sidepanel: < 300KB

## Storage Usage Optimization

### Monitoring Storage

Storage usage is automatically monitored via `performance-monitor.ts`:

```typescript
import { performanceMonitor } from './utils/performance-monitor';

// Get storage snapshot
const snapshot = await performanceMonitor.getStorageUsageSnapshot();
console.log('Storage breakdown:', snapshot.breakdown);
```

### Optimization Strategies

1. **Image Compression**
   - Drawings are automatically compressed using WebP format
   - Quality adjusts based on storage usage (50-75%)
   - Maximum dimension: 4K (4096px)

2. **Data Cleanup**
   - Old annotations can be cleaned up manually
   - Use StorageManager UI to view and delete drawings
   - Consider implementing TTL for old data

3. **Storage Quota Management**
   - Warnings at 75% and 90% usage
   - Automatic quality reduction for drawings
   - Manual cleanup via StorageManager

### Storage Limits

- Chrome Extension storage: ~5MB (shared with other extensions)
- Recommended usage: < 4MB (80%)
- Critical threshold: 4.5MB (90%)

## API Performance

### Monitoring API Calls

All API calls are automatically monitored:

```typescript
import { measureAPICall } from './utils/performance-monitor';

// API calls are automatically measured
const result = await pubkyAPISDK.createBookmark(url);
// Performance data logged automatically
```

### Performance Metrics

- **Slow API calls**: > 5 seconds logged as warnings
- **Failed calls**: Tracked for debugging
- **Average duration**: Calculated from recent calls

### Optimization Strategies

1. **Rate Limiting**
   - Token bucket algorithm prevents API abuse
   - Nexus API: 30 requests/second
   - Pubky homeserver: 10 requests/second

2. **Retry Logic**
   - Automatic retry for network errors
   - Exponential backoff (1s, 2s, 4s)
   - Maximum 3 retries

3. **Caching**
   - Profile data cached with 1-hour TTL
   - Local storage for faster access
   - Remote data fetched only when needed

## Operation Timing

### Measuring Operations

Wrap slow operations with `measureOperation`:

```typescript
import { measureOperation } from './utils/performance-monitor';

const result = await measureOperation('saveDrawing', async () => {
  // Your operation here
  return await saveDrawing();
});
```

### Performance Targets

- **Annotation creation**: < 500ms
- **Drawing save**: < 1000ms
- **Feed loading**: < 2000ms
- **Sync operations**: < 5000ms

### Slow Operation Warnings

Operations taking > 5 seconds trigger warnings:
- Logged to debug panel
- Performance metrics recorded
- User notification for critical delays

## Memory Management

### Best Practices

1. **Event Listeners**
   - Bound handlers stored for cleanup
   - Removed on page unload
   - WeakMap for element references

2. **Canvas Management**
   - Canvas removed when drawing mode disabled
   - Context cleaned up properly
   - No memory leaks from canvas operations

3. **Observer Cleanup**
   - MutationObserver disconnected on cleanup
   - URL change observers removed
   - All listeners properly cleaned up

## Performance Monitoring

### Viewing Metrics

1. **Debug Panel**
   - Open popup → Click "🔧 Debug"
   - View performance logs
   - Filter by metric type

2. **Console Logs**
   - Performance warnings logged to console
   - Look for "[PerformanceMonitor]" prefix
   - Check for slow operation warnings

3. **Performance Summary**
   ```typescript
   import { performanceMonitor } from './utils/performance-monitor';
   
   const summary = performanceMonitor.getSummary();
   console.log('API calls:', summary.apiCalls);
   console.log('Recent metrics:', summary.recentMetrics);
   ```

## Troubleshooting Performance Issues

### Slow Extension Startup

1. Check bundle sizes: `npm run build:analyze`
2. Review dependencies for heavy libraries
3. Consider lazy loading for popup/sidepanel

### High Storage Usage

1. Open StorageManager in popup
2. Review drawings by size
3. Delete large, unused drawings
4. Check for duplicate data

### Slow API Calls

1. Check network connectivity
2. Review rate limiting settings
3. Check for API errors in debug logs
4. Verify homeserver accessibility

### Memory Leaks

1. Check for unremoved event listeners
2. Verify cleanup on page navigation
3. Use Chrome DevTools Memory profiler
4. Check for growing WeakMap/Map sizes

## Performance Checklist

Before each release:

- [ ] Bundle sizes within targets
- [ ] No performance warnings in logs
- [ ] Storage usage < 80%
- [ ] API calls < 5 seconds average
- [ ] No memory leaks detected
- [ ] All cleanup handlers working
- [ ] Performance monitoring enabled

## Tools

- **Bundle Analyzer**: `npm run build:analyze`
- **Performance Monitor**: Built-in utility
- **Chrome DevTools**: Memory profiler, Performance tab
- **Storage Manager**: Built-in UI for storage management

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [TESTING.md](TESTING.md) - Testing documentation
