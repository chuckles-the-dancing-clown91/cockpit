import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink, Eye, Trash2, Plus, Save, Edit2, Check, X as XIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from '@/core/lib/toast';
import { Input } from '@/core/components/ui/Input';
import { Button } from '@/core/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/core/components/ui/Select';
import * as Tabs from '@radix-ui/react-tabs';
import { AddReferenceDialog } from '../editor/AddReferenceDialog';
import { ArticleViewerModal } from '../editor/ArticleViewerModal';
import { ConfirmDialog } from '@/core/components/ui/ConfirmDialog';
import { NotesEditor } from '../editor/NotesEditor';

interface IdeaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: number | null;
}

interface Idea {
  id: number;
  title: string;
  summary: string | null;
  status: string;
  target: string | null;
  notesMarkdown: string | null;
  priority: number;
  dateAdded: string;
  dateUpdated: string;
}

interface Reference {
  id: number;
  ideaId: number;
  referenceType: string;
  title: string | null;
  url: string | null;
  notesMarkdown: string | null;
  addedAt: string;
  updatedAt: string;
}

export function IdeaDetailModal({ open, onOpenChange, ideaId }: IdeaDetailModalProps) {
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [priority, setPriority] = useState('0');
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');
  
  const [addReferenceOpen, setAddReferenceOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<number | null>(null);
  const [deleteRefDialog, setDeleteRefDialog] = useState<{ open: boolean; refId: number | null }>({
    open: false,
    refId: null,
  });
  const [editingRefId, setEditingRefId] = useState<number | null>(null);
  const [editingRefNotes, setEditingRefNotes] = useState('');

  // Fetch idea details
  const { data: idea, isLoading: ideaLoading } = useQuery<Idea>({
    queryKey: ['idea', ideaId],
    queryFn: async () => {
      if (!ideaId) throw new Error('No idea ID');
      return await invoke('get_idea', { id: ideaId });
    },
    enabled: open && !!ideaId,
  });

  // Fetch references
  const { data: references = [] } = useQuery<Reference[]>({
    queryKey: ['idea_references', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      return await invoke('list_idea_references', { ideaId });
    },
    enabled: open && !!ideaId,
  });

  // Update form when idea data loads
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setSummary(idea.summary || '');
      setStatus(idea.status);
      setPriority(idea.priority.toString());
      setTarget(idea.target || '');
      setNotes(idea.notesMarkdown || '');
    }
  }, [idea]);

  // Listen for highlight-added events from article viewer
  useEffect(() => {
    if (!open || !ideaId) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<{ ideaId: number; text: string }>('highlight-added', (event) => {
        console.log('[IdeaDetailModal] Highlight added event received:', event.payload);
        
        // Only refresh if it's for this idea
        if (event.payload.ideaId === ideaId) {
          // Invalidate queries to refresh idea data
          queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
          toast.success('Highlight added to notes');
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [open, ideaId, queryClient]);

  // Update idea metadata
  const updateMetadata = useMutation({
    mutationFn: async () => {
      if (!ideaId) throw new Error('No idea ID');
      return await invoke('update_idea_metadata', {
        id: ideaId,
        input: {
          title: title.trim() || 'Untitled',
          summary: summary.trim() || null,
          status,
          target: target.trim() || null,
          priority: parseInt(priority),
        },
      });
    },
    onSuccess: () => {
      toast.success('Idea updated');
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to update idea');
    },
  });

  // Update notes
  const updateNotes = useMutation({
    mutationFn: async (notesMarkdown: string) => {
      if (!ideaId) throw new Error('No idea ID');
      return await invoke('update_idea_notes', {
        id: ideaId,
        input: { notesMarkdown },
      });
    },
    onSuccess: () => {
      toast.success('Notes saved');
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to save notes');
    },
  });

  // Delete reference
  const deleteReference = useMutation({
    mutationFn: async (referenceId: number) => {
      return await invoke('remove_reference', { referenceId });
    },
    onSuccess: () => {
      toast.success('Reference removed');
      queryClient.invalidateQueries({ queryKey: ['idea_references', ideaId] });
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to remove reference');
    },
  });

  // Update reference notes
  const updateReferenceNotes = useMutation({
    mutationFn: async ({ referenceId, notesMarkdown }: { referenceId: number; notesMarkdown: string }) => {
      return await invoke('update_reference_notes', {
        input: { referenceId, notesMarkdown },
      });
    },
    onSuccess: () => {
      toast.success('Reference notes saved');
      queryClient.invalidateQueries({ queryKey: ['idea_references', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] }); // Refresh parent idea's dateUpdated
      queryClient.invalidateQueries({ queryKey: ['ideas'] }); // Refresh list view
      setEditingRefId(null);
      setEditingRefNotes('');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to save reference notes');
    },
  });

  const handleSaveMetadata = () => {
    updateMetadata.mutate();
  };

  const handleSaveNotes = () => {
    updateNotes.mutate(notes);
  };

  const handleViewArticle = (url: string, referenceId: number) => {
    setSelectedArticleUrl(url);
    setSelectedReferenceId(referenceId);
    setArticleModalOpen(true);
  };

  const handleDeleteReference = (refId: number) => {
    setDeleteRefDialog({ open: true, refId });
  };

  const confirmDeleteReference = () => {
    if (deleteRefDialog.refId) {
      deleteReference.mutate(deleteRefDialog.refId);
    }
    setDeleteRefDialog({ open: false, refId: null });
  };

  const handleEditRefNotes = (refId: number, currentNotes: string | null) => {
    setEditingRefId(refId);
    setEditingRefNotes(currentNotes || '');
  };

  const handleSaveRefNotes = (refId: number) => {
    updateReferenceNotes.mutate({
      referenceId: refId,
      notesMarkdown: editingRefNotes.trim() || '',
    });
  };

  const handleCancelEditRefNotes = () => {
    setEditingRefId(null);
    setEditingRefNotes('');
  };

  if (!ideaId) return null;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(95vw,1200px)] h-[90vh] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {ideaLoading ? 'Loading...' : 'Edit Idea'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              {idea && (
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-soft)]">
                  <span>
                    Created: {new Date(idea.dateAdded).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-[var(--color-border)]">•</span>
                  <span>
                    Last modified: {new Date(idea.dateUpdated).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <Tabs.Root defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                <Tabs.List className="flex px-6">
                  <Tabs.Trigger
                    value="details"
                    className="px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
                  >
                    Details
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="notes"
                    className="px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
                  >
                    Notes
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="references"
                    className="px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
                  >
                    References ({references.length})
                  </Tabs.Trigger>
                </Tabs.List>
              </div>

              {/* Details Tab */}
              <Tabs.Content value="details" className="flex-1 overflow-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Title
                  </label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Idea title"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Summary
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-vertical text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Status
                    </label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="stalled">Stalled</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Priority
                    </label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Low</SelectItem>
                        <SelectItem value="1">Medium</SelectItem>
                        <SelectItem value="2">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Target Audience
                  </label>
                  <Input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Who is this for?"
                    className="w-full"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    variant="solid"
                    onClick={handleSaveMetadata}
                    disabled={updateMetadata.isPending}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMetadata.isPending ? 'Saving...' : 'Save Details'}
                  </Button>
                </div>
              </Tabs.Content>

              {/* Notes Tab */}
              <Tabs.Content value="notes" className="flex-1 overflow-auto p-6">
                <div className="h-full flex flex-col">
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Idea Notes
                  </label>
                  <NotesEditor
                    value={notes}
                    onChange={setNotes}
                    placeholder="Add notes about this idea..."
                    minHeight="400px"
                  />
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-[var(--color-text-muted)] italic">
                      Notes are for planning and research
                    </p>
                    <Button
                      variant="solid"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={updateNotes.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateNotes.isPending ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </Tabs.Content>

              {/* References Tab */}
              <Tabs.Content value="references" className="flex-1 overflow-auto p-6">
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
                  <div className="space-y-3">
                    {references.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
                      >
                        {/* Reference Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                              {ref.title || 'Untitled'}
                            </h4>
                            {ref.url && (
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--color-primary)] hover:underline truncate block mt-1"
                                title={ref.url}
                              >
                                {ref.url}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {ref.url && (
                              <>
                                <button
                                  onClick={() => handleViewArticle(ref.url!, ref.id)}
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
                                  title="Open in browser"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteReference(ref.id)}
                              className="p-1 text-[var(--color-text-soft)] hover:text-[var(--color-danger)] transition-colors"
                              title="Remove reference"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Reference Meta */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface-soft)] text-[var(--color-text-soft)] font-medium">
                            {ref.referenceType}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            Added: {new Date(ref.addedAt).toLocaleDateString()}
                          </span>
                          {ref.addedAt !== ref.updatedAt && (
                            <>
                              <span className="text-xs text-[var(--color-text-muted)]">•</span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                Modified: {new Date(ref.updatedAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Reference Notes */}
                        <div className="border-t border-[var(--color-border-subtle)] pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-[var(--color-text-soft)]">
                              Notes
                            </label>
                            {editingRefId !== ref.id && (
                              <button
                                onClick={() => handleEditRefNotes(ref.id, ref.notesMarkdown)}
                                className="p-1 text-[var(--color-text-soft)] hover:text-[var(--color-primary)] transition-colors"
                                title="Edit notes"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {editingRefId === ref.id ? (
                            <div className="space-y-2">
                              <NotesEditor
                                value={editingRefNotes}
                                onChange={setEditingRefNotes}
                                placeholder="Add notes about this reference..."
                                minHeight="150px"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveRefNotes(ref.id)}
                                  disabled={updateReferenceNotes.isPending}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                                >
                                  <Check className="h-3 w-3" />
                                  {updateReferenceNotes.isPending ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEditRefNotes}
                                  disabled={updateReferenceNotes.isPending}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                                >
                                  <XIcon className="h-3 w-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="text-sm text-[var(--color-text-soft)] prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: ref.notesMarkdown || '<span class="italic text-[var(--color-text-muted)]">No notes yet</span>' }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <p className="text-sm text-[var(--color-text-muted)] mb-2">No references yet</p>
                    <p className="text-xs text-[var(--color-text-soft)]">
                      Add articles or URLs to support your idea
                    </p>
                  </div>
                )}
              </Tabs.Content>
            </Tabs.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Reference Dialog */}
      <AddReferenceDialog
        open={addReferenceOpen}
        onOpenChange={setAddReferenceOpen}
        ideaId={ideaId}
      />

      {/* Article Viewer Modal */}
      <ArticleViewerModal
        isOpen={articleModalOpen}
        onClose={() => setArticleModalOpen(false)}
        articleUrl={selectedArticleUrl}
        ideaId={ideaId}
        referenceId={selectedReferenceId}
      />

      {/* Delete Reference Confirmation */}
      <ConfirmDialog
        open={deleteRefDialog.open}
        onOpenChange={(open) => setDeleteRefDialog({ open, refId: null })}
        onConfirm={confirmDeleteReference}
        title="Remove Reference"
        description="Are you sure you want to remove this reference? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
