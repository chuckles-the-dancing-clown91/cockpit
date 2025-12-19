import { useMemo, useState } from 'react';
import { Box, Card, Flex, Text, Button, Tabs, TextField, Badge } from '@radix-ui/themes';
import { Archive, Search, FileText, Lightbulb } from 'lucide-react';
import { useWritingList } from '@/features/writing/hooks/useWriting';
import { useIdeas } from '@/features/ideas/hooks/useIdeas';
import type { Idea } from '@/shared/types';

type ArchiveFilter = 'all' | 'articles' | 'ideas';

export function ArchiveView() {
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [search, setSearch] = useState('');

  const { data: writings, isLoading: writingsLoading } = useWritingList({ status: 'archived' });
  const { data: ideas, isLoading: ideasLoading } = useIdeas();

  const archivedIdeas: Idea[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (ideas || [])
      .filter((idea) => idea.dateRemoved || idea.status === 'complete')
      .filter((idea) => {
        if (!query) return true;
        return (
          idea.title.toLowerCase().includes(query) ||
          (idea.summary || '').toLowerCase().includes(query)
        );
      });
  }, [ideas, search]);

  const archivedWritings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (writings || []).filter((w) => {
      const matchesQuery =
        !query ||
        w.title.toLowerCase().includes(query) ||
        (w.tags || '').toLowerCase().includes(query);
      return matchesQuery;
    });
  }, [writings, search]);

  const loading = writingsLoading || ideasLoading;
  const showIdeas = filter === 'all' || filter === 'ideas';
  const showArticles = filter === 'all' || filter === 'articles';

  return (
    <Flex direction="column" style={{ height: '100%', padding: 'var(--space-6)' }} gap="4">
      {/* Header */}
      <Flex justify="between" align="center">
        <Flex align="center" gap="3">
          <Archive size={28} />
          <div>
            <Text size="5" weight="bold">Archive</Text>
            <Text size="2" color="gray">Find archived articles and ideas</Text>
          </div>
        </Flex>
      </Flex>

      {/* Controls */}
      <Flex gap="3" wrap="wrap" align="center">
        <Tabs.Root value={filter} onValueChange={(v) => setFilter(v as ArchiveFilter)}>
          <Tabs.List>
            <Tabs.Trigger value="all">All</Tabs.Trigger>
            <Tabs.Trigger value="articles">Articles</Tabs.Trigger>
            <Tabs.Trigger value="ideas">Ideas</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        <TextField.Root
          placeholder="Search title, tags, or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 260, flex: 1 }}
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      <Flex gap="4" wrap="wrap" style={{ flex: 1, minHeight: 0 }}>
        {/* Articles */}
        {showArticles && (
          <Box style={{ flex: 1, minWidth: 320, minHeight: 0 }}>
            <SectionHeader icon={<FileText size={16} />} title="Articles" count={archivedWritings.length} />
            <ScrollSection loading={loading}>
              {archivedWritings.length === 0 ? (
                <EmptyState message="No archived articles" />
              ) : (
                archivedWritings.map((w) => (
                  <Card key={w.id} style={{ marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)' }}>
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="start">
                        <Text size="3" weight="bold">{w.title || 'Untitled'}</Text>
                        <Badge size="1" color="gray">Archived</Badge>
                      </Flex>
                      <Text size="2" color="gray">
                        {w.excerpt || w.contentText?.slice(0, 120) || 'No excerpt available'}
                      </Text>
                      <Flex gap="3" align="center">
                        <Text size="1" color="gray">
                          Updated {new Date(w.updatedAt).toLocaleDateString()}
                        </Text>
                        <Text size="1" color="gray">
                          {w.wordCount.toLocaleString()} words
                        </Text>
                      </Flex>
                      {w.tags && (
                        <Flex gap="2" wrap="wrap">
                          {w.tags.split(',').map((tag) => {
                            const trimmed = tag.trim();
                            if (!trimmed) return null;
                            return (
                              <Badge key={trimmed} size="1" variant="soft" color="blue">
                                #{trimmed}
                              </Badge>
                            );
                          })}
                        </Flex>
                      )}
                    </Flex>
                  </Card>
                ))
              )}
            </ScrollSection>
          </Box>
        )}

        {/* Ideas */}
        {showIdeas && (
          <Box style={{ flex: 1, minWidth: 320, minHeight: 0 }}>
            <SectionHeader icon={<Lightbulb size={16} />} title="Ideas" count={archivedIdeas.length} />
            <ScrollSection loading={loading}>
              {archivedIdeas.length === 0 ? (
                <EmptyState message="No archived ideas" />
              ) : (
                archivedIdeas.map((idea) => (
                  <Card key={idea.id} style={{ marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)' }}>
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="start">
                        <Text size="3" weight="bold">{idea.title}</Text>
                        <Badge size="1" color="gray">Archived</Badge>
                      </Flex>
                      {idea.summary && (
                        <Text size="2" color="gray">
                          {idea.summary}
                        </Text>
                      )}
                      <Flex gap="3" align="center">
                        <Text size="1" color="gray">
                          Updated {new Date(idea.dateUpdated).toLocaleDateString()}
                        </Text>
                        {idea.dateRemoved && (
                          <Text size="1" color="gray">
                            Archived {new Date(idea.dateRemoved).toLocaleDateString()}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                ))
              )}
            </ScrollSection>
          </Box>
        )}
      </Flex>
    </Flex>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <Flex align="center" justify="between" style={{ marginBottom: 'var(--space-2)' }}>
      <Flex align="center" gap="2">
        {icon}
        <Text size="2" weight="bold">{title}</Text>
      </Flex>
      <Badge size="1" color="gray">{count}</Badge>
    </Flex>
  );
}

function ScrollSection({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <Box
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-3)',
        padding: 'var(--space-3)',
        background: 'var(--color-surface)',
        height: '100%',
        minHeight: 240,
        overflow: 'auto',
      }}
    >
      {loading ? <Text>Loading...</Text> : children}
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Flex direction="column" align="center" justify="center" gap="2" style={{ height: '100%', color: 'var(--color-text-soft)' }}>
      <Text>{message}</Text>
    </Flex>
  );
}
