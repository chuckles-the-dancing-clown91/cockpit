/**
 * WritingWorkspace - Full writing interface
 * 
 * Layout: [Left 25%: Ideas/Refs] [Center 50%: Editor] [Right 25%: Meta]
 */

import { useEffect, useRef, useState } from 'react';
import { Text, Flex } from '@radix-ui/themes';
import type { Editor } from '@tiptap/react';
import { WritingEditor } from './WritingEditor';
import { WritingToolbar } from './WritingToolbar';
import { WritingMetaPanel } from './WritingMetaPanel';
import { useWriting, useSaveDraft } from '../hooks/useWriting';

interface WritingWorkspaceProps {
  writingId: number;
}

export function WritingWorkspace({ writingId }: WritingWorkspaceProps) {
  const { data: writing, isLoading, error } = useWriting(writingId);
  const saveDraft = useSaveDraft(writingId);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [localContent, setLocalContent] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [dirty, setDirty] = useState(false);

  // Autosave timer
  const saveTimer = useRef<number | null>(null);

  // Load content when writing loads
  useEffect(() => {
    if (writing) {
      setLocalContent(writing.contentJson);
      setWordCount(writing.wordCount);
      setDirty(false);
    }
  }, [writing?.id, writing?.updatedAt]);

  // Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && localContent) {
          saveDraft.mutate(localContent);
          setDirty(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty, localContent]);

  // Debounced autosave
  useEffect(() => {
    if (!dirty || !localContent) return;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(() => {
      saveDraft.mutate(localContent);
      setDirty(false);
    }, 1500); // 1.5 second debounce

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [dirty, localContent]);

  const handleContentChange = (json: any) => {
    setLocalContent(json);
    setDirty(true);
  };

  const handleSave = () => {
    if (localContent) {
      saveDraft.mutate(localContent);
      setDirty(false);
    }
  };

  const handleStats = (stats: { wordCount: number }) => {
    setWordCount(stats.wordCount);
  };

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Text>Loading writing...</Text>
      </Flex>
    );
  }

  if (error || !writing) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Text>Writing not found</Text>
      </Flex>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr', // 25% | 50% | 25%
        gap: 12,
        padding: 12,
        background: 'var(--color-surface-soft)',
      }}
    >
      {/* LEFT: Ideas & References */}
      <div
        style={{
          minHeight: 0,
          overflow: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Flex direction="column" gap="3" style={{ padding: 12 }}>
          <Text size="3" weight="bold">Attached Ideas</Text>
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Coming soon: Linked ideas and references will appear here.
          </Text>
        </Flex>
      </div>

      {/* CENTER: Editor */}
      <div
        style={{
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <WritingToolbar
          editor={editor}
          canSave={dirty}
          isSaving={saveDraft.isPending}
          wordCount={wordCount}
          onSave={handleSave}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 40px' }}>
          <WritingEditor
            value={localContent || writing.contentJson}
            onChange={handleContentChange}
            onEditorReady={setEditor}
            onStats={handleStats}
            placeholder="Start writing your masterpiece..."
            minHeight="600px"
          />
        </div>
      </div>

      {/* RIGHT: Metadata */}
      <div
        style={{
          minHeight: 0,
          overflow: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <WritingMetaPanel writing={writing} />
      </div>
    </div>
  );
}
