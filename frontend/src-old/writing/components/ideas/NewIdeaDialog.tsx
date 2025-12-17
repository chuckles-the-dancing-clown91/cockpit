import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/core/lib/toast';
import { Input } from '@/core/components/ui/Input';
import { Button } from '@/core/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/core/components/ui/Select';

interface NewIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CreateIdeaInput {
  title: string;
  summary: string | null;
  status: string;
  target: string | null;
  tags: string[];
  priority: number;
}

export function NewIdeaDialog({ open, onOpenChange, onSuccess }: NewIdeaDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [priority, setPriority] = useState('0');
  const [target, setTarget] = useState('');

  const createIdea = useMutation({
    mutationFn: async (input: CreateIdeaInput) => {
      return await invoke('create_idea', { input });
    },
    onSuccess: () => {
      toast.success('Idea created');
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to create idea');
    },
  });

  const handleClose = () => {
    setTitle('');
    setSummary('');
    setStatus('in_progress');
    setPriority('0');
    setTarget('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    createIdea.mutate({
      title: title.trim(),
      summary: summary.trim() || null,
      status,
      target: target.trim() || null,
      tags: [],
      priority: parseInt(priority),
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
              Create New Idea
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

          {/* Form */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Title <span className="text-[var(--color-danger)]">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your idea?"
                className="w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Summary <span className="text-xs text-[var(--color-text-muted)]">(optional)</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of the idea..."
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
                Target Audience <span className="text-xs text-[var(--color-text-muted)]">(optional)</span>
              </label>
              <Input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Who is this for?"
                className="w-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleSubmit}
              disabled={createIdea.isPending || !title.trim()}
            >
              {createIdea.isPending ? 'Creating...' : 'Create Idea'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
