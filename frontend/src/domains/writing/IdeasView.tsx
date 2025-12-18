import { useState } from 'react';
import { Flex, Text, Button, TextField, Select, Grid } from '@radix-ui/themes';
import { Plus, Search, Lightbulb } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/core/components/ui';
import { IdeaCard } from '@/features/ideas/components/IdeaCard';
import { IdeaDetailDialog } from '@/features/ideas/components/IdeaDetailDialog';
import { NewIdeaDialog } from '@/features/ideas/components/NewIdeaDialog';
import { useIdeas, useDeleteIdea, useArchiveIdea } from '@/features/ideas/hooks/useIdeas';
import { useDialog } from '@/core/providers/DialogProvider';
import type { Idea, IdeaStatus, IdeaPriority } from '@/shared/types';

type SortOption = 'dateAdded' | 'dateUpdated' | 'title';

/**
 * IdeasView - Main view for browsing and managing ideas
 * 
 * Features:
 * - Grid layout with IdeaCard components
 * - Filters: status, priority, search
 * - Sort options
 * - Create new idea
 * - Delete and archive actions
 * - Detail dialog for editing
 */
export function IdeasView() {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<IdeaPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [showNewDialog, setShowNewDialog] = useState(false);
  
  const { data: ideas, isLoading, error, refetch } = useIdeas();
  const deleteIdea = useDeleteIdea();
  const archiveIdea = useArchiveIdea();
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
  
  const handleDelete = async (id: number) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Idea',
      description: 'Are you sure you want to delete this idea? This action cannot be undone.',
    });
    
    if (confirmed) {
      await deleteIdea.mutateAsync(id);
    }
  };
  
  const handleArchive = async (id: number) => {
    const confirmed = await dialog.confirm({
      title: 'Archive Idea',
      description: 'This will remove the idea from your active list. You can restore it later from archived ideas.',
    });
    
    if (confirmed) {
      await archiveIdea.mutateAsync(id);
    }
  };
  
  return (
    <>
      <Flex direction="column" gap="4" style={{ height: '100%' }}>
        {/* Header */}
        <Flex justify="between" align="center">
          <div>
            <Text size="6" weight="bold" style={{ color: 'var(--color-text-primary)' }}>
              Ideas Library
            </Text>
            <Text size="2" style={{ color: 'var(--color-text-soft)', display: 'block', marginTop: '0.25rem' }}>
              {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
            </Text>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="w-4 h-4" />
            New Idea
          </Button>
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
          <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4" style={{ flex: 1, overflow: 'auto' }}>
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onClick={() => setSelectedIdea(idea)}
                onDelete={() => handleDelete(idea.id)}
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
