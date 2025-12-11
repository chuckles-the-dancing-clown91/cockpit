import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@uiw/react-md-editor': path.resolve(__dirname, './src/vendor/MDEditor.tsx'),
      '@uiw/react-markdown-preview': path.resolve(__dirname, './src/vendor/MarkdownPreview.tsx'),
      '@uiw/react-md-editor/markdown-editor.css': path.resolve(__dirname, './src/vendor/markdown-editor.css'),
      '@uiw/react-markdown-preview/markdown.css': path.resolve(__dirname, './src/vendor/markdown-preview.css'),
    },
  },
});
