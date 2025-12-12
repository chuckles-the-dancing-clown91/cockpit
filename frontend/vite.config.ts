import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@uiw/react-md-editor/markdown-editor.css',
        replacement: path.resolve(__dirname, './src/vendor/markdown-editor.css'),
      },
      {
        find: '@uiw/react-markdown-preview/markdown.css',
        replacement: path.resolve(__dirname, './src/vendor/markdown-preview.css'),
      },
      {
        find: '@uiw/react-md-editor',
        replacement: path.resolve(__dirname, './src/vendor/MDEditor.tsx'),
      },
      {
        find: '@uiw/react-markdown-preview',
        replacement: path.resolve(__dirname, './src/vendor/MarkdownPreview.tsx'),
      },
    ],
  },
});
