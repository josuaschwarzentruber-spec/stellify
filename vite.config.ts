import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: false,
    watch: null,
  },
  build: {
    // Better caching via deterministic chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy third-party deps split out so the main bundle is smaller
          // and they can be cached separately across deploys.
          'react-vendor': ['react', 'react-dom'],
          'firebase-auth': ['firebase/app', 'firebase/auth'],
          'firebase-data': ['firebase/firestore', 'firebase/storage'],
          'motion': ['framer-motion'],
          'icons': ['lucide-react'],
        },
      },
    },
    // Small assets inlined as base64, larger ones as separate files
    assetsInlineLimit: 4096,
    // Drop the warning noise about chunk size (we've now chunked deliberately)
    chunkSizeWarningLimit: 800,
  },
});
