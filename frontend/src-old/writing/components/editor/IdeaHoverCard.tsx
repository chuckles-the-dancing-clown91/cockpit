import * as HoverCard from '@radix-ui/react-hover-card';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/core/lib/toast';
import { ExternalLink, ChevronDown, FileText } from 'lucide-react';
import type { ArticleIdea } from '../../../hooks/queries';

interface IdeaReference {
  id: number;
  type: 'article' | 'manual';
  title: string;
  url?: string;
  sourceId?: number;
  addedAt: string;
  notes?: string;
}

interface IdeaHoverCardProps {
  idea: ArticleIdea;
  references: IdeaReference[];
  children: React.ReactNode;
}

export function IdeaHoverCard({ idea, references, children }: IdeaHoverCardProps) {
  const queryClient = useQueryClient();

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        {children}
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          className="w-[400px] max-h-[500px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-4 z-50"
          sideOffset={8}
        >
          {/* Title & Status */}
          <div className="mb-3 pb-3 border-b border-[var(--color-border-subtle)]">
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{idea.title}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-soft)]">Status:</span>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger className="inline-flex items-center justify-between gap-2 px-3 py-1 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors w-[140px]">
                  <span className="capitalize">{idea.status.replace('_', ' ')}</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[140px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg p-1 z-50">
                    <DropdownMenu.RadioGroup 
                      value={idea.status}
                      onValueChange={async (value) => {
                        try {
                          await invoke('update_idea_metadata', {
                            id: idea.id,
                            input: { status: value, priority: idea.priority, is_pinned: idea.isPinned }
                          });
                          queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
                          toast.success('Status updated');
                        } catch (err) {
                          toast.error('Failed to update status');
                        }
                      }}
                    >
                      <DropdownMenu.RadioItem 
                        value="in_progress"
                        className="flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--color-text-primary)] rounded cursor-pointer outline-none hover:bg-[var(--color-surface-hover)] data-[highlighted]:bg-[var(--color-surface-hover)]"
                      >
                        <DropdownMenu.ItemIndicator>
                          <span className="text-[var(--color-primary)]">•</span>
                        </DropdownMenu.ItemIndicator>
                        In Progress
                      </DropdownMenu.RadioItem>
                      <DropdownMenu.RadioItem 
                        value="stalled"
                        className="flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--color-text-primary)] rounded cursor-pointer outline-none hover:bg-[var(--color-surface-hover)] data-[highlighted]:bg-[var(--color-surface-hover)]"
                      >
                        <DropdownMenu.ItemIndicator>
                          <span className="text-[var(--color-primary)]">•</span>
                        </DropdownMenu.ItemIndicator>
                        Stalled
                      </DropdownMenu.RadioItem>
                      <DropdownMenu.RadioItem 
                        value="complete"
                        className="flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--color-text-primary)] rounded cursor-pointer outline-none hover:bg-[var(--color-surface-hover)] data-[highlighted]:bg-[var(--color-surface-hover)]"
                      >
                        <DropdownMenu.ItemIndicator>
                          <span className="text-[var(--color-primary)]">•</span>
                        </DropdownMenu.ItemIndicator>
                        Complete
                      </DropdownMenu.RadioItem>
                    </DropdownMenu.RadioGroup>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
          
          {/* Notes */}
          {(idea.notes || idea.notesMarkdown) && (
            <div className="mb-3 pb-3 border-b border-[var(--color-border-subtle)]">
              <h5 className="text-xs font-semibold text-[var(--color-text-soft)] uppercase mb-2">Notes</h5>
              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                {idea.notes || idea.notesMarkdown}
              </p>
            </div>
          )}
          
          {/* References */}
          <div>
            <h5 className="text-xs font-semibold text-[var(--color-text-soft)] uppercase mb-2">
              References ({references.length})
            </h5>
            {references.length > 0 ? (
              <div className="space-y-2">
                {references.map((ref) => (
                  <div 
                    key={ref.id} 
                    className="text-sm p-2 rounded bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[var(--color-text-primary)] line-clamp-2">{ref.title}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {ref.notes && (
                          <Popover.Root modal={false}>
                            <Popover.Trigger asChild>
                              <button 
                                className="p-0.5 text-[var(--color-text-soft)] hover:text-[var(--color-primary)] transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-3 w-3" />
                              </button>
                            </Popover.Trigger>
                            <Popover.Portal>
                              <Popover.Content
                                side="right"
                                className="w-[300px] max-h-[400px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-3 z-[60]"
                                sideOffset={5}
                              >
                                <h6 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                                  Reference Notes
                                </h6>
                                <p className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap">
                                  {ref.notes}
                                </p>
                                <Popover.Arrow className="fill-[var(--color-border)]" />
                              </Popover.Content>
                            </Popover.Portal>
                          </Popover.Root>
                        )}
                        {ref.url && (
                          <a 
                            href={ref.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-0.5 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {ref.notes && (
                      <p className="text-xs text-[var(--color-text-soft)] mt-1 line-clamp-2 italic">
                        {ref.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-soft)]">
                        {ref.type}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(ref.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] italic">No references yet</p>
            )}
          </div>
          
          <HoverCard.Arrow className="fill-[var(--color-border)]" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
