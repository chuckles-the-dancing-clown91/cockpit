import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Save, ExternalLink, Maximize2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toast } from '@/core/lib/toast';
import { NotesEditor } from './NotesEditor';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleUrl: string | null;
  ideaId: number | null;
  referenceId: number | null;
}

export function ArticleViewerModal({ isOpen, onClose, articleUrl, ideaId, referenceId }: ArticleModalProps) {
  const [notes, setNotes] = useState('');
  const [articleWindowOpen, setArticleWindowOpen] = useState(false);
  const queryClient = useQueryClient();

  const openArticleWindow = async () => {
    if (!articleUrl) {
      toast.error('No article URL provided');
      return;
    }
    
    console.log('Opening article window:', articleUrl);
    
    try {
      const webview = new WebviewWindow(`article-${Date.now()}`, {
        url: articleUrl,
        title: 'Article Viewer',
        width: 1200,
        height: 900,
        resizable: true,
        center: true,
      });

      console.log('WebviewWindow instance created');

      webview.once('tauri://created', () => {
        console.log('Window created successfully');
        setArticleWindowOpen(true);
        toast.success('Article window opened');
      });

      webview.once('tauri://error', (e) => {
        console.error('Window creation error:', e);
        toast.error(`Failed to open article window: ${JSON.stringify(e)}`);
        setArticleWindowOpen(false);
      });

      webview.once('tauri://close-requested', () => {
        console.log('Window close requested');
        setArticleWindowOpen(false);
      });
    } catch (error) {
      console.error('Exception while creating window:', error);
      toast.error(`Error: ${error}`);
    }
  };

  // Fetch current reference notes
  const { data: references = [] } = useQuery({
    queryKey: ['idea_references', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      return await invoke<any[]>('list_idea_references', { ideaId });
    },
    enabled: isOpen && !!ideaId,
  });

  const currentReference = references.find(r => r.id === referenceId);

  // Update local notes when reference changes
  useEffect(() => {
    if (currentReference?.notesMarkdown) {
      setNotes(currentReference.notesMarkdown);
    } else {
      setNotes('');
    }
  }, [currentReference?.notesMarkdown]);

  // Reset article window state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setArticleWindowOpen(false);
    }
  }, [isOpen]);

  const saveNotes = useMutation({
    mutationFn: async (notesMarkdown: string) => {
      if (!referenceId) throw new Error('No reference ID');
      
      await invoke('update_reference_notes', {
        input: {
          referenceId,
          notesMarkdown: notesMarkdown.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success('Notes saved');
      queryClient.invalidateQueries({ queryKey: ['idea_references', ideaId] });
    },
    onError: (error) => {
      toast.error(`Failed to save notes: ${error}`);
    },
  });

  const handleSaveNotes = () => {
    saveNotes.mutate(notes);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(800px,90vw)] h-[85vh] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <div className="flex-1">
              <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Research Notes
              </Dialog.Title>
              {articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:underline truncate block mt-1"
                  title={articleUrl}
                >
                  {articleUrl}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              {articleUrl && (
                <button
                  onClick={openArticleWindow}
                  disabled={articleWindowOpen}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-border)] disabled:opacity-50 transition-colors"
                  title="Open article in separate window"
                >
                  <Maximize2 className="h-4 w-4" />
                  {articleWindowOpen ? 'Article Open' : 'Open Article'}
                </button>
              )}
              <Dialog.Close asChild>
                <button className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Notes panel */}
          <div className="flex-1 flex flex-col bg-[var(--color-surface)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Notes
              </h3>
              <button
                onClick={handleSaveNotes}
                disabled={saveNotes.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-3 w-3" />
                {saveNotes.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <NotesEditor
                value={notes}
                onChange={setNotes}
                placeholder="Add notes about this article..."
                minHeight="100%"
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/*
 * Note: We previously tried injecting context menu scripts into external WebviewWindows,
 * but cross-origin security policies prevent script injection into external sites.
 * 
 * See docs/context-menu-limitation.md for details.
 * 
 * Current approach: Two-pane dialog with iframe + manual note-taking panel.
 */
