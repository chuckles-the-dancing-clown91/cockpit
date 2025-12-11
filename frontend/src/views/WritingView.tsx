import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor from '@uiw/react-md-editor';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Idea, IdeaStatus, useIdea, useIdeas, useNewsArticle } from '../hooks/queries';
import { invoke } from '@tauri-apps/api/core';

const statusLabels: Record<IdeaStatus, string> = {
  in_progress: 'In progress',
  stalled: 'Stalled',
  complete: 'Complete',
};

export function WritingView() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { data: ideas } = useIdeas({ search });
  const { data: idea } = useIdea(selectedId ?? undefined);
  const { data: referenceArticle } = useNewsArticle(idea?.newsArticleId ?? undefined);
  const qc = useQueryClient();

  const createIdea = useMutation({
    mutationFn: async () => invoke<Idea>('create_idea', { title: 'Untitled idea', summary: null, news_article_id: null }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      setSelectedId(created.id);
    },
  });

  const updateMetadata = useMutation({
    mutationFn: async (payload: {
      id: number;
      title?: string;
      summary?: string;
      status?: IdeaStatus;
      target?: string;
      tags?: string[];
    }) => invoke<Idea>('update_idea_metadata', { ...payload }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['idea', updated.id] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) =>
      invoke('update_idea_notes', { id, notes_markdown: notes }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['idea', vars.id] });
    },
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, articleTitle, articleMarkdown }: { id: number; articleTitle?: string; articleMarkdown: string }) =>
      invoke('update_idea_article', { id, article_title: articleTitle, article_markdown: articleMarkdown }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['idea', vars.id] });
    },
  });

  const [notesValue, setNotesValue] = useState<string>('');
  const [articleValue, setArticleValue] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [summaryValue, setSummaryValue] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');

  useEffect(() => {
    setNotesValue(idea?.notesMarkdown ?? '');
    setArticleValue(idea?.articleMarkdown ?? '');
    setArticleTitle(idea?.articleTitle ?? '');
    setSummaryValue(idea?.summary ?? '');
    setTargetValue(idea?.target ?? '');
  }, [idea?.notesMarkdown, idea?.articleMarkdown, idea?.articleTitle, idea?.summary, idea?.target]);

  const tagString = useMemo(() => (idea?.tags ?? []).join(', '), [idea?.tags]);

  return (
    <div className="grid grid-cols-[280px_1fr] gap-3 p-3 h-full">
      <Card className="flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3">
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
        <div className="px-3 pb-2">
          <Input placeholder="Search ideas" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 px-3 pb-3">
            {(ideas ?? []).map((item) => (
              <button
                key={item.id}
                className={`text-left p-3 rounded-[var(--radius-button)] border ${
                  selectedId === item.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]'
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[var(--color-text-primary)]">{item.title}</div>
                  <span className="text-[0.75rem] px-2 py-1 rounded bg-[var(--color-border-subtle)] text-[var(--color-text-soft)]">
                    {statusLabels[item.status]}
                  </span>
                </div>
                {item.summary ? (
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">{item.summary}</div>
                ) : null}
                <div className="text-[0.7rem] text-[var(--color-text-soft)] mt-1">
                  Updated {new Date(item.dateUpdated).toLocaleString()}
                </div>
              </button>
            ))}
            {(ideas ?? []).length === 0 ? (
              <div className="text-[var(--color-text-muted)] text-sm">No ideas yet.</div>
            ) : null}
          </div>
        </ScrollArea>
      </Card>

      <div className="grid grid-rows-[2fr_1fr] gap-3 min-h-0">
        <div className="grid grid-cols-3 gap-3 min-h-0">
          <Card className="col-span-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-lg font-semibold">Notes</h3>
            </div>
            <div className="flex-1 px-3 pb-3">
              <MDEditor
                height={320}
                value={notesValue}
                onChange={(val) => {
                  const next = val ?? '';
                  setNotesValue(next);
                  if (idea?.id) {
                    updateNotes.mutate({ id: idea.id, notes: next });
                  }
                }}
              />
            </div>
          </Card>
          <Card className="col-span-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-lg font-semibold">Composer</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="border border-[var(--color-border)]">
                  Schedule
                </Button>
                <Button size="sm">Publish</Button>
              </div>
            </div>
            <div className="px-3 py-3 space-y-2 flex-1 flex flex-col min-h-0">
              <Input
                placeholder="Draft title"
                value={articleTitle}
                onChange={(e) => {
                  setArticleTitle(e.target.value);
                  if (idea?.id) {
                    updateArticle.mutate({ id: idea.id, articleTitle: e.target.value, articleMarkdown: articleValue });
                  }
                }}
              />
              <div className="flex-1 min-h-0">
                <MDEditor
                  height={300}
                  value={articleValue}
                  onChange={(val) => {
                    const next = val ?? '';
                    setArticleValue(next);
                    if (idea?.id) {
                      updateArticle.mutate({ id: idea.id, articleTitle, articleMarkdown: next });
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-3 min-h-0">
          <Card className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Meta</h3>
              <Select
                value={idea?.status ?? 'in_progress'}
                onValueChange={(val) => {
                  if (idea?.id) updateMetadata.mutate({ id: idea.id, status: val as IdeaStatus });
                }}
              >
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="stalled">Stalled</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Idea title"
              value={idea?.title ?? ''}
              onChange={(e) => idea?.id && updateMetadata.mutate({ id: idea.id, title: e.target.value })}
            />
            <Textarea
              placeholder="Short summary"
              value={summaryValue}
              onChange={(e) => {
                setSummaryValue(e.target.value);
                if (idea?.id) updateMetadata.mutate({ id: idea.id, summary: e.target.value });
              }}
            />
            <Input
              placeholder="Target (e.g., r/...)"
              value={targetValue}
              onChange={(e) => {
                setTargetValue(e.target.value);
                if (idea?.id) updateMetadata.mutate({ id: idea.id, target: e.target.value });
              }}
            />
            <Input
              placeholder="Tags (comma separated)"
              value={tagString}
              readOnly
              className="text-[var(--color-text-soft)]"
            />
          </Card>
          <Card className="flex flex-col gap-3 p-3">
            <h3 className="text-lg font-semibold">Reference</h3>
            {referenceArticle ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{referenceArticle.title}</div>
                <div className="text-[var(--color-text-soft)]">
                  {referenceArticle.sourceName || referenceArticle.sourceDomain || referenceArticle.sourceId || 'Unknown source'}
                </div>
                {referenceArticle.publishedAt ? (
                  <div className="text-[var(--color-text-muted)]">
                    {new Date(referenceArticle.publishedAt).toLocaleString()}
                  </div>
                ) : null}
                <div className="text-[var(--color-text-muted)] text-sm">{referenceArticle.excerpt}</div>
                {referenceArticle.url ? (
                  <a
                    className="text-[var(--color-accent)] underline"
                    href={referenceArticle.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View original
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="text-[var(--color-text-muted)] text-sm">No linked article yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
