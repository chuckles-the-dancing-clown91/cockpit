import { Box, Button, Card, Flex, Link, Text, Badge } from '@radix-ui/themes';
import type { ResearchItem } from '../types';

type Props = {
  item: ResearchItem | null;
};

export function ItemDetail({ item }: Props) {
  if (!item) {
    return (
      <Card>
        <Text size="2" color="gray">
          Select an item to view details
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ height: '100%', overflow: 'auto' }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Text weight="bold">{item.title}</Text>
          <Badge color="gray" variant="soft">
            {item.status}
          </Badge>
        </Flex>
        {item.url && (
          <Link href={item.url} target="_blank" rel="noreferrer">
            Open source
          </Link>
        )}
        {item.excerpt && <Text color="gray">{item.excerpt}</Text>}
        <Flex gap="2" align="center">
          {item.author && (
            <Text size="2" color="gray">
              {item.author}
            </Text>
          )}
          {item.publishedAt && (
            <Text size="2" color="gray">
              {new Date(item.publishedAt).toLocaleString()}
            </Text>
          )}
        </Flex>
        {item.payload && (
          <Box>
            <Text size="2" weight="bold">
              Raw payload
            </Text>
            <pre style={{ maxHeight: 240, overflow: 'auto', fontSize: 12 }}>
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </Box>
        )}
        <Flex gap="2">
          <Button size="1" variant="surface">
            Convert to reference
          </Button>
          <Button size="1" variant="surface">
            Attach to idea
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
