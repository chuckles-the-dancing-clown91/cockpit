import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Plus, Trash2, Edit, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { notify } from '../../lib/notifications';

interface Idea {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'backlog' | 'in_progress' | 'done';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';

export function IdeasLibraryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  // Fetch all ideas
  const { data: ideas = [], isLoading, refetch } = useQuery<Idea[]>({
    queryKey: ['ideas'],
    queryFn: async () => {
      const result = await invoke<Idea[]>('list_ideas');
      return result;
    },
  });

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      searchQuery === '' ||
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || idea.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || idea.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this idea?')) return;

    try {
      await invoke('delete_idea', { id });
      notify.success('Idea deleted');
      refetch();
    } catch (error) {
      notify.error(`Failed to delete: ${error}`);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await invoke('update_idea', {
        id,
        title: null,
        description: null,
        status: newStatus,
        priority: null,
      });
      notify.success('Status updated');
      refetch();
    } catch (error) {
      notify.error(`Failed to update: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-gray-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading ideas...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ideas Library</h1>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 inline-block h-4 w-4" />
            New Idea
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Ideas List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredIdeas.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No ideas match your filters'
              : 'No ideas yet. Create your first one!'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(idea.status)}
                    <span className={`text-xs font-medium uppercase ${getPriorityColor(idea.priority)}`}>
                      {idea.priority}
                    </span>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="rounded p-1 hover:bg-accent"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <h3 className="mb-2 font-semibold text-foreground">{idea.title}</h3>
                {idea.description && (
                  <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{idea.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                  <select
                    value={idea.status}
                    onChange={(e) => handleStatusChange(idea.id, e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
