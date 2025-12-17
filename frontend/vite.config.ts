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
    alias: [
      // Domain path aliases
      {
        find: '@/core',
        replacement: path.resolve(__dirname, './src/core'),
      },
      {
        find: '@/writing',
        replacement: path.resolve(__dirname, './src/writing'),
      },
      {
        find: '@/research',
        replacement: path.resolve(__dirname, './src/research'),
      },
      {
        find: '@/system',
        replacement: path.resolve(__dirname, './src/system'),
      },
      {
        find: '@/setup',
        replacement: path.resolve(__dirname, './src/setup'),
      },
      // Vendor overrides
      {
        find: '@uiw/react-md-editor/markdown-editor.css',
        replacement: path.resolve(__dirname, './src/core/vendor/markdown-editor.css'),
      },
      {
        find: '@uiw/react-markdown-preview/markdown.css',
        replacement: path.resolve(__dirname, './src/core/vendor/markdown-preview.css'),
      },
      {
        find: '@uiw/react-md-editor',
        replacement: path.resolve(__dirname, './src/core/vendor/MDEditor.tsx'),
      },
      {
        find: '@uiw/react-markdown-preview',
        replacement: path.resolve(__dirname, './src/core/vendor/MarkdownPreview.tsx'),
      },
    ],
  },
});
