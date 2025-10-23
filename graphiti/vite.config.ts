import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy static files (manifest.json and icons)
const copyStaticFiles = () => ({
  name: 'copy-static-files',
  closeBundle() {
    const distDir = resolve(__dirname, 'dist');
    const iconsDir = resolve(distDir, 'icons');
    
    // Create icons directory if it doesn't exist
    if (!existsSync(iconsDir)) {
      mkdirSync(iconsDir, { recursive: true });
    }
    
    // Copy manifest.json
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(distDir, 'manifest.json')
    );
    
    // Copy icons
    const iconFiles = ['icon.svg', 'icon16.png', 'icon16.svg', 'icon48.png', 'icon48.svg', 'icon128.png', 'icon128.svg'];
    iconFiles.forEach(file => {
      const srcPath = resolve(__dirname, 'icons', file);
      const destPath = resolve(iconsDir, file);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
      }
    });
    
    console.log('✓ Static files copied (manifest.json, icons)');
  }
});

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        'profile-renderer': resolve(__dirname, 'src/profile/profile-renderer.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        format: 'es', // Default format for most files
      },
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

