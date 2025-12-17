import * as Dialog from '@radix-ui/react-dialog';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/core/lib/toast';
import { Button } from '@/core/components/ui/Button';
import { Card } from '@/core/components/ui/Card';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import {
  NewsArticle,
  useNewsArticles,
} from '../../../hooks/queries';
import {
  NewsSettings,
  SaveNewsSettingsInput,
  useNewsSettings,
  useNewsSources,
  NewsSource,
} from '../../../hooks/queries';
import { Input } from '@/core/components/ui/Input';
import { Textarea } from '@/core/components/ui/Textarea';

type Props = {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
};

type NewsFeedStatus = NonNullable<Parameters<typeof useNewsArticles>[0]['status']>;

type RunTaskNowResult = {
  status: string;
  result?: string | null;
  error_message?: string | null;
  finished_at?: string | null;
};

export function NewsFeedDialog({ trigger, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState<NewsFeedStatus>('unread');
  const [showSettings, setShowSettings] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<NewsArticle | null>(null);
  const { data: settings } = useNewsSettings();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const handleStatusChange = (next: typeof status) => {
    setStatus(next);
    setOffset(0);
  };
  const pageSize = 30;
  const { data: articles, isLoading, refetch } = useNewsArticles({ status, limit: offset + pageSize, offset: 0, search });
  const { data: sources } = useNewsSources({ country: settings?.countries?.[0], language: settings?.language ?? undefined });
  const qc = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => invoke('mark_news_article_read', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });

  const createIdeaMutation = useMutation({
    mutationFn: async (id: number) => invoke('create_idea_for_article', { input: { article_id: id } }),
    onSuccess: (_, articleId) => {
      toast.success('Added to Ideas inbox');
      qc.invalidateQueries({ queryKey: ['articleIdeas'] });
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
      markReadMutation.mutate(articleId);
      setSelected(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to create idea for article');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => invoke('dismiss_news_article', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: number; starred: boolean }) => invoke('toggle_star_news_article', { id, starred }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsArticles'] }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => invoke<RunTaskNowResult>('sync_news_now'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
      qc.invalidateQueries({ queryKey: ['newsSettings'] });
      refetch();
      if (res.status === 'success') {
        setSyncStatus('Sync complete');
      } else if (res.status === 'skipped') {
        setSyncStatus(`Skipped: ${res.result ?? res.error_message ?? 'no reason provided'}`);
      } else {
        setSyncStatus(`Error: ${res.error_message ?? res.result ?? 'unknown error'}`);
      }
    },
    onError: (err: any) => {
      setSyncStatus(`Error: ${err?.message ?? 'sync failed'}`);
    },
  });

  const syncSourcesMutation = useMutation({
    mutationFn: async () => invoke<RunTaskNowResult>('sync_news_sources_now'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsSources'] });
    },
  });

  const unreadCount =
    articles?.filter((a) => !a.isRead && !a.dismissedAt && !a.addedToIdeasAt).length ?? 0;
  const lastSynced = settings?.last_synced_at
    ? new Date(settings.last_synced_at).toLocaleString()
    : 'Never';
  const syncOk = syncMutation.data?.status === 'success';

  const handleCloseDetails = () => {
    if (selected) {
      markReadMutation.mutate(selected.id);
    }
    setSelected(null);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && selected) {
          markReadMutation.mutate(selected.id);
          setSelected(null);
        }
        setOpen(next);
      }}
    >
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(1100px,100%-2rem)] h-[min(720px,100%-2rem)] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] text-[var(--color-text-primary)]"
        >
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2">
              <div>
                <Dialog.Title className="text-xl font-semibold text-[var(--color-text-primary)]">News Feed</Dialog.Title>
                <Dialog.Description className="text-sm text-[var(--color-text-soft)]">
                  {unreadCount} unread · Last sync: {lastSynced}
                </Dialog.Description>
              </div>
              <span
                className={`inline-flex h-3 w-3 rounded-full border border-[var(--color-border)] ${
                  syncOk ? 'bg-green-500' : 'bg-[var(--color-border-subtle)]'
                }`}
                title={syncOk ? 'Synced' : 'Idle'}
              />
            </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant={status === 'unread' ? 'solid' : 'subtle'} size="sm" onClick={() => setStatus('unread')}>
                  Unread
                </Button>
                <Button variant={status === 'all' ? 'solid' : 'subtle'} size="sm" onClick={() => setStatus('all')}>
                  All
                </Button>
                <Button variant={status === 'dismissed' ? 'solid' : 'subtle'} size="sm" onClick={() => setStatus('dismissed')}>
                  Dismissed
                </Button>
                <Button variant={status === 'ideas' ? 'solid' : 'subtle'} size="sm" onClick={() => setStatus('ideas')}>
                  Ideas
                </Button>
                <Button
                  variant={status === 'ideas' ? 'solid' : 'subtle'}
                  size="sm"
                  onClick={() => handleStatusChange('ideas')}
                >
                  Ideas
                </Button>
                <Button
                  variant={showSettings ? 'outline' : 'subtle'}
                  size="sm"
                  onClick={() => setShowSettings((v) => !v)}
                >
                  {showSettings ? 'Hide settings' : 'Settings'}
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="solid" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isLoading}>
                    {syncMutation.isLoading ? 'Syncing…' : 'Sync now'}
                  </Button>
                  {syncStatus ? (
                    <span className="text-xs text-[var(--color-text-soft)]">{syncStatus}</span>
                  ) : null}
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                </Dialog.Close>
              </div>
            </header>
          <div
            className={
              showSettings
                ? 'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4'
                : 'flex-1 min-h-0 grid grid-cols-1 p-4'
            }
          >
            <Card className="min-h-0 h-full flex flex-col shadow-[var(--shadow-card-soft)]">
              <div className="flex items-center gap-2 px-4 pt-4">
                <Input
                  placeholder="Search stored articles…"
                  value={search}
                  onChange={(e) => {
                    setOffset(0);
                    setSearch(e.target.value);
                  }}
                />
                <Button variant="ghost" size="sm" onClick={() => { setOffset(0); refetch(); }}>
                  Apply
                </Button>
              </div>
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, idx) => <Card key={idx} className="h-[170px] animate-pulse" />)
                    : (articles ?? []).map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          onDismiss={() => dismissMutation.mutate(article.id)}
                          onStar={() => starMutation.mutate({ id: article.id, starred: !(article.isStarred ?? false) })}
                          onOpen={() => setSelected(article)}
                        />
                      ))}
                  {!isLoading && (articles ?? []).length === 0 ? (
                    <div className="text-[var(--color-text-muted)]">No articles available.</div>
                  ) : null}
                </div>
                <div className="flex justify-center pb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOffset((o) => o + pageSize)}
                    disabled={isLoading || (articles ?? []).length < offset + pageSize}
                  >
                    Load more
                  </Button>
                </div>
              </ScrollArea>
            </Card>
            {showSettings ? (
              <Card className="min-h-0 h-full shadow-[var(--shadow-card-soft)] p-4">
                <SettingsCard settings={settings} sources={sources ?? []} onSyncSources={() => syncSourcesMutation.mutate()} />
              </Card>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <ArticleDetailsDialog
        article={selected}
        onClose={handleCloseDetails}
        onDismiss={() => {
          if (selected) {
            dismissMutation.mutate(selected.id);
            markReadMutation.mutate(selected.id);
            setSelected(null);
          }
        }}
        onStar={() => {
          if (selected) {
            starMutation.mutate({ id: selected.id, starred: !(selected.isStarred ?? false) });
          }
        }}
        onCreateIdea={() => {
          if (selected && !selected.addedToIdeasAt) {
            createIdeaMutation.mutate(selected.id);
          }
        }}
        creatingIdea={createIdeaMutation.isLoading}
      />
    </Dialog.Root>
  );
}

