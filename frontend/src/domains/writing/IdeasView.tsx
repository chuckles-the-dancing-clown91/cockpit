import { useState } from 'react';
import { Flex, Text, Button, TextField, Select, Grid, Badge } from '@radix-ui/themes';
import { Plus, Search, Lightbulb, Archive } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/core/components/ui';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import { IdeaDetailDialog } from '@/features/ideas/components/IdeaDetailDialog';
import { NewIdeaDialog } from '@/features/ideas/components/NewIdeaDialog';
import { useIdeas, useArchiveIdea, useUpdateIdea } from '@/features/ideas/hooks/useIdeas';
import { useDialog } from '@/core/providers/DialogProvider';
import type { Idea, IdeaStatus, IdeaPriority } from '@/shared/types';
import { toast } from '@/core/lib/toast';

type SortOption = 'dateAdded' | 'dateUpdated' | 'title';

/**
 * IdeasView - Main view for browsing and managing ideas
 * 
 * Features:
 * - Grid layout with IdeaCard components
 * - Multi-select with bulk operations
 * - Filters: status, priority, search
 * - Sort options
 * - Create new idea
 * - Archive actions (single and bulk)
 * - Detail dialog for editing
 */
export function IdeasView() {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<IdeaPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const { data: ideas, isLoading, error, refetch } = useIdeas();
  const archiveIdea = useArchiveIdea();
  const updateIdea = useUpdateIdea();
  const dialog = useDialog();
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!ideas) return null;
  
  // Filter and sort ideas
  let filteredIdeas = ideas.filter(idea => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = idea.title.toLowerCase().includes(query);
      const matchesSummary = idea.summary?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesSummary) return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && idea.status !== statusFilter) return false;
    
    // Filter by priority
    if (priorityFilter !== 'all' && idea.priority !== priorityFilter) return false;
    
    return true;
  });
  
  // Sort ideas
  filteredIdeas = [...filteredIdeas].sort((a, b) => {
    switch (sortBy) {
      case 'dateAdded':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case 'dateUpdated':
        return new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  
  const handleArchive = async (id: number) => {
    const confirmed = await dialog.confirm({
      title: 'Archive Idea',
      description: 'This will remove the idea from your active list. You can restore it later from archived ideas.',
    });
    
    if (confirmed) {
      await archiveIdea.mutateAsync(id);
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
    
    const confirmed = await dialog.confirm({
      title: 'Archive Selected Ideas',
      description: `Archive ${selectedIds.length} idea${selectedIds.length > 1 ? 's' : ''}? You can restore them later from archived ideas.`,
    });
    
    if (confirmed) {
      try {
        await Promise.all(selectedIds.map(id => archiveIdea.mutateAsync(id)));
        toast.success(`${selectedIds.length} idea${selectedIds.length > 1 ? 's' : ''} archived`);
        setSelectedIds([]);
      } catch (error) {
        toast.error('Failed to archive some ideas');
      }
    }
  };
  
  const handleStatusChange = async (id: number, status: IdeaStatus) => {
    await updateIdea.mutateAsync({
      id,
      status,
    });
  };
  
  return (
    <>
      <Flex direction="column" gap="4" style={{ height: '100%' }}>
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <div>
              <Text size="6" weight="bold" style={{ color: 'var(--color-text-primary)' }}>
                Ideas Library
              </Text>
              <Text size="2" style={{ color: 'var(--color-text-soft)', display: 'block', marginTop: '0.25rem' }}>
                {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
              </Text>
            </div>
            {selectedIds.length > 0 && (
              <Flex align="center" gap="2" p="2" style={{ backgroundColor: 'var(--color-primary-alpha)', borderRadius: 'var(--radius-2)' }}>
                <Badge size="2" color="blue">
                  {selectedIds.length} selected
                </Badge>
                <Button size="1" variant="ghost" onClick={handleBulkArchive}>
                  <Archive className="w-3 h-3" />
                  Archive
                </Button>
                <Button size="1" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </Flex>
            )}
          </Flex>
          <Flex align="center" gap="2">
            {filteredIdeas.length > 0 && (
              <Button
                size="2"
                variant="ghost"
                onClick={selectedIds.length === filteredIdeas.length ? clearSelection : selectAll}
              >
                {selectedIds.length === filteredIdeas.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4" />
              New Idea
            </Button>
          </Flex>
        </Flex>
        
        {/* Filters */}
        <Flex gap="3" wrap="wrap">
          <TextField.Root
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          >
            <TextField.Slot>
              <Search className="w-4 h-4" />
            </TextField.Slot>
          </TextField.Root>
          
          <Select.Root value={statusFilter} onValueChange={(v) => setStatusFilter(v as IdeaStatus | 'all')}>
            <Select.Trigger style={{ width: '150px' }} />
            <Select.Content>
              <Select.Item value="all">All Statuses</Select.Item>
              <Select.Item value="in_progress">In Progress</Select.Item>
              <Select.Item value="stalled">Stalled</Select.Item>
              <Select.Item value="complete">Complete</Select.Item>
            </Select.Content>
          </Select.Root>
          
          <Select.Root value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as IdeaPriority | 'all')}>
            <Select.Trigger style={{ width: '150px' }} />
            <Select.Content>
              <Select.Item value="all">All Priorities</Select.Item>
              <Select.Item value="low">Low</Select.Item>
              <Select.Item value="medium">Medium</Select.Item>
              <Select.Item value="high">High</Select.Item>
            </Select.Content>
          </Select.Root>
          
          <Select.Root value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <Select.Trigger style={{ width: '150px' }} />
            <Select.Content>
              <Select.Item value="dateAdded">Date Added</Select.Item>
              <Select.Item value="dateUpdated">Last Updated</Select.Item>
              <Select.Item value="title">Title</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
        
        {/* Ideas Grid */}
        {filteredIdeas.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No ideas found"
            description={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first idea to get started'
            }
            action={
              !searchQuery && statusFilter === 'all' && priorityFilter === 'all'
                ? {
                    label: 'New Idea',
                    onClick: () => setShowNewDialog(true),
                    icon: Plus,
                  }
                : undefined
            }
          />
        ) : (
          <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                selected={selectedIds.includes(idea.id)}
                onToggleSelect={(id) => toggleSelectIdea(id)}
                onStatusChange={handleStatusChange}
                onClick={() => {
                  console.log('Setting selected idea:', idea.title);
                  setSelectedIdea(idea);
                }}
                onArchive={() => handleArchive(idea.id)}
              />
            ))}
          </Grid>
        )}
      </Flex>
      
      {/* Detail Dialog */}
      <IdeaDetailDialog
        idea={selectedIdea}
        open={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
      />
      
      {/* New Idea Dialog */}
      <NewIdeaDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
      />
    </>
  );
}
