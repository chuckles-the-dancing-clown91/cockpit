import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import MDEditor from '../vendor/MDEditor';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useArticleIdeas, type ArticleIdea, type NewsArticle } from '../hooks/queries';
import { cn } from '../lib/cn';
import { useTheme } from '../theme/ThemeProvider';
import WritingStats from '../components/writing/WritingStats';

const statusTabs: { value: ArticleIdea['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'complete', label: 'Complete' },
];

export function WritingView() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ArticleIdea['status'] | 'all'>('in_progress');
  const [search, setSearch] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data: ideas = [], isFetching } = useArticleIdeas({
    status,
    search: search.trim() || undefined,
  });
  const createIdea = useMutation({
    mutationFn: async () => invoke<ArticleIdea>('create_idea', { input: { title: 'Untitled idea' } }),
    onSuccess: (idea) => {
      toast.success('New idea created');
      queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
      setSelectedIdeaId(idea.id);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to create idea');
    },
  });

  const selectedIdea = useMemo(() => ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0], [ideas, selectedIdeaId]);

  const [articleContent, setArticleContent] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [metadata, setMetadata] = useState<{
    status: ArticleIdea['status'];
    priority: ArticleIdea['priority'] | undefined;
    isPinned: boolean;
    dateRemoved?: string | null;
  }>({ status: 'in_progress', priority: 0, isPinned: false });

  useEffect(() => {
    if (!selectedIdea) return;
    setSelectedIdeaId(selectedIdea.id);
    setArticleContent(selectedIdea.articleMarkdown ?? '');
    setNotesContent(selectedIdea.notesMarkdown ?? '');
    setMetadata({
      status: selectedIdea.status,
      priority: selectedIdea.priority ?? 0,
      isPinned: Boolean(selectedIdea.isPinned),
      dateRemoved: selectedIdea.dateRemoved,
    });
  }, [selectedIdea?.id]);

  useEffect(() => {
    if (!selectedIdea) return;
    if (articleContent === (selectedIdea.articleMarkdown ?? '')) return;
    const handle = setTimeout(async () => {
      try {
        await invoke('update_idea_article', { id: selectedIdea.id, input: { article_markdown: articleContent } });
        updateIdeaCache(selectedIdea.id, { articleMarkdown: articleContent });
      } catch (err) {
        console.error('Failed to save article draft', err);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [articleContent, selectedIdea?.id]);

  useEffect(() => {
    if (!selectedIdea) return;
    if (notesContent === (selectedIdea.notesMarkdown ?? '')) return;
    const handle = setTimeout(async () => {
      try {
        await invoke('update_idea_notes', { id: selectedIdea.id, input: { notes_markdown: notesContent } });
        updateIdeaCache(selectedIdea.id, { notesMarkdown: notesContent, notes: notesContent });
      } catch (err) {
        console.error('Failed to save notes', err);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [notesContent, selectedIdea?.id]);

  function updateIdeaCache(id: number, patch: Partial<ArticleIdea>) {
    queryClient.setQueriesData({ queryKey: ['articleIdeas'] }, (prev?: ArticleIdea[]) =>
      prev?.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)) ?? prev
    );
  }

  async function handleMetadataChange(patch: Partial<ArticleIdea>) {
    if (!selectedIdea) return;
    const next = {
      status: patch.status ?? metadata.status,
      priority: patch.priority ?? metadata.priority ?? 0,
      isPinned: patch.isPinned ?? metadata.isPinned,
    } as const;

    try {
      await invoke('update_idea_metadata', {
        id: selectedIdea.id,
        input: {
          status: next.status,
          priority: next.priority,
          is_pinned: next.isPinned,
        },
      });
      setMetadata(next);
      updateIdeaCache(selectedIdea.id, {
        status: next.status,
        priority: next.priority,
        isPinned: next.isPinned,
      });
    } catch (err) {
      console.error('Failed to update metadata', err);
    }
  }

  async function handleArchive() {
    if (!selectedIdea) return;
    try {
      const result = await invoke<any>('archive_idea', { id: selectedIdea.id });
      const dateRemoved = result?.date_removed ?? result?.dateRemoved ?? new Date().toISOString();
      const status = (result?.status as ArticleIdea['status']) ?? metadata.status;
      updateIdeaCache(selectedIdea.id, { dateRemoved, status });
      setMetadata((prev) => ({ ...prev, dateRemoved }));
      toast.success('Idea archived');
    } catch (err) {
      console.error('Failed to archive idea', err);
      toast.error('Failed to archive');
    }
  }

  const linkedArticle: NewsArticle | undefined = selectedIdea?.newsArticle;
  const priorityLabel = (value?: number) => {
    switch (value) {
      case 2:
        return 'High';
      case 0:
        return 'Low';
      default:
        return 'Normal';
    }
  };
  const statusLabel = (value?: ArticleIdea['status']) => {
    switch (value) {
      case 'in_progress':
        return 'In progress';
      case 'stalled':
        return 'Stalled';
      case 'complete':
        return 'Complete';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="grid grid-cols-[320px_1fr_420px] gap-2 p-2 h-full min-h-0">
      <Card className="flex flex-col gap-3 overflow-hidden h-full min-h-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ideas</h3>
          <Button
            variant="ghost"
            size="sm"
            className="border border-[var(--color-border)]"
            onClick={() => createIdea.mutate()}
            disabled={createIdea.isLoading}
          >
            New
          </Button>
        </div>
        <Tabs value={status} onValueChange={(value) => setStatus(value as ArticleIdea['status'] | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search ideas"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[var(--color-surface-soft)]"
        />
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 pr-1">
            {ideas.length ? (
              ideas.map((idea) => (
                <button
                  key={idea.id}
                  className={cn(
                    'text-left p-3 rounded-[var(--radius-button)] border transition-colors',
                    'bg-[var(--color-surface-soft)] border-[var(--color-border-subtle)] hover:border-[var(--color-border)]',
                    selectedIdea?.id === idea.id && 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  )}
                  onClick={() => setSelectedIdeaId(idea.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-[var(--color-text-primary)]">{idea.title}</div>
                    {idea.isPinned ? <span className="text-xs text-[var(--color-accent-strong)]">Pinned</span> : null}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] capitalize">{idea.status}</div>
                  {idea.notes || idea.notesMarkdown ? (
                    <div className="text-xs text-[var(--color-text-soft)] mt-1 line-clamp-2">{idea.notes || idea.notesMarkdown}</div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="text-[var(--color-text-muted)]">{isFetching ? 'Loading ideas…' : 'No ideas yet.'}</div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex flex-col gap-1.5 h-full min-h-0" data-color-mode={theme === 'light' ? 'light' : 'dark'}>
        <Card className="flex items-center justify-between p-2 flex-shrink-0">
          <h3 className="text-base font-semibold">Composer</h3>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>Status: {statusLabel(metadata.status)}</span>
            <span>• Priority: {priorityLabel(metadata.priority)}</span>
          </div>
        </Card>
        <div className="flex-shrink-0">
          <WritingStats content={articleContent} />
        </div>
        <div className="flex-1 min-h-0">
          <MDEditor
            value={articleContent}
            onChange={(val = '') => setArticleContent(val)}
            preview="live"
            hideToolbar={false}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 h-full min-h-0">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Metadata</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={metadata.isPinned ? 'solid' : 'ghost'}
                className="border border-[var(--color-border)]"
                onClick={() => handleMetadataChange({ isPinned: !metadata.isPinned })}
                disabled={!selectedIdea}
              >
                {metadata.isPinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-[var(--color-border)]"
                onClick={handleArchive}
                disabled={!selectedIdea}
              >
                Archive
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">Status</span>
              <Select
                value={metadata.status}
                onValueChange={(value) => handleMetadataChange({ status: value as ArticleIdea['status'] })}
                disabled={!selectedIdea}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusTabs
                    .filter((tab) => tab.value !== 'all')
                    .map((tab) => (
                      <SelectItem key={tab.value} value={tab.value}>
                        {tab.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">Priority</span>
              <Select
                value={String(metadata.priority ?? 1)}
                onValueChange={(value) => handleMetadataChange({ priority: Number(value) })}
                disabled={!selectedIdea}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Low</SelectItem>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="2">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3" data-color-mode={theme === 'light' ? 'light' : 'dark'}>
          <Card className="flex items-center justify-between p-3">
            <h3 className="text-lg font-semibold">Notes</h3>
            <span className="text-xs text-[var(--color-text-muted)]">Autosaves while you type</span>
          </Card>
          <div className="h-[200px]">
            <MDEditor
              value={notesContent}
              onChange={(val = '') => setNotesContent(val)}
              preview="edit"
              hideToolbar={false}
            />
          </div>
        </div>

        <Card className="flex flex-col gap-3 overflow-hidden">
          <h3 className="text-lg font-semibold">Reference</h3>
          {linkedArticle ? (
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="text-[var(--color-text-primary)] font-semibold">{linkedArticle.title}</p>
                <p className="text-[var(--color-text-muted)]">{linkedArticle.sourceName ?? linkedArticle.sourceDomain}</p>
                {linkedArticle.publishedAt ? (
                  <p className="text-[var(--color-text-soft)]">
                    Published {new Date(linkedArticle.publishedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              {linkedArticle.excerpt ? <p className="text-[var(--color-text-soft)]">{linkedArticle.excerpt}</p> : null}
              {linkedArticle.tags?.length ? (
                <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                  {linkedArticle.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-[var(--color-border)]"
                  onClick={() => {
                    const detailLink = linkedArticle.articleId ?? linkedArticle.url;
                    if (detailLink) {
                      window.open(detailLink, '_blank', 'noopener');
                    }
                  }}
                >
                  Open article details
                </Button>
                <Button
                  size="sm"
                  onClick={() => linkedArticle.url && window.open(linkedArticle.url, '_blank', 'noopener')}
                  disabled={!linkedArticle.url}
                >
                  View original
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No reference article linked to this idea.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
