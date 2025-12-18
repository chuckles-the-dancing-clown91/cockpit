import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'tanstack-query': ['@tanstack/react-query'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
          ],
          'ui-vendor': ['clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@features': path.resolve(__dirname, './src/features'),
      '@domains': path.resolve(__dirname, './src/domains'),
    },
  },
});
