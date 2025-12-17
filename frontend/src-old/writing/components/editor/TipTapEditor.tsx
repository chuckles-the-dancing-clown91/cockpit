import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Link2,
  Image as ImageIcon,
  FileCode,
  X
} from 'lucide-react';
import './TipTapEditor.css';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ value, onChange, placeholder = 'Start writing...' }: TipTapEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block-highlighted',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[calc(100vh-300px)] p-4',
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

  const handleAddLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setLinkDialogOpen(false);
    }
  };

  const handleAddImage = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setImageDialogOpen(false);
    }
  };

  return (
    <div className="tiptap-editor-container">
      {/* Toolbar */}
      <div className="tiptap-toolbar">
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-group">
          <button onClick={() => setLinkDialogOpen(true)} title="Add Link">
            <Link2 className="h-4 w-4" />
          </button>
          <button onClick={() => setImageDialogOpen(true)} title="Add Image">
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            title="Code Block"
          >
            <FileCode className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-group ml-auto">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="tiptap-content" />

      {/* Link Dialog */}
      <Dialog.Root open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(500px,100%-2rem)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Insert Link
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setLinkDialogOpen(false)}
                  className="px-4 py-2 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLink}
                  className="px-4 py-2 text-sm rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Insert
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Image Dialog */}
      <Dialog.Root open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(500px,100%-2rem)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Insert Image
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setImageDialogOpen(false)}
                  className="px-4 py-2 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddImage}
                  className="px-4 py-2 text-sm rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Insert
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
