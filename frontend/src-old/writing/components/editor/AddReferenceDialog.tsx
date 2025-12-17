import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Link as LinkIcon, Newspaper } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/core/lib/toast';
import { Input } from '@/core/components/ui/Input';
import { Button } from '@/core/components/ui/Button';
import * as Tabs from '@radix-ui/react-tabs';

interface AddReferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: number;
}

interface ReferenceInput {
  ideaId: number;
  referenceType: string;
  newsArticleId?: number;
  title?: string;
  url?: string;
  description?: string;
  sourceId?: number;
}

export function AddReferenceDialog({ open, onOpenChange, ideaId }: AddReferenceDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'url' | 'feed'>('url');
  
  // Manual URL form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const addReferenceMutation = useMutation({
    mutationFn: async (input: ReferenceInput) => {
      return await invoke('add_reference_to_idea', { input });
    },
    onSuccess: () => {
      toast.success('Reference added');
      queryClient.invalidateQueries({ queryKey: ['idea_references', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to add reference');
    },
  });

  const handleClose = () => {
    setTitle('');
    setUrl('');
    setDescription('');
    setTab('url');
    onOpenChange(false);
  };

  const handleAddManualUrl = () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }

    addReferenceMutation.mutate({
      ideaId,
      referenceType: 'manual',
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100%-2rem)] max-h-[90vh] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <Dialog.Title className="text-xl font-semibold text-[var(--color-text-primary)]">
              Add Reference
            </Dialog.Title>
            <Dialog.Close asChild>
              <button 
                className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={tab} onValueChange={(value) => setTab(value as 'url' | 'feed')} className="flex-1 flex flex-col">
            <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
              <Tabs.List className="flex px-6">
                <Tabs.Trigger
                  value="url"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                  Manual URL
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="feed"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] transition-colors"
                >
                  <Newspaper className="h-4 w-4" />
                  From Feed
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            {/* Manual URL Tab */}
            <Tabs.Content value="url" className="flex-1 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Title <span className="text-[var(--color-danger)]">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article or resource title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  URL <span className="text-[var(--color-danger)]">*</span>
                </label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Description <span className="text-xs text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the resource..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-vertical text-sm"
                />
              </div>
            </Tabs.Content>

            {/* From Feed Tab */}
            <Tabs.Content value="feed" className="flex-1 p-6">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Newspaper className="h-12 w-12 text-[var(--color-text-muted)] mb-4" />
                <p className="text-sm text-[var(--color-text-soft)] mb-2">
                  This feature will let you browse and attach articles from your news feed.
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Coming soon!
                </p>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleAddManualUrl}
              disabled={addReferenceMutation.isPending || !title.trim() || !url.trim()}
            >
              {addReferenceMutation.isPending ? 'Adding...' : 'Add Reference'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
