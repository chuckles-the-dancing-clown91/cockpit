/**
 * WritingWorkspace - Full writing interface
 * 
 * Layout: [Left 25%: Ideas/Refs] [Center 50%: Editor] [Right 25%: Meta]
 */

import { useEffect, useRef, useState } from 'react';
import { Text, Flex, Button } from '@radix-ui/themes';
import { X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { WritingEditor } from '../editor/WritingEditor';
import { WritingToolbar } from '../editor/WritingToolbar';
import { WritingMetaPanel } from '../meta/WritingMetaPanel';
import { LinkedIdeasPanel } from '../ideas/LinkedIdeasPanel';
import { useWriting, useSaveDraft } from '../../hooks/useWriting';

interface WritingWorkspaceProps {
  writingId: number;
  onClose?: () => void;
}

export function WritingWorkspace({ writingId, onClose }: WritingWorkspaceProps) {
  const { data: writing, isLoading, error } = useWriting(writingId);
  const saveDraft = useSaveDraft(writingId);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [localContent, setLocalContent] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [dirty, setDirty] = useState(false);

  // Autosave timer
  const saveTimer = useRef<number | null>(null);

  // Load content when writing loads (only on ID change, not on every update)
  useEffect(() => {
    if (writing && !localContent) {
      setLocalContent(writing.contentJson);
      setWordCount(writing.wordCount);
      setDirty(false);
    }
  }, [writing?.id]);

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
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-soft)',
      }}
    >
      {/* Close button bar */}
      {onClose && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <Button
            variant="ghost"
            size="2"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <X size={16} />
            Close Writing
          </Button>
        </div>
      )}

      {/* Main workspace */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr', // 25% | 50% | 25%
          gap: 12,
          padding: 12,
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
        <LinkedIdeasPanel writingId={writingId} />
      </div>

      {/* CENTER: Editor */}
      <div
        style={{
          minHeight: 0,
          height: '100%',
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

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 40px' }}>
          <WritingEditor
            value={localContent || writing.contentJson}
            onChange={handleContentChange}
            onEditorReady={setEditor}
            onStats={handleStats}
            placeholder="Start writing your masterpiece..."
            minHeight="100%"
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
        <WritingMetaPanel writing={writing} liveWordCount={wordCount} />
      </div>
      </div>
    </div>
  );
}
