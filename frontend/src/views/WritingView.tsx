import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import MDEditor from '@uiw/react-md-editor';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useArticleIdeas, type ArticleIdea, type NewsArticle } from '../hooks/queries';
import { cn } from '../lib/cn';

const statusTabs: { value: ArticleIdea['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'planned', label: 'Planned' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'archived', label: 'Archived' },
];

export function WritingView() {
  const [status, setStatus] = useState<ArticleIdea['status'] | 'all'>('inbox');
  const [search, setSearch] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data: ideas = [], isFetching } = useArticleIdeas({
    status,
    search: search.trim() || undefined,
  });

  const selectedIdea = useMemo(() => ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0], [ideas, selectedIdeaId]);

  const [articleContent, setArticleContent] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [metadata, setMetadata] = useState<{
    status: ArticleIdea['status'];
    priority: ArticleIdea['priority'] | undefined;
    isPinned: boolean;
    dateRemoved?: string | null;
  }>({ status: 'inbox', priority: 'normal', isPinned: false });

  useEffect(() => {
    if (!selectedIdea) return;
    setSelectedIdeaId(selectedIdea.id);
    setArticleContent(selectedIdea.articleMarkdown ?? '');
    setNotesContent(selectedIdea.notesMarkdown ?? '');
    setMetadata({
      status: selectedIdea.status,
      priority: selectedIdea.priority ?? 'normal',
      isPinned: Boolean(selectedIdea.isPinned),
      dateRemoved: selectedIdea.dateRemoved,
    });
  }, [selectedIdea?.id]);

  useEffect(() => {
    if (!selectedIdea) return;
    if (articleContent === (selectedIdea.articleMarkdown ?? '')) return;
    const handle = setTimeout(async () => {
      try {
        await invoke('update_idea_article', { idea_id: selectedIdea.id, article_markdown: articleContent });
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
        await invoke('update_idea_notes', { idea_id: selectedIdea.id, notes_markdown: notesContent });
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
      priority: patch.priority ?? metadata.priority ?? 'normal',
      isPinned: patch.isPinned ?? metadata.isPinned,
      dateRemoved: patch.dateRemoved ?? metadata.dateRemoved ?? null,
    } as const;

    try {
      await invoke('update_idea_metadata', {
        idea_id: selectedIdea.id,
        status: next.status,
        priority: next.priority,
        is_pinned: next.isPinned,
        date_removed: next.dateRemoved,
      });
      setMetadata(next);
      updateIdeaCache(selectedIdea.id, {
        status: next.status,
        priority: next.priority,
        isPinned: next.isPinned,
        dateRemoved: next.dateRemoved,
      });
    } catch (err) {
      console.error('Failed to update metadata', err);
    }
  }

  const linkedArticle: NewsArticle | undefined = selectedIdea?.newsArticle;

  return (
    <div className="grid grid-cols-[320px_1fr_420px] gap-3 p-3 h-full">
      <Card className="flex flex-col gap-3 overflow-hidden">
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

      <Card className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Composer</h3>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>Status: {metadata.status}</span>
            <span>• Priority: {metadata.priority}</span>
          </div>
        </div>
        <MDEditor value={articleContent} onChange={(val = '') => setArticleContent(val)} className="h-full" height={400} />
      </Card>

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
                onClick={() =>
                  handleMetadataChange({
                    status: 'archived',
                    dateRemoved: new Date().toISOString(),
                  })
                }
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
                value={metadata.priority ?? 'normal'}
                onValueChange={(value) => handleMetadataChange({ priority: value as ArticleIdea['priority'] })}
                disabled={!selectedIdea}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 min-h-[240px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Notes</h3>
            <span className="text-xs text-[var(--color-text-muted)]">Autosaves while you type</span>
          </div>
          <MDEditor value={notesContent} onChange={(val = '') => setNotesContent(val)} height={180} />
        </Card>

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
