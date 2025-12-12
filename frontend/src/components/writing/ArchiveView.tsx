import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';
import { Search, RotateCcw, Trash2, Calendar, FileText } from 'lucide-react';
import { notify } from '../../lib/notifications';

interface ArchivedIdea {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export default function ArchiveView() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch archived ideas (status = 'done')
  const { data: ideas = [], isLoading, refetch } = useQuery<ArchivedIdea[]>({
    queryKey: ['archived-ideas'],
    queryFn: async () => {
      const allIdeas = await invoke<ArchivedIdea[]>('list_ideas');
      // Filter for completed ideas
      return allIdeas.filter((idea) => idea.status === 'done');
    },
  });

  // Filter by search
  const filteredIdeas = ideas.filter((idea) => {
    return (
      searchQuery === '' ||
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleRestore = async (id: number) => {
    try {
      await invoke('update_idea', {
        id,
        title: null,
        description: null,
        status: 'backlog',
        priority: null,
      });
      notify.success('Idea restored to backlog');
      refetch();
    } catch (error) {
      notify.error(`Failed to restore: ${error}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this idea? This cannot be undone.')) return;

    try {
      await invoke('delete_idea', { id });
      notify.success('Idea permanently deleted');
      refetch();
    } catch (error) {
      notify.error(`Failed to delete: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading archive...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Archive</h1>
            <p className="text-sm text-muted-foreground">
              {ideas.length} completed {ideas.length === 1 ? 'idea' : 'ideas'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archived ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Archive List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredIdeas.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {searchQuery
              ? 'No archived ideas match your search'
              : 'No completed ideas yet. Archive ideas by marking them as done.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  {/* Content */}
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">{idea.title}</h3>
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Done
                      </span>
                    </div>

                    {idea.description && (
                      <p className="mb-3 text-sm text-muted-foreground">{idea.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        Created {new Date(idea.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Completed {new Date(idea.updated_at).toLocaleDateString()}
                      </span>
                      <span className="capitalize text-muted-foreground">
                        Priority: {idea.priority}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(idea.id)}
                      className="rounded p-2 hover:bg-accent"
                      title="Restore to backlog"
                    >
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="rounded p-2 hover:bg-destructive/10"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
