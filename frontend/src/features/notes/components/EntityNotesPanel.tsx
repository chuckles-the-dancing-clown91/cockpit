import { Card, Flex, Text, Button } from '@radix-ui/themes';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NoteEntityType, NoteType } from '@/shared/types';
import { useNote, useSaveNote } from '../hooks/useNotes';
import { toast } from '@/core/lib/toast';
import { NotesEditor } from './NotesEditor';

interface EntityNotesPanelProps {
  entityType: NoteEntityType;
  entityId: number;
  noteType?: NoteType;
  title?: string;
  placeholder?: string;
  minHeight?: string;
}

/**
 * EntityNotesPanel - Notes editor for any entity (idea/reference/writing)
 * 
 * Features:
 * - Auto-loads or creates note on mount
 * - HTML content (TipTap-ready, but using TextArea for now)
 * - Auto-save indicator
 * - Dirty state tracking
 * 
 * TODO: Replace TextArea with TipTap editor component when ready
 */
export function EntityNotesPanel({
  entityType,
  entityId,
  noteType = 'main',
  title,
  placeholder = 'Keep your working notes here…',
  minHeight = '260px',
}: EntityNotesPanelProps) {
  const { data: note, isLoading, error } = useNote(entityType, entityId, noteType);
  const save = useSaveNote(entityType, entityId, noteType);
  
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  
  // Sync note content to draft when loaded
  useEffect(() => {
    if (note) {
      setDraft(note.bodyHtml);
      setDirty(false);
    }
  }, [note?.id]);
  
  const handleSave = async () => {
    try {
      await save.mutateAsync(draft);
      setDirty(false);
      toast.success('Notes saved');
    } catch (err) {
      toast.error(`Failed to save notes: ${err}`);
    }
  };
  
  const header = title || 'Notes';
  
  if (isLoading) {
    return (
      <Flex direction="column" gap="3">
        <Text size="2" style={{ color: 'var(--color-text-muted)' }}>
          Loading notes…
        </Text>
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Flex direction="column" gap="3">
        <Text size="2" style={{ color: 'var(--color-text-error)' }}>
          Failed to load notes: {String(error)}
        </Text>
      </Flex>
    );
  }
  
  if (!note) {
    return (
      <Flex direction="column" gap="3">
        <Text size="2" style={{ color: 'var(--color-text-muted)' }}>
          Notes unavailable.
        </Text>
      </Flex>
    );
  }
  
  return (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center">
        <Text size="4" weight="medium" style={{ color: 'var(--color-text-primary)' }}>
          {header}
        </Text>
        <Flex gap="2" align="center">
          {dirty && (
            <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
              Unsaved changes
            </Text>
          )}
          <Button
            disabled={!dirty || save.isPending}
            onClick={handleSave}
            size="2"
          >
            <Save className="w-4 h-4" />
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Flex>
      </Flex>
      
      <NotesEditor
        value={draft}
        onChange={(newContent) => {
          setDraft(newContent);
          setDirty(true);
        }}
        placeholder={placeholder}
        minHeight={minHeight}
      />
      
      <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
        Last updated: {new Date(note.updatedAt).toLocaleString()}
      </Text>
    </Flex>
  );
}
