import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Accordion from '@radix-ui/react-accordion';
import { ExternalLink, FileText, ChevronDown, Eye, Plus } from 'lucide-react';
import { ArticleViewerModal } from './ArticleViewerModal';
import { AddReferenceDialog } from './AddReferenceDialog';
import { Button } from '@/core/components/ui/Button';
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

interface RightSidebarProps {
  idea: ArticleIdea | null;
  references: IdeaReference[];
  onUpdateNotes: (notes: string) => void;
}

export function RightSidebar({ idea, references, onUpdateNotes }: RightSidebarProps) {
  const [notes, setNotes] = useState(idea?.notesMarkdown || '');
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const [addReferenceOpen, setAddReferenceOpen] = useState(false);

  const handleNotesBlur = () => {
    if (notes !== (idea?.notesMarkdown || '')) {
      onUpdateNotes(notes);
    }
  };

  const handleViewArticle = (url: string) => {
    setSelectedArticleUrl(url);
    setArticleModalOpen(true);
  };

  // Handle adding selected text to notes
  const handleAddToNotes = (text: string) => {
    const newNotes = notes 
      ? `${notes}\n\n---\n\n${text}` 
      : text;
    setNotes(newNotes);
    onUpdateNotes(newNotes);
  };

  if (!idea) {
    return (
      <div className="flex flex-col h-full border-l border-[var(--color-border)] bg-[var(--color-surface-soft)]">
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-[var(--color-text-muted)]">Select an idea</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-[var(--color-border)] bg-[var(--color-surface-soft)]">
      <Tabs.Root defaultValue="notes" className="flex flex-col h-full">
        <Tabs.List className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <Tabs.Trigger
            value="notes"
            className="flex-1 px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
          >
            Notes
          </Tabs.Trigger>
          <Tabs.Trigger
            value="references"
            className="flex-1 px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
          >
            References ({references.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="notes" className="flex-1 overflow-auto p-4">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-[var(--color-text-soft)] uppercase mb-2">
              Idea Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes about this idea..."
              className="w-full min-h-[200px] px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-vertical font-mono text-sm"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] italic">
            Notes are for planning and research. Use the editor for your article content.
          </p>
        </Tabs.Content>

        <Tabs.Content value="references" className="flex-1 overflow-auto p-4">
          {/* Add Reference Button */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddReferenceOpen(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reference
            </Button>
          </div>

          {references.length > 0 ? (
            <Accordion.Root type="multiple" className="space-y-3">
              {references.map((ref) => (
                <Accordion.Item
                  key={ref.id}
                  value={`ref-${ref.id}`}
                  className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden"
                >
                  <Accordion.Header>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-[var(--color-text-primary)] leading-snug flex-1">
                          {ref.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {ref.url && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewArticle(ref.url!);
                                }}
                                className="p-1 text-[var(--color-text-soft)] hover:text-[var(--color-primary)] transition-colors"
                                title="View in modal"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in browser"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface-soft)] text-[var(--color-text-soft)] font-medium">
                            {ref.type}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {new Date(ref.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {ref.notes && (
                          <Accordion.Trigger className="p-1 text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] transition-colors">
                            <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                          </Accordion.Trigger>
                        )}
                      </div>
                    </div>
                  </Accordion.Header>
                  {ref.notes && (
                    <Accordion.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                      <div className="px-3 pb-3 pt-0">
                        <div className="p-3 rounded bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-3 w-3 text-[var(--color-text-soft)]" />
                            <span className="text-xs font-semibold text-[var(--color-text-soft)] uppercase">
                              Notes
                            </span>
                          </div>
                          <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                            {ref.notes}
                          </p>
                        </div>
                      </div>
                    </Accordion.Content>
                  )}
                </Accordion.Item>
              ))}
            </Accordion.Root>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">No references yet</p>
              <p className="text-xs text-[var(--color-text-soft)]">
                Add references from news articles or manually to cite in your writing
              </p>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Article Viewer Modal */}
      <ArticleViewerModal
        isOpen={articleModalOpen}
        onClose={() => setArticleModalOpen(false)}
        articleUrl={selectedArticleUrl}
        ideaId={idea?.id || null}
        referenceId={null}
      />

      {/* Add Reference Dialog */}
      <AddReferenceDialog
        open={addReferenceOpen}
        onOpenChange={setAddReferenceOpen}
        ideaId={idea?.id || 0}
      />
    </div>
  );
}
