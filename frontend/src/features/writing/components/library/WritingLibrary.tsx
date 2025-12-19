/**
 * WritingLibrary - List/grid view of all writings
 */

import { useState } from 'react';
import { Card, Flex, Text, Button, Select } from '@radix-ui/themes';
import { Plus, FileText } from 'lucide-react';
import { useWritingList, useCreateWriting } from '../../hooks/useWriting';
import type { WritingType, WritingStatus } from '../../types';

interface WritingLibraryProps {
  onOpenWriting: (id: number) => void;
}

export function WritingLibrary({ onOpenWriting }: WritingLibraryProps) {
  const [statusFilter, setStatusFilter] = useState<WritingStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<WritingType | undefined>(undefined);

  const { data: writings, isLoading } = useWritingList({
    status: statusFilter,
    writingType: typeFilter,
  });

  const createWriting = useCreateWriting();

  const handleCreate = async () => {
    const newWriting = await createWriting.mutateAsync({
      title: 'Untitled Writing',
      writingType: 'article',
      linkIdeaIds: [],
      initialContentJson: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Untitled Writing' }],
          },
          {
            type: 'paragraph',
          },
        ],
      },
    });

    onOpenWriting(newWriting.id);
  };

  return (
    <Flex direction="column" gap="3" style={{ padding: 16, height: '100%' }}>
      {/* Header */}
      <Flex justify="between" align="center">
        <Text size="6" weight="bold">Writings</Text>
        <Button onClick={handleCreate} disabled={createWriting.isPending}>
          <Plus width={16} height={16} />
          {createWriting.isPending ? 'Creating...' : 'New Writing'}
        </Button>
      </Flex>

      {/* Filters */}
      <Flex gap="2">
        <Select.Root
          value={statusFilter || 'all'}
          onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : (v as WritingStatus))}
        >
          <Select.Trigger style={{ minWidth: 150 }} />
          <Select.Content>
            <Select.Item value="all">All statuses</Select.Item>
            <Select.Item value="draft">Draft</Select.Item>
            <Select.Item value="in_progress">In progress</Select.Item>
            <Select.Item value="review">Review</Select.Item>
            <Select.Item value="published">Published</Select.Item>
            <Select.Item value="archived">Archived</Select.Item>
          </Select.Content>
        </Select.Root>

        <Select.Root
          value={typeFilter || 'all'}
          onValueChange={(v) => setTypeFilter(v === 'all' ? undefined : (v as WritingType))}
        >
          <Select.Trigger style={{ minWidth: 150 }} />
          <Select.Content>
            <Select.Item value="all">All types</Select.Item>
            <Select.Item value="article">Article</Select.Item>
            <Select.Item value="chapter">Chapter</Select.Item>
            <Select.Item value="book">Book</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Text>Loading...</Text>
        ) : !writings || writings.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="3"
            style={{ height: '100%' }}
          >
            <FileText width={48} height={48} style={{ color: 'var(--color-text-muted)' }} />
            <Text size="3" style={{ color: 'var(--color-text-soft)' }}>
              No writings yet
            </Text>
            <Button onClick={handleCreate}>
              <Plus width={16} height={16} />
              Create your first writing
            </Button>
          </Flex>
        ) : (
          <Flex direction="column" gap="2">
            {writings.map((writing) => (
              <Card
                key={writing.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onOpenWriting(writing.id)}
              >
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="start">
                    <Text size="4" weight="bold">{writing.title}</Text>
                    <Flex gap="2">
                      <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
                        {writing.writingType}
                      </Text>
                      <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
                        {writing.status}
                      </Text>
                    </Flex>
                  </Flex>

                  {writing.excerpt && (
                    <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                      {writing.excerpt}
                    </Text>
                  )}

                  <Flex gap="3">
                    <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
                      {writing.wordCount.toLocaleString()} words
                    </Text>
                    <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
                      Updated {new Date(writing.updatedAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </div>
    </Flex>
  );
}