function ArticleCard({
  article,
  onDismiss,
  onStar,
  onOpen,
}: {
  article: NewsArticle;
  onDismiss: () => void;
  onStar: () => void;
  onOpen: () => void;
}) {
  const metaSource = article.sourceName || article.sourceDomain || article.sourceId || 'Unknown source';
  const metaDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleString()
    : article.fetchedAt
    ? new Date(article.fetchedAt).toLocaleString()
    : 'Unknown time';
  const hasImage = !!article.imageUrl;
  const fallbackInitials = metaSource.slice(0, 2).toUpperCase();
  const categories = article.tags ?? [];
  const countries = article.country ?? [];
  const isRead = article.isRead ?? false;

  return (
    <Card className={`flex flex-col gap-2 overflow-hidden ${isRead ? 'opacity-80' : ''}`}>
      <div className="relative h-32 bg-[var(--color-surface-soft)]">
        {hasImage ? (
          <img
            src={article.imageUrl as string}
            alt={article.title}
            className="w-full h-full object-cover"
            onClick={onOpen}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--color-text-soft)] bg-[var(--color-surface)]">
            {fallbackInitials}
          </div>
        )}
      </div>
      <Card.Header className="border-none px-0 pt-0 pb-0">
        <div className="flex flex-col gap-1 px-3 pt-2">
          <Card.Title className="text-base">
            <button className="text-left hover:underline" onClick={onOpen}>
              {article.title}
            </button>
          </Card.Title>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-soft)]">
            <span>{metaSource}</span>
            <span className="text-[var(--color-text-muted)]">•</span>
            <span>{metaDate}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {countries.map((c) => (
              <span key={`c-${c}`} className="text-[0.7rem] px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-soft)]">
                {c}
              </span>
            ))}
            {categories.map((c) => (
              <span key={`t-${c}`} className="text-[0.7rem] px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-soft)]">
                {c}
              </span>
            ))}
          </div>
        </div>
      </Card.Header>
      <Card.Body className="px-3 py-0 text-sm text-[var(--color-text-muted)] line-clamp-4 cursor-pointer" onClick={onOpen}>
        {article.excerpt ?? 'No excerpt available.'}
      </Card.Body>
      <Card.Footer className="px-3 pb-3 pt-2">
        <div className="flex gap-2 items-center">
          {article.addedToIdeasAt ? (
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-text-soft)] border border-[var(--color-border-subtle)]">
              In Ideas
            </span>
          ) : null}
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onStar}>
            {article.isStarred ? 'Unstar' : 'Star'}
          </Button>
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onOpen}>
            Details
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}

