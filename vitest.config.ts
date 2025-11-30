import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for browser API simulation
    environment: 'jsdom',
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Setup files to run before tests
    setupFiles: ['./src/test/setup.ts'],
    
    // Global test utilities
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      // Coverage thresholds
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
    
    // Mock Chrome extension APIs
    alias: {
      'chrome': './src/test/mocks/chrome.ts',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

