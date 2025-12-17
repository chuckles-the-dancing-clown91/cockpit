import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered,
  Undo,
  Redo,
} from 'lucide-react';
import './NotesEditor.css';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function NotesEditor({ 
  value, 
  onChange, 
  placeholder = 'Add notes...', 
  minHeight = '120px' 
}: NotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for notes
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'notes-editor-content prose prose-sm max-w-none focus:outline-none p-3',
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText() ? editor.getHTML() : '');
    },
  });

  // Sync external value changes to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="notes-editor border border-[var(--color-border)] rounded-md bg-[var(--color-surface-soft)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors ${
            editor.isActive('bold') ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]' : 'text-[var(--color-text-soft)]'
          }`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors ${
            editor.isActive('italic') ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]' : 'text-[var(--color-text-soft)]'
          }`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors ${
            editor.isActive('strike') ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]' : 'text-[var(--color-text-soft)]'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-[var(--color-border-subtle)] mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors ${
            editor.isActive('bulletList') ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]' : 'text-[var(--color-text-soft)]'
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors ${
            editor.isActive('orderedList') ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]' : 'text-[var(--color-text-soft)]'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-[var(--color-border-subtle)] mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-soft)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-soft)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
