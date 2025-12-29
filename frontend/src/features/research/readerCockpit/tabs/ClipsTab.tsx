import { Badge, Button, Card, Flex, Text } from '@radix-ui/themes';
import { ClipboardCopy, Trash2 } from 'lucide-react';

import type { ReaderClip } from '@/shared/types';
import { buildCitation } from '../utils/citation';

type ClipsTabProps = {
  referenceId?: number;
  clips: ReaderClip[];
  selectionText?: string;
  onCreateClip: () => void;
  onInsertClip: (clip: ReaderClip) => void;
  onDeleteClip: (clipId: number) => void;
};

export function ClipsTab({
  referenceId,
  clips,
  selectionText,
  onCreateClip,
  onInsertClip,
  onDeleteClip,
}: ClipsTabProps) {
  const canCreate = Boolean(referenceId && selectionText?.trim());

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between">
        <Text size="3" weight="medium">
          Clips
        </Text>
        <Button variant="soft" size="1" onClick={onCreateClip} disabled={!canCreate}>
          Create Clip
        </Button>
      </Flex>

      {clips.length === 0 ? (
        <Text size="2" color="gray">
          No clips yet. Select text in the reader and capture it.
        </Text>
      ) : (
        <Flex direction="column" gap="2">
          {clips.map((clip) => (
            <Card key={clip.id}>
              <Flex direction="column" gap="2">
                <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                  {clip.quote}
                </Text>
                <Flex align="center" gap="2">
                  <Badge color="gray">
                    {new Date(clip.createdAt).toLocaleString()}
                  </Badge>
                  {referenceId && (
                    <Button
                      variant="soft"
                      size="1"
                      onClick={() => {
                        const citation = buildCitation(referenceId, clip.anchor);
                        navigator.clipboard.writeText(citation).catch(() => {});
                      }}
                    >
                      <ClipboardCopy size={14} />
                      Copy citation
                    </Button>
                  )}
                  <Button variant="soft" size="1" onClick={() => onInsertClip(clip)}>
                    Insert into notes
                  </Button>
                  <Button
                    variant="ghost"
                    size="1"
                    color="red"
                    onClick={() => onDeleteClip(clip.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
