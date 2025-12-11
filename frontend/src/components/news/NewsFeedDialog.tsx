import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ScrollArea } from '../ui/ScrollArea';
import { NewsArticle, NewsSettings, SaveNewsSettingsInput, useNewsArticles, useNewsSettings } from '../../hooks/queries';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

type Props = {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
};

type RunTaskNowResult = {
  status: string;
  result?: string | null;
  error_message?: string | null;
  finished_at?: string | null;
};

export function NewsFeedDialog({ trigger, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [status, setStatus] = useState<'unread' | 'all' | 'dismissed' | 'ideas'>('unread');
  const [showSettings, setShowSettings] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { data: settings } = useNewsSettings();
  const { data: articles, isLoading, refetch } = useNewsArticles(status, 50);
  const qc = useQueryClient();

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => invoke('dismiss_news_article', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
    },
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

  const unreadCount = articles?.filter((a) => !a.dismissed_at && !a.added_to_ideas_at).length ?? 0;
  const lastSynced = settings?.last_synced_at
    ? new Date(settings.last_synced_at).toLocaleString()
    : 'Never';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(1100px,100%-2rem)] h-[min(720px,100%-2rem)] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] text-[var(--color-text-primary)]"
        >
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <div>
              <Dialog.Title className="text-xl font-semibold text-[var(--color-text-primary)]">News Feed</Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--color-text-soft)]">
                {unreadCount} unread · Last sync: {lastSynced}
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="subtle" size="sm" onClick={() => setStatus('unread')}>
                Unread
              </Button>
              <Button variant="subtle" size="sm" onClick={() => setStatus('all')}>
                All
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
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, idx) => <Card key={idx} className="h-[170px] animate-pulse" />)
                    : (articles ?? []).map((article) => (
                        <ArticleCard key={article.id} article={article} onDismiss={() => dismissMutation.mutate(article.id)} />
                      ))}
                  {!isLoading && (articles ?? []).length === 0 ? (
                    <div className="text-[var(--color-text-muted)]">No articles available.</div>
                  ) : null}
                </div>
              </ScrollArea>
            </Card>
            {showSettings ? (
              <Card className="min-h-0 h-full shadow-[var(--shadow-card-soft)] p-4">
                <SettingsCard settings={settings} />
              </Card>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ArticleCard({ article, onDismiss }: { article: NewsArticle; onDismiss: () => void }) {
  return (
    <Card className="flex flex-col gap-2">
      <Card.Header className="border-none px-0 pt-0 pb-0">
        <div className="flex flex-col gap-1 px-3 pt-2">
          <Card.Title className="text-base">
            <button
              className="text-left hover:underline"
              onClick={() => article.url && window.open(article.url, '_blank')}
            >
              {article.title}
            </button>
          </Card.Title>
          <div className="text-xs text-[var(--color-text-soft)]">{article.source_name || article.source_domain || 'Unknown source'}</div>
        </div>
      </Card.Header>
      <Card.Body className="px-3 py-0 text-sm text-[var(--color-text-muted)]">
        {article.excerpt ?? 'No excerpt available.'}
      </Card.Body>
      <Card.Footer className="px-3 pb-3 pt-2">
        <div className="text-xs text-[var(--color-text-soft)]">
          {article.published_at ? new Date(article.published_at).toLocaleString() : 'Unknown time'}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-[var(--color-border)]"
            onClick={() => article.url && window.open(article.url, '_blank')}
          >
            Open
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}

function SettingsCard({ settings }: { settings?: NewsSettings }) {
  const [form, setForm] = useState<SaveNewsSettingsInput>({
    api_key: '',
    max_articles: settings?.max_articles ?? 4000,
    daily_call_limit: settings?.daily_call_limit ?? 180,
    query: settings?.query ?? '',
  });
  const qc = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async (body: SaveNewsSettingsInput) => invoke('save_news_settings', { input: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsSettings'] });
      qc.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });

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
            onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">Query</span>
          <Textarea
            placeholder="keywords, e.g. ai OR policy"
            defaultValue={settings?.query}
            onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={500}
            max={8000}
            defaultValue={settings?.max_articles ?? 4000}
            onChange={(e) => setForm((f) => ({ ...f, max_articles: Number(e.target.value) }))}
            placeholder="Max articles"
          />
          <Input
            type="number"
            min={10}
            max={200}
            defaultValue={settings?.daily_call_limit ?? 180}
            onChange={(e) => setForm((f) => ({ ...f, daily_call_limit: Number(e.target.value) }))}
            placeholder="Daily cap"
          />
        </div>
      </Card.Body>
      <Card.Footer className="px-0 pb-0 pt-0">
        <div className="flex gap-2 justify-end w-full">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isLoading}
            variant="solid"
          >
            {saveMutation.isLoading ? 'Saving…' : 'Save & Sync'}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}
