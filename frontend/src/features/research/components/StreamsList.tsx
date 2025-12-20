import { Card, Flex, Text, Button, Switch } from '@radix-ui/themes';
import type { ResearchStream } from '../types';

type Props = {
  streams: ResearchStream[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onToggleEnabled: (stream: ResearchStream, enabled: boolean) => void;
  onSync: (id: number) => void;
  onCreateRequested: () => void;
};

export function StreamsList({
  streams,
  selectedId,
  onSelect,
  onToggleEnabled,
  onSync,
  onCreateRequested,
}: Props) {
  return (
    <Flex direction="column" gap="3" style={{ height: '100%' }}>
      <Flex justify="between" align="center">
        <Text weight="bold">Streams</Text>
        <Text size="2" color="gray">
          {streams.length} total
        </Text>
      </Flex>

      <Flex direction="column" gap="2" style={{ overflowY: 'auto', flex: 1 }}>
        {streams.map((stream) => (
          <Card
            key={stream.id}
            onClick={() => onSelect(stream.id)}
            style={{
              cursor: 'pointer',
              border: stream.id === selectedId ? '1px solid var(--accent-8)' : undefined,
            }}
          >
            <Flex justify="between" align="center" gap="2">
              <Flex direction="column" gap="1">
                <Text weight="bold">{stream.name}</Text>
                <Text size="2" color="gray">
                  {stream.provider}
                  {stream.lastSyncAt ? ` • Last sync ${new Date(stream.lastSyncAt).toLocaleString()}` : ''}
                </Text>
                {stream.lastError && (
                  <Text size="1" color="red">
                    {stream.lastError}
                  </Text>
                )}
              </Flex>
              <Flex gap="2" align="center">
                <Button size="1" variant="surface" onClick={(e) => { e.stopPropagation(); onSync(stream.id); }}>
                  Sync
                </Button>
                <Switch
                  checked={stream.enabled}
                  onCheckedChange={(val) => onToggleEnabled(stream, Boolean(val))}
                  aria-label="Enable stream"
                />
              </Flex>
            </Flex>
          </Card>
        ))}
        {streams.length === 0 && (
          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                No streams yet.
              </Text>
              <Button onClick={onCreateRequested}>Create New Stream</Button>
            </Flex>
          </Card>
        )}
      </Flex>

      <Button onClick={onCreateRequested}>Create Stream</Button>
    </Flex>
  );
}
