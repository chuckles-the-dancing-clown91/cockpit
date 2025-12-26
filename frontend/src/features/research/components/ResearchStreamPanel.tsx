import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Select,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Archive, CheckCheck, RefreshCw, Star, StarOff, Trash2 } from 'lucide-react';

import { useDialog } from '@/core/providers/DialogProvider';
import { researchOpenDetachedCockpit } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { useFeedSources } from '@/features/research/hooks/useFeedSources';
import { useNewsArticleActions, useNewsArticles, type NewsArticleFilters } from '@/features/research/hooks/useNewsArticles';

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function feedSourceIdFromAddedVia(addedVia?: string | null): number | null {
  if (!addedVia) return null;
  const m = /^feed_source:(\d+)$/.exec(addedVia);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isNaN(id) ? null : id;
}

export function ResearchStreamPanel() {
  const sources = useFeedSources();
  const dialog = useDialog();

  const [search, setSearch] = useState('');
  const [sourceId, setSourceId] = useState<string>('all');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [includeDismissed, setIncludeDismissed] = useState(false);

  const filters: NewsArticleFilters = useMemo(
    () => ({
      sourceId: sourceId === 'all' ? null : Number(sourceId),
      search: search.trim() ? search.trim() : null,
      onlyStarred: onlyStarred ? true : null,
      includeDismissed: includeDismissed ? true : null,
      limit: 100,
      offset: 0,
    }),
    [includeDismissed, onlyStarred, search, sourceId],
  );

  const articlesQuery = useNewsArticles(filters);
  const actions = useNewsArticleActions();

  const sourceNameById = useMemo(() => {
    const map = new Map<number, string>();
    (sources.data || []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sources.data]);

  const noProviders = !sources.isLoading && (sources.data?.length || 0) === 0;
  const articles = articlesQuery.data || [];

  return (
    <Box style={{ height: '100%' }}>
      <Flex align="center" justify="between" gap="3" mb="4">
        <Heading size="6">Stream</Heading>
        <Flex align="center" gap="2">
          <Button variant="soft" onClick={() => setOnlyStarred((v) => !v)}>
            {onlyStarred ? <StarOff size={16} /> : <Star size={16} />}
            {onlyStarred ? 'All' : 'Starred'}
          </Button>
          <Button
            onClick={() => actions.syncNow.mutate(sourceId === 'all' ? null : Number(sourceId))}
            disabled={actions.syncNow.isPending}
          >
            <RefreshCw size={16} />
            Sync now
          </Button>
          <Button
            variant="soft"
            color="red"
            onClick={async () => {
              const confirmed = await dialog.confirm({
                title: 'Clear all articles',
                description: 'This permanently deletes all articles from the local database.',
                confirmText: 'Delete all',
                variant: 'danger',
              });
              if (!confirmed) return;
              actions.clearAll.mutate();
            }}
            disabled={actions.clearAll.isPending}
          >
            <Trash2 size={16} />
            Dump all
          </Button>
        </Flex>
      </Flex>

      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <Flex gap="3" align="center" wrap="wrap">
          <TextField.Root
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles / excerpts…"
            style={{ flex: '1 1 320px' }}
          />
          <Select.Root value={sourceId} onValueChange={setSourceId}>
            <Select.Trigger style={{ width: 220 }} />
            <Select.Content>
              <Select.Item value="all">All sources</Select.Item>
              {(sources.data || []).map((s) => (
                <Select.Item key={s.id} value={String(s.id)}>
                  {s.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button variant={includeDismissed ? 'solid' : 'soft'} onClick={() => setIncludeDismissed((v) => !v)}>
            {includeDismissed ? 'Showing dismissed' : 'Hide dismissed'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setSourceId('all');
              setOnlyStarred(false);
              setIncludeDismissed(false);
            }}
          >
            Reset
          </Button>
        </Flex>
      </Card>

      {noProviders ? (
        <Card>
          <Flex direction="column" gap="2" align="center" p="6">
            <Heading size="4">No providers</Heading>
            <Text color="gray">Add a feed source first, then come back here to see your stream.</Text>
            <Button asChild>
              <Link to="/research/sources">Add source</Link>
            </Button>
          </Flex>
        </Card>
      ) : articlesQuery.isLoading ? (
        <Text color="gray">Loading…</Text>
      ) : articlesQuery.isError ? (
        <Card>
          <Flex direction="column" gap="2" p="4">
            <Heading size="4">Failed to load stream</Heading>
            <Text color="gray">
              {typeof articlesQuery.error === 'string'
                ? articlesQuery.error
                : ((articlesQuery.error as any)?.message ?? String(articlesQuery.error) ?? 'Unknown error')}
            </Text>
          </Flex>
        </Card>
      ) : articles.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" align="center" p="6">
            <Heading size="4">No articles yet</Heading>
            <Text color="gray">Try syncing, or adjust filters.</Text>
            <Button onClick={() => actions.syncNow.mutate(null)} disabled={actions.syncNow.isPending}>
              <RefreshCw size={16} />
              Sync now
            </Button>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3" style={{ paddingBottom: 'var(--space-4)' }}>
          {articles.map((a) => {
            const feedSourceId = feedSourceIdFromAddedVia(a.addedVia);
            const src = feedSourceId != null ? sourceNameById.get(feedSourceId) : null;

            const isStarred = Boolean(a.isStarred);
            const isDismissed = Boolean(a.isDismissed);
            const isRead = Boolean(a.isRead);

            return (
              <Card key={a.id} style={{ opacity: isDismissed ? 0.65 : 1 }}>
                <Flex direction="column" gap="2">
                  <Flex align="start" justify="between" gap="3">
                    <Box style={{ minWidth: 0 }}>
                      <Text
                        size="4"
                        weight="medium"
                        style={{
                          cursor: a.url ? 'pointer' : 'default',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          if (!a.url) return;
                          researchOpenDetachedCockpit({
                            url: a.url,
                            title: a.title,
                          }).catch((err) => {
                            toast.error('Failed to open research cockpit', String(err));
                          });
                        }}
                        title={a.title}
                      >
                        {a.title}
                      </Text>
                      <Text size="1" color="gray" style={{ marginTop: 4 }}>
                        {src ? `${src} · ` : a.sourceName ? `${a.sourceName} · ` : ''}
                        {formatDate(a.publishedAt)}
                      </Text>
                    </Box>

                    <Flex gap="1" align="center">
                      <IconButton
                        variant={isStarred ? 'solid' : 'soft'}
                        color={isStarred ? 'yellow' : undefined}
                        onClick={() => actions.toggleStar.mutate({ articleId: a.id, starred: !isStarred })}
                        title={isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star size={16} />
                      </IconButton>
                      <IconButton
                        variant={isRead ? 'solid' : 'soft'}
                        onClick={() => {
                          if (isRead) return;
                          actions.markRead.mutate(a.id);
                        }}
                        disabled={isRead}
                        title={isRead ? 'Read' : 'Mark read'}
                      >
                        <CheckCheck size={16} />
                      </IconButton>
                      <IconButton
                        variant={isDismissed ? 'solid' : 'soft'}
                        color={isDismissed ? 'red' : undefined}
                        onClick={() => {
                          if (isDismissed) return;
                          actions.dismiss.mutate(a.id);
                        }}
                        disabled={isDismissed}
                        title={isDismissed ? 'Dismissed' : 'Dismiss'}
                      >
                        <Archive size={16} />
                      </IconButton>
                    </Flex>
                  </Flex>

                  {a.excerpt ? (
                    <>
                      <Separator size="4" />
                      <Text size="2" color="gray" style={{ whiteSpace: 'pre-wrap' }}>
                        {a.excerpt}
                      </Text>
                    </>
                  ) : null}
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}
