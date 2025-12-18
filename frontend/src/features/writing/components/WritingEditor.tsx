/**
 * WritingEditor - Full-featured TipTap editor for long-form content
 * 
 * Features:
 * - All basic formatting (bold, italic, strikethrough)
 * - Headings (H1, H2, H3, H4)
 * - Lists (bullet, numbered)
 * - Code blocks
 * - Links
 * - Images
 * - Undo/Redo
 * - Word count via onStats callback
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import './WritingEditor.css';

interface WritingEditorProps {
  value: any; // TipTap JSON
  onChange: (json: any) => void;
  onEditorReady?: (editor: Editor) => void;
  onStats?: (stats: { wordCount: number; characterCount: number }) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export function WritingEditor({ 
  value, 
  onChange, 
  onEditorReady,
  onStats,
  placeholder = 'Start writing...',
  minHeight = '600px',
  readOnly = false,
}: WritingEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline',
        },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content: value || { type: 'doc', content: [] },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(json);
      
      // Report stats
      if (onStats && editor.storage.characterCount) {
        const words = editor.storage.characterCount.words();
        const characters = editor.storage.characterCount.characters();
        onStats({ wordCount: words, characterCount: characters });
      }
    },
    editorProps: {
      attributes: {
        class: 'writing-editor-content prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Update content when value changes externally
  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [value]);

  if (!editor) {
    return <div className="writing-editor-loading">Loading editor...</div>;
  }

  return (
    <div className="writing-editor-wrapper" style={{ minHeight }}>
      <EditorContent editor={editor} />
    </div>
  );
}

export type { Editor };
