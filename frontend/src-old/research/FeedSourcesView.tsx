import { useState } from 'react';
import { RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { useListFeedSources, useSyncAllFeedSources } from '../hooks/queries';
import { FeedSourceCard } from '@/research/components/feed-sources/FeedSourceCard';
import { FeedSourceDialog } from '@/research/components/feed-sources/FeedSourceDialog';
import { useToast } from '@/core/hooks/use-toast';

export default function FeedSourcesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<number | undefined>();

  const { data: sources = [], isLoading, error } = useListFeedSources();
  const syncAll = useSyncAllFeedSources();
  const { toast } = useToast();

  const handleSyncAll = async () => {
    try {
      const result = await syncAll.mutateAsync();
      toast({
        title: 'Sync Complete',
        description: `Synced ${result.successful}/${result.totalSources} sources. ${result.totalArticles} articles added.`,
      });
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const handleCreateNew = () => {
    setEditingSourceId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (sourceId: number) => {
    setEditingSourceId(sourceId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSourceId(undefined);
  };

  // Filter sources
  const filteredSources = sources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || source.sourceType === filterType;
    return matchesSearch && matchesType;
  });

  // Group by source type for display
  const sourceTypes = Array.from(new Set(sources.map((s) => s.sourceType)));

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <h3 className="font-semibold">Error Loading Feed Sources</h3>
          <p className="text-sm mt-1">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Feed Sources</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your news feeds and content sources
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncAll}
              disabled={syncAll.isPending || sources.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncAll.isPending ? 'animate-spin' : ''}`} />
              Sync All ({sources.filter((s) => s.enabled).length})
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Source
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 border rounded-md bg-background appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {sourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {sources.length === 0 ? 'No Feed Sources Yet' : 'No Matching Sources'}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {sources.length === 0
                ? 'Get started by adding your first feed source. Configure NewsData.io, RSS feeds, Reddit, and more.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {sources.length === 0 && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Your First Source
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSources.map((source) => (
              <FeedSourceCard
                key={source.id}
                source={source}
                onEdit={() => handleEdit(source.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <FeedSourceDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        sourceId={editingSourceId}
      />
    </div>
  );
}
