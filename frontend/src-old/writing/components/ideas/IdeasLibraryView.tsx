import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, CheckCircle, Circle, AlertCircle, Archive } from 'lucide-react';
import { useMode } from '@/core/context/ModeContext';
import { toast } from '@/core/lib/toast';
import { Card } from '@/core/components/ui/Card';
import { Button } from '@/core/components/ui/Button';
import { Input } from '@/core/components/ui/Input';
import { ConfirmDialog } from '@/core/components/ui/ConfirmDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/core/components/ui/Select';
import { NewIdeaDialog } from './NewIdeaDialog';
import { IdeaDetailModal } from './IdeaDetailModal';

interface Idea {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | 'in_progress' | 'stalled' | 'complete';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';

export default function IdeasLibraryView() {
  const { setView } = useMode();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ideaId: number | null }>({
    open: false,
    ideaId: null,
  });
  const [newIdeaOpen, setNewIdeaOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkArchiveDialog, setBulkArchiveDialog] = useState(false);

  // Fetch all ideas
  const { data: ideas = [], isLoading, refetch } = useQuery<Idea[]>({
    queryKey: ['ideas'],
    queryFn: async () => {
      const result = await invoke<Idea[]>('list_ideas');
      return result;
    },
  });

  const handleNewIdeaSuccess = () => {
    // Optionally navigate to editor view after creation
    setView('editor');
  };

  const handleIdeaClick = (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    setDetailModalOpen(true);
  };

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

  const handleDeleteClick = (id: number) => {
    setDeleteDialog({ open: true, ideaId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.ideaId) return;

    try {
      await invoke('archive_idea', { id: deleteDialog.ideaId });
      toast.success('Idea archived');
      refetch();
      setDeleteDialog({ open: false, ideaId: null });
    } catch (error) {
      toast.error(`Failed to archive: ${error}`);
    }
  };

  const toggleSelectIdea = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredIdeas.map(idea => idea.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(selectedIds.map(id => invoke('archive_idea', { id })));
      toast.success(`${selectedIds.length} idea${selectedIds.length > 1 ? 's' : ''} archived`);
      setSelectedIds([]);
      setBulkArchiveDialog(false);
      refetch();
    } catch (error) {
      toast.error(`Failed to archive: ${error}`);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await invoke('update_idea_metadata', {
        id,
        input: {
          title: null,
          description: null,
          status: newStatus,
          priority: null,
        }
      });
      toast.success('Status updated');
      refetch();
    } catch (error) {
      toast.error(`Failed to update: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-[var(--color-primary)]" />;
      case 'stalled':
        return <Circle className="h-4 w-4 text-[var(--color-warning)]" />;
      default:
        return <Circle className="h-4 w-4 text-[var(--color-text-muted)]" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-[var(--color-danger)]';
      case 'medium':
        return 'text-[var(--color-warning)]';
      case 'low':
        return 'text-[var(--color-text-soft)]';
      default:
        return 'text-[var(--color-text-muted)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[var(--color-text-soft)]">Loading ideas...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex-shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Ideas Library</h1>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] bg-opacity-10 rounded-md">
                <span className="text-sm text-[var(--color-text-primary)]">
                  {selectedIds.length} selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setBulkArchiveDialog(true)}
                  className="h-7 px-2"
                >
                  <Archive className="mr-1 h-3 w-3" />
                  Archive
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filteredIdeas.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={selectedIds.length === filteredIdeas.length ? clearSelection : selectAll}
              >
                {selectedIds.length === filteredIdeas.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            <Button 
              variant="solid" 
              size="sm"
              onClick={() => setNewIdeaOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Idea
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-soft)]" />
            <Input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="stalled">Stalled</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ideas List */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {filteredIdeas.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--color-text-soft)]">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No ideas match your filters'
              : 'No ideas yet. Create your first one!'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <Card
                key={idea.id}
                className={`group p-4 transition-all hover:shadow-[var(--shadow-card-elevated)] cursor-pointer ${
                  selectedIds.includes(idea.id) ? 'ring-2 ring-[var(--color-primary)]' : ''
                }`}
                onClick={() => handleIdeaClick(idea.id)}
              >
                {/* Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(idea.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectIdea(idea.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0 cursor-pointer"
                    />
                    {getStatusIcon(idea.status)}
                    <span className={`text-xs font-medium uppercase ${getPriorityColor(idea.priority)}`}>
                      {idea.priority}
                    </span>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(idea.id);
                      }}
                      className="rounded p-1 hover:bg-[var(--color-surface-hover)] transition-colors"
                      title="Archive"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--color-text-soft)]" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <h3 className="mb-2 font-semibold text-[var(--color-text-primary)]">{idea.title}</h3>
                {idea.description && (
                  <p className="mb-3 line-clamp-3 text-sm text-[var(--color-text-soft)]">{idea.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-[var(--color-text-soft)]">
                  <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                  <Select value={idea.status} onValueChange={(value) => handleStatusChange(idea.id, value)}>
                    <SelectTrigger className="w-[120px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="stalled">Stalled</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, ideaId: null })}
        onConfirm={handleDeleteConfirm}
        title="Archive Idea"
        description="Are you sure you want to archive this idea? You can restore it later from the Archive view."
        confirmText="Archive"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Bulk Archive Confirmation Dialog */}
      <ConfirmDialog
        open={bulkArchiveDialog}
        onOpenChange={setBulkArchiveDialog}
        onConfirm={handleBulkArchive}
        title={`Archive ${selectedIds.length} Idea${selectedIds.length > 1 ? 's' : ''}?`}
        description={`Are you sure you want to archive ${selectedIds.length} idea${selectedIds.length > 1 ? 's' : ''}? You can restore them later from the Archive view.`}
        confirmText="Archive All"
        cancelText="Cancel"
        variant="danger"
      />

      {/* New Idea Dialog */}
      <NewIdeaDialog
        open={newIdeaOpen}
        onOpenChange={setNewIdeaOpen}
        onSuccess={handleNewIdeaSuccess}
      />

      {/* Idea Detail Modal */}
      <IdeaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        ideaId={selectedIdeaId}
      />
    </div>
  );
}