function ArticleDetailsDialog({
  article,
  onClose,
  onDismiss,
  onStar,
  onCreateIdea,
  creatingIdea,
}: {
  article: NewsArticle | null;
  onClose: () => void;
  onDismiss: () => void;
  onStar: () => void;
  onCreateIdea: () => void;
  creatingIdea: boolean;
}) {
  if (!article) return null;
  const metaSource = article.sourceName || article.sourceDomain || article.sourceId || 'Unknown source';
  const metaDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleString()
    : article.fetchedAt
    ? new Date(article.fetchedAt).toLocaleString()
    : 'Unknown time';
  const categories = article.tags ?? [];
  const countries = article.country ?? [];
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[60] bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 w-[min(900px,100%-2rem)] max-h-[80vh] flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card-elevated)] overflow-hidden">
        <div className="flex items-start gap-3 p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex-1">
            <div className="text-xs text-[var(--color-text-soft)]">{metaSource} • {metaDate}</div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">{article.title}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {countries.map((c) => (
                <span key={`detail-c-${c}`} className="text-[0.75rem] px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-soft)]">
                  {c}
                </span>
              ))}
              {categories.map((c) => (
                <span key={`detail-t-${c}`} className="text-[0.75rem] px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-soft)]">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        {article.imageUrl ? (
          <div className="h-56 overflow-hidden bg-[var(--color-surface-soft)]">
            <img src={article.imageUrl as string} alt={article.title} className="w-full h-full object-cover" />
          </div>
        ) : null}
        <ScrollArea className="flex-1">
          <div className="p-4 text-sm text-[var(--color-text-muted)] space-y-3">
            <p>{article.excerpt || 'No excerpt available.'}</p>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            disabled={!!article.addedToIdeasAt || creatingIdea}
            onClick={onCreateIdea}
          >
            {article.addedToIdeasAt ? 'Added to Ideas' : creatingIdea ? 'Adding…' : 'Add to Ideas'}
          </Button>
            {article.url ? (
              <a
                className="text-sm underline text-[var(--color-text-primary)]"
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Open original (browser)
              </a>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onStar}>
              {article.isStarred ? 'Unstar' : 'Star'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function SettingsCard({ settings, sources, onSyncSources }: { settings?: NewsSettings; sources: NewsSource[]; onSyncSources: () => void }) {
  const [form, setForm] = useState<SaveNewsSettingsInput>({
    api_key: '',
    language: settings?.language ?? 'en',
    max_articles: settings?.max_articles ?? 4000,
    max_stored: settings?.max_stored ?? settings?.max_articles ?? 4000,
    daily_call_limit: settings?.daily_call_limit ?? 180,
    query: settings?.query ?? '',
    keywords_in_title: settings?.keywords_in_title ?? '',
    from_date: settings?.from_date ?? '',
    to_date: settings?.to_date ?? '',
    countries: settings?.countries ?? ['us'],
    sources: settings?.sources ?? [],
  });

  React.useEffect(() => {
    setForm({
      api_key: '',
      language: settings?.language ?? 'en',
      max_articles: settings?.max_articles ?? 4000,
      max_stored: settings?.max_stored ?? settings?.max_articles ?? 4000,
      daily_call_limit: settings?.daily_call_limit ?? 180,
      query: settings?.query ?? '',
      keywords_in_title: settings?.keywords_in_title ?? '',
      from_date: settings?.from_date ?? '',
      to_date: settings?.to_date ?? '',
      countries: settings?.countries ?? ['us'],
      sources: settings?.sources ?? [],
    });
  }, [settings]);
  const qc = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async (body: SaveNewsSettingsInput) => invoke('save_news_settings', { input: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsSettings'] });
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });
  const syncMutation = useMutation({
    mutationFn: async () => invoke<RunTaskNowResult>('sync_news_now'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsSettings'] });
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
      qc.invalidateQueries({ queryKey: ['newsSources'] });
    },
  });

  const handleSaveAndSync = async () => {
    const apiKey = form.api_key?.trim();
    const payload: SaveNewsSettingsInput = { ...form };
    if (apiKey && apiKey.length > 0) {
      payload.api_key = apiKey;
    } else {
      delete (payload as Partial<SaveNewsSettingsInput>).api_key;
    }
    await saveMutation.mutateAsync(payload);
    await syncMutation.mutateAsync();
  };

  return (
    <Card className="flex flex-col gap-3">
      <Card.Header className="border-none px-0 pt-0 pb-0">
        <Card.Title>News Settings</Card.Title>
        <Card.Subtitle>API + filters</Card.Subtitle>
      </Card.Header>
      <Card.Body className="flex flex-col gap-3 px-0 py-0 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">API Key</span>
          <Input
            type="password"
            placeholder={settings?.has_api_key ? '••••••••' : 'Enter NewsData API key'}
            value={form.api_key ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="language (e.g. en)"
            value={form.language ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          />
          <Input
            placeholder="Countries (comma separated)"
            value={(form.countries ?? []).join(',')}
            onChange={(e) => setForm((f) => ({ ...f, countries: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">Query</span>
          <Textarea
            placeholder="keywords, e.g. ai OR policy"
            value={form.query ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">Title keywords</span>
          <Input
            placeholder="qInTitle"
            value={form.keywords_in_title ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, keywords_in_title: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={form.from_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
          />
          <Input
            type="date"
            value={form.to_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">Domains (sources)</span>
          <div className="flex flex-wrap gap-1">
            {sources.slice(0, 32).map((src) => {
              const checked = form.sources?.includes(src.source_id) ?? false;
              return (
                <button
                  key={src.source_id}
                  className={`px-2 py-1 text-xs rounded border ${
                    checked ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-soft)]'
                  }`}
                  onClick={() =>
                    setForm((f) => {
                      const current = f.sources ?? [];
                      if (current.includes(src.source_id)) {
                        return { ...f, sources: current.filter((s) => s !== src.source_id) };
                      }
                      return { ...f, sources: [...current, src.source_id] };
                    })
                  }
                  type="button"
                  title={src.url ?? src.source_id}
                >
                  {src.name ?? src.source_id}
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-1">({src.source_id})</span>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={onSyncSources}>
            Sync providers
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={500}
            max={8000}
            value={form.max_articles ?? 4000}
            onChange={(e) => setForm((f) => ({ ...f, max_articles: Number(e.target.value) }))}
            placeholder="Max articles"
          />
          <Input
            type="number"
            min={10}
            max={200}
            value={form.daily_call_limit ?? 180}
            onChange={(e) => setForm((f) => ({ ...f, daily_call_limit: Number(e.target.value) }))}
            placeholder="Daily cap"
          />
          <Input
            type="number"
            min={500}
            max={8000}
            value={form.max_stored ?? form.max_articles ?? 4000}
            onChange={(e) => setForm((f) => ({ ...f, max_stored: Number(e.target.value) }))}
            placeholder="Max stored"
          />
        </div>
      </Card.Body>
      <Card.Footer className="px-0 pb-0 pt-0">
        <div className="flex gap-2 justify-end w-full">
          <Button
            size="sm"
            onClick={() => handleSaveAndSync()}
            disabled={saveMutation.isLoading || syncMutation.isLoading}
            variant="solid"
          >
            {saveMutation.isLoading || syncMutation.isLoading ? 'Saving…' : 'Save & Sync'}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}
