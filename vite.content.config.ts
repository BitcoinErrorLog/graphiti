import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate config for content script - must be IIFE format for Chrome extension
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    emptyOutDir: false, // Don't clear the dist folder (main build already created it)
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'GraphitiContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        // Ensure all code is inlined (no external imports)
        inlineDynamicImports: true,
        // Make sure globals don't conflict
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
