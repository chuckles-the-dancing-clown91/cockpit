import { Button, Dialog, Flex, Text, Card } from '@radix-ui/themes';
import type { ResearchStream } from '../types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streams: ResearchStream[];
  onCreate: () => void;
  onEdit: (stream: ResearchStream) => void;
};

export function StreamsManagerDialog({ open, onOpenChange, streams, onCreate, onEdit }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Streams</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Create multiple NewsData streams with different query sets.
        </Dialog.Description>

        <Flex direction="column" gap="2">
          <Button onClick={onCreate}>Create New Stream</Button>

          {streams.length === 0 ? (
            <Card>
              <Text size="2" color="gray">
                No streams yet.
              </Text>
            </Card>
          ) : (
            <Flex direction="column" gap="2" style={{ maxHeight: 320, overflow: 'auto' }}>
              {streams.map((s) => (
                <Card key={s.id}>
                  <Flex justify="between" align="center" gap="2">
                    <Flex direction="column" gap="1">
                      <Text weight="bold">{s.name}</Text>
                      <Text size="2" color="gray">
                        {s.provider}
                        {s.lastSyncAt ? ` • last sync ${new Date(s.lastSyncAt).toLocaleString()}` : ''}
                      </Text>
                      {s.lastError && (
                        <Text size="1" color="red">
                          {s.lastError}
                        </Text>
                      )}
                    </Flex>
                    <Button size="1" variant="surface" onClick={() => onEdit(s)}>
                      Edit
                    </Button>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

