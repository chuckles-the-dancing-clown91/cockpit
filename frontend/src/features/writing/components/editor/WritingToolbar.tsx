/**
 * WritingToolbar - Rich text editing toolbar with TipTap controls
 */

import * as Toolbar from '@radix-ui/react-toolbar';
import { Button, Text, Dialog, Flex, TextField } from '@radix-ui/themes';
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Code, Image as ImageIcon, Heading1, Heading2, Heading3,
  Link as LinkIcon, Save, Undo, Redo,
} from 'lucide-react';
import { useState } from 'react';
import type { Editor } from '@tiptap/react';

interface WritingToolbarProps {
  editor: Editor | null;
  canSave: boolean;
  isSaving: boolean;
  wordCount: number;
  onSave: () => void;
}

export function WritingToolbar({
  editor,
  canSave,
  isSaving,
  wordCount,
  onSave,
}: WritingToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) {
    return null;
  }

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        editor.chain().focus().setImage({ src: url }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleOpenLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setLinkDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  return (
    <>
    <div
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '12px',
        background: 'var(--color-surface)',
      }}
    >
      <Toolbar.Root
        aria-label="Writing toolbar"
        className="rt-Flex rt-r-ai-center rt-r-gap-2 rt-r-fw-wrap"
      >
        {/* History */}
        <Toolbar.Button asChild>
          <Button
            variant="soft"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant="soft"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo width={16} height={16} />
          </Button>
        </Toolbar.Button>

        <Toolbar.Separator style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Text formatting */}
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('bold') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('italic') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('strike') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough width={16} height={16} />
          </Button>
        </Toolbar.Button>

        <Toolbar.Separator style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Headings */}
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('heading', { level: 1 }) ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('heading', { level: 2 }) ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('heading', { level: 3 }) ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 width={16} height={16} />
          </Button>
        </Toolbar.Button>

        <Toolbar.Separator style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Lists */}
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('bulletList') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('orderedList') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <ListOrdered width={16} height={16} />
          </Button>
        </Toolbar.Button>

        <Toolbar.Separator style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Code, Link & Image */}
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('codeBlock') ? 'solid' : 'soft'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <Code width={16} height={16} />
          </Button>
        </Toolbar.Button>OpenLinkDialog
        <Toolbar.Button asChild>
          <Button
            variant={editor.isActive('link') ? 'solid' : 'soft'}
            onClick={handleOpenLinkDialog}
            title="Insert/edit link"
          >
            <LinkIcon width={16} height={16} />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant="soft"
            onClick={handleImageUpload}
            title="Insert image"
          >
            <ImageIcon width={16} height={16} />
          </Button>
        </Toolbar.Button>

        <div style={{ flex: 1 }} />

        {/* Word count */}
        <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
          {wordCount.toLocaleString()} words
        </Text>

        {/* Save */}
        <Button
          disabled={!canSave || isSaving}
          onClick={onSave}
          title="Save (Ctrl+S)"
        >
          <Save width={16} height={16} />
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </Toolbar.Root>

      {/* Link Dialog */}
      <Dialog.Root open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Insert Link</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Enter the URL for the link
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                URL
              </Text>
              <TextField.Root
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveLink();
                  }
                }}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            {editor.isActive('link') && (
              <Button variant="soft" color="red" onClick={handleRemoveLink}>
                Remove Link
              </Button>
            )}
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSaveLink}>
              Save Link
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
    </>
  );
}
