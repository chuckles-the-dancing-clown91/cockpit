import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { Quote, Link as LinkIcon } from 'lucide-react';

import type { NoteEntityType } from '@/shared/types';
import { NotesEditor } from '@/features/notes/components/NotesEditor';
import { useNote, useSaveNote } from '@/features/notes/hooks/useNotes';
import { useDebouncedSave } from '../hooks/useDebouncedSave';

type NotesTabProps = {
  entityType?: NoteEntityType;
  entityId?: number;
  selectionText?: string;
  citation?: string;
};

export function NotesTab({ entityType, entityId, selectionText, citation }: NotesTabProps) {
  const noteEnabled = Boolean(entityType && entityId);
  const { data: note, isLoading, error } = useNote(
    (entityType || 'reference') as NoteEntityType,
    entityId || 0,
    'main'
  );
  const save = useSaveNote(
    (entityType || 'reference') as NoteEntityType,
    entityId || 0,
    'main'
  );

  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!note || dirty) return;
    setDraft(note.bodyHtml || '');
  }, [note?.id, dirty, note?.bodyHtml]);

  const { status, setStatus } = useDebouncedSave({
    value: draft,
    enabled: noteEnabled && dirty,
    onSave: async (value) => {
      await save.mutateAsync(value);
      setDirty(false);
    },
  });

  useEffect(() => {
    if (!dirty) setStatus('idle');
  }, [dirty, setStatus]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return 'Idle';
    }
  }, [status]);

  const insertQuote = () => {
    if (!selectionText?.trim()) return;
    const quote = selectionText.trim().split('\n').map((line) => `> ${line}`).join('\n');
    const next = draft ? `${draft}\n\n${quote}\n` : `${quote}\n`;
    setDraft(next);
    setDirty(true);
  };

  const insertCitation = () => {
    if (!citation) return;
    const next = draft ? `${draft}\n\n${citation}\n` : `${citation}\n`;
    setDraft(next);
    setDirty(true);
  };

  if (!noteEnabled) {
    return (
      <Flex direction="column" gap="2">
        <Text size="2" color="gray">
          Notes are available once a reference is loaded.
        </Text>
      </Flex>
    );
  }

  if (isLoading) {
    return (
      <Flex direction="column" gap="2">
        <Text size="2" color="gray">
          Loading notes…
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" gap="2">
        <Text size="2" color="red">
          Failed to load notes.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3" style={{ minHeight: 0 }}>
      <Flex align="center" justify="between">
        <Flex gap="2" align="center">
          <Badge color="gray">{statusLabel}</Badge>
        </Flex>
        <Flex gap="2">
          <Button variant="soft" size="1" onClick={insertQuote} disabled={!selectionText?.trim()}>
            <Quote size={14} />
            Insert Quote
          </Button>
          <Button variant="soft" size="1" onClick={insertCitation} disabled={!citation}>
            <LinkIcon size={14} />
            Insert Citation
          </Button>
        </Flex>
      </Flex>

      <NotesEditor
        value={draft}
        onChange={(value) => {
          setDraft(value);
          setDirty(true);
        }}
        placeholder="Write notes for this reference..."
        minHeight="360px"
      />
    </Flex>
  );
}
