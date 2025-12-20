import { Card, Flex, Text, Badge, Button, TextField, Select } from '@radix-ui/themes';
import { useState } from 'react';
import type { ResearchItem } from '../types';

type Filters = {
  status?: string;
  search?: string;
};

type Props = {
  items: ResearchItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStatus: (id: number, status: string) => void;
  onFilterChange: (filters: Filters) => void;
};

export function ItemsList({ items, selectedId, onSelect, onStatus, onFilterChange }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  return (
    <Flex direction="column" gap="3" style={{ height: '100%' }}>
      <Flex gap="2" align="center">
        <TextField.Root
          placeholder="Search title/excerpt"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onFilterChange({ search: e.target.value, status });
          }}
        />
        <Select.Root
          value={status ?? 'all'}
          onValueChange={(val) => {
            const next = val === 'all' ? undefined : val;
            setStatus(next);
            onFilterChange({ search, status: next });
          }}
        >
          <Select.Trigger placeholder="Status" />
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="new">New</Select.Item>
            <Select.Item value="saved">Saved</Select.Item>
            <Select.Item value="dismissed">Dismissed</Select.Item>
            <Select.Item value="converted">Converted</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      <Flex direction="column" gap="2" style={{ overflowY: 'auto', flex: 1 }}>
        {items.map((item) => (
          <Card
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              cursor: 'pointer',
              border: item.id === selectedId ? '1px solid var(--accent-8)' : undefined,
            }}
          >
            <Flex direction="column" gap="1">
              <Flex justify="between" align="center">
                <Text weight="bold">{item.title}</Text>
                <Badge color="gray" variant="soft">
                  {item.status}
                </Badge>
              </Flex>
              {item.excerpt && (
                <Text size="2" color="gray">
                  {item.excerpt}
                </Text>
              )}
              <Flex gap="2" align="center">
                {item.author && (
                  <Text size="1" color="gray">
                    {item.author}
                  </Text>
                )}
                {item.publishedAt && (
                  <Text size="1" color="gray">
                    {new Date(item.publishedAt).toLocaleString()}
                  </Text>
                )}
              </Flex>
              <Flex gap="1">
                <Button
                  size="1"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus(item.id, 'saved');
                  }}
                >
                  Save
                </Button>
                <Button
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus(item.id, 'dismissed');
                  }}
                >
                  Dismiss
                </Button>
              </Flex>
            </Flex>
          </Card>
        ))}
        {items.length === 0 && (
          <Text size="2" color="gray">
            No items yet.
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
