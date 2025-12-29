import { useEffect, useState } from 'react';
import { Badge, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { ExternalLink, RefreshCcw } from 'lucide-react';

import type { ReaderReference, ReaderSnapshot } from '@/shared/types';

type MetadataTabProps = {
  reference?: ReaderReference | null;
  snapshots: ReaderSnapshot[];
  activeSnapshotId?: number | null;
  onSelectSnapshot: (snapshotId: number) => void;
  onRefresh: () => void;
  onOpenLivePage: () => void;
  onUpdateReference: (input: { title?: string; tags?: string[] }) => Promise<void>;
};

export function MetadataTab({
  reference,
  snapshots,
  activeSnapshotId,
  onSelectSnapshot,
  onRefresh,
  onOpenLivePage,
  onUpdateReference,
}: MetadataTabProps) {
  const [title, setTitle] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!reference) return;
    setTitle(reference.title || '');
    setTagsText(reference.tags?.join(', ') || '');
  }, [reference]);

  const handleBlur = async () => {
    if (!reference) return;
    setIsSaving(true);
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    await onUpdateReference({ title: title.trim() || reference.title, tags });
    setIsSaving(false);
  };

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Title
        </Text>
        <TextField.Root
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={handleBlur}
          placeholder="Reference title"
        />
      </Flex>

      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Tags
        </Text>
        <TextField.Root
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          onBlur={handleBlur}
          placeholder="Add tags separated by commas"
        />
      </Flex>

      {reference?.url && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            URL
          </Text>
          <Flex align="center" gap="2">
            <Text size="2" color="blue" style={{ wordBreak: 'break-all' }}>
              {reference.url}
            </Text>
            <Button variant="soft" size="1" onClick={onOpenLivePage}>
              <ExternalLink size={14} />
              Open Live Page
            </Button>
          </Flex>
        </Flex>
      )}

      <Flex direction="column" gap="2">
        <Flex align="center" justify="between">
          <Text size="2" weight="medium">
            Snapshot History
          </Text>
          <Button variant="soft" size="1" onClick={onRefresh} disabled={isSaving}>
            <RefreshCcw size={14} />
            Refresh
          </Button>
        </Flex>
        {snapshots.length === 0 ? (
          <Text size="2" color="gray">
            No snapshots yet.
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {snapshots.map((snapshot) => (
              <Button
                key={snapshot.id}
                variant={snapshot.id === activeSnapshotId ? 'solid' : 'soft'}
                onClick={() => onSelectSnapshot(snapshot.id)}
                style={{ justifyContent: 'space-between' }}
              >
                <span>{new Date(snapshot.fetchedAt).toLocaleString()}</span>
                <Flex gap="2" align="center">
                  {snapshot.wordCount != null && (
                    <Badge color="gray">{snapshot.wordCount} words</Badge>
                  )}
                </Flex>
              </Button>
            ))}
          </Flex>
        )}
      </Flex>

      {isSaving && (
        <Text size="1" color="gray">
          Saving…
        </Text>
      )}
    </Flex>
  );
}
