import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/core/lib/toast';
import * as Tabs from '@radix-ui/react-tabs';
import { Card } from '@/core/components/ui/Card';
import { Button } from '@/core/components/ui/Button';
import { Input } from '@/core/components/ui/Input';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import { useArticleIdeas, type ArticleIdea } from '../../../hooks/queries';
import { cn } from '@/core/lib/cn';
import { IdeaHoverCard } from './IdeaHoverCard';

// Mock reference data structure - ready for backend integration
interface IdeaReference {
  id: number;
  type: 'article' | 'manual';
  title: string;
  url?: string;
  sourceId?: number;
  addedAt: string;
  notes?: string;
}

// Mock data - replace with actual backend call
const mockReferences: Record<number, IdeaReference[]> = {};

const statusTabs: { value: ArticleIdea['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'complete', label: 'Complete' },
];

interface IdeaItemProps {
  idea: ArticleIdea;
  isSelected: boolean;
  onSelectIdea: (id: number) => void;
  references: IdeaReference[];
}

function IdeaItem({ idea, isSelected, onSelectIdea, references }: IdeaItemProps) {
  return (
    <IdeaHoverCard idea={idea} references={references}>
      <button
        className={cn(
          'w-full text-left p-3 rounded-md border transition-all duration-200',
          'bg-[var(--color-surface-soft)] border-[var(--color-border-subtle)]',
          'hover:border-[var(--color-border)] hover:shadow-sm',
          isSelected && 
            'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/20'
        )}
        onClick={() => onSelectIdea(idea.id)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-[var(--color-text-primary)]">{idea.title}</div>
          {idea.isPinned ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
              Pinned
            </span>
          ) : null}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] capitalize mt-1">
          {idea.status.replace('_', ' ')}
        </div>
      </button>
    </IdeaHoverCard>
  );
}

interface IdeasSidebarProps {
  selectedIdeaId: number | null;
  onSelectIdea: (id: number) => void;
}

export function IdeasSidebar({ selectedIdeaId, onSelectIdea }: IdeasSidebarProps) {
  const [status, setStatus] = useState<ArticleIdea['status'] | 'all'>('in_progress');
  const [search, setSearch] = useState('');
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
      onSelectIdea(idea.id);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to create idea');
    },
  });

  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId);

  return (
    <Card className="flex flex-col gap-3 overflow-hidden h-full min-h-0">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Ideas</h3>
        <Button
          variant="ghost"
          size="sm"
          className="border border-[var(--color-border)]"
          onClick={() => createIdea.mutate()}
          disabled={createIdea.isPending}
        >
          New
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs.Root value={status} onValueChange={(value) => setStatus(value as ArticleIdea['status'] | 'all')}>
        <Tabs.List className="flex items-center gap-1 bg-[var(--color-surface-soft)] p-1 rounded-md">
          {statusTabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="
                flex-1 px-3 py-1.5 text-xs font-medium rounded
                text-[var(--color-text-soft)]
                transition-all duration-200
                hover:text-[var(--color-text-primary)]
                data-[state=active]:bg-[var(--color-surface)]
                data-[state=active]:text-[var(--color-primary)]
                data-[state=active]:shadow-sm
              "
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <Input
        placeholder="Search ideas"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-[var(--color-surface-soft)]"
      />
      
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 pr-1">
          {ideas.length ? (
            ideas.map((idea) => (
              <IdeaItem
                key={idea.id}
                idea={idea}
                isSelected={selectedIdea?.id === idea.id}
                onSelectIdea={onSelectIdea}
                references={mockReferences[idea.id] || []}
              />
            ))
          ) : (
            <div className="text-[var(--color-text-muted)] text-sm p-4 text-center">
              {isFetching ? 'Loading ideas…' : 'No ideas yet.'}
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
