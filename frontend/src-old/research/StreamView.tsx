import { useState } from 'react';
import { Search, SlidersHorizontal, ExternalLink, Eye, Calendar } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useNewsArticles, useListFeedSources } from '../hooks/queries';
import StreamArticleCard from '@/research/components/stream/StreamArticleCard';
import { ScrollArea } from '@/core/components/ui/ScrollArea';

type FilterState = {
  sourceId: number | null;
  starred: boolean | null;
  dateRange: 'all' | 'today' | 'week' | 'month';
};

type SortOption = 'latest' | 'oldest' | 'starred';

export default function StreamView() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    sourceId: null,
    starred: null,
    dateRange: 'all',
  });
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showFilters, setShowFilters] = useState(false);

  const { data: sources } = useListFeedSources();
  
  const getDateRange = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        return { startDate: new Date(now.setHours(0, 0, 0, 0)).toISOString() };
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return { startDate: weekAgo.toISOString() };
      case 'month':
        const monthAgo = new Date(now.setDate(now.getDate() - 30));
        return { startDate: monthAgo.toISOString() };
      default:
        return {};
    }
  };
  
  const dateRange = getDateRange();
  
  const { data: articles, isLoading } = useNewsArticles({
    status: 'unread',
    limit: 100,
    offset: 0,
    includeDismissed: false,
    search: search || undefined,
    sourceId: filters.sourceId || undefined,
    starred: filters.starred !== null ? filters.starred : undefined,
    startDate: dateRange.startDate,
    sortBy: sortBy,
  });

  const activeFilterCount = [
    filters.sourceId !== null,
    filters.starred !== null,
    filters.dateRange !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface)] rounded-[var(--radius-input)] px-3 py-2 border border-[var(--color-border)]">
            <Search className="w-4 h-4 text-[var(--color-text-soft)]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)]"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)] border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-xs bg-white/20 rounded-full px-1.5 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Select.Root value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <Select.Trigger className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-[var(--color-surface)] rounded-[var(--radius-input)] border border-[var(--color-border)] shadow-[var(--shadow-card-elevated)] z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="latest" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                    <Select.ItemText>Latest First</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="oldest" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                    <Select.ItemText>Oldest First</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="starred" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                    <Select.ItemText>Starred First</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap gap-4">
              {/* Source Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-2">Source</label>
                <Select.Root value={filters.sourceId?.toString() || 'all'} onValueChange={(value) => setFilters({ ...filters, sourceId: value === 'all' ? null : parseInt(value) })}>
                  <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden bg-[var(--color-surface)] rounded-[var(--radius-input)] border border-[var(--color-border)] shadow-[var(--shadow-card-elevated)] max-h-[300px] z-50">
                      <Select.Viewport className="p-1">
                        <Select.Item value="all" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>All Sources</Select.ItemText>
                        </Select.Item>
                        {sources?.map((source) => (
                          <Select.Item key={source.id} value={source.id.toString()} className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                            <Select.ItemText>{source.name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Starred Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-2">Starred</label>
                <Select.Root value={filters.starred === null ? 'all' : filters.starred.toString()} onValueChange={(value) => setFilters({ ...filters, starred: value === 'all' ? null : value === 'true' })}>
                  <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden bg-[var(--color-surface)] rounded-[var(--radius-input)] border border-[var(--color-border)] shadow-[var(--shadow-card-elevated)] z-50">
                      <Select.Viewport className="p-1">
                        <Select.Item value="all" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>All Articles</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="true" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>Starred Only</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="false" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>Not Starred</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Date Range Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-2">Date Range</label>
                <Select.Root value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value as FilterState['dateRange'] })}>
                  <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden bg-[var(--color-surface)] rounded-[var(--radius-input)] border border-[var(--color-border)] shadow-[var(--shadow-card-elevated)] z-50">
                      <Select.Viewport className="p-1">
                        <Select.Item value="all" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>All Time</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="today" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>Today</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="week" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>Past Week</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="month" className="relative flex items-center px-3 py-2 text-sm text-[var(--color-text-primary)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] outline-none">
                          <Select.ItemText>Past Month</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <div className="flex items-end">
                  <button onClick={() => setFilters({ sourceId: null, starred: null, dateRange: 'all' })} className="px-3 py-2 text-sm text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] transition-colors">
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-6 text-xs text-[var(--color-text-soft)]">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {articles?.length || 0} articles
          </span>
          {filters.dateRange !== 'all' && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {filters.dateRange === 'today' && 'Today'}
              {filters.dateRange === 'week' && 'Past Week'}
              {filters.dateRange === 'month' && 'Past Month'}
            </span>
          )}
        </div>
      </div>

      {/* Articles Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[var(--color-text-soft)]">Loading articles...</div>
            </div>
          ) : articles && articles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {articles.map((article) => (
                <StreamArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              {activeFilterCount > 0 || search ? (
                <>
                  <SlidersHorizontal className="w-12 h-12 text-[var(--color-text-muted)] opacity-30" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">No articles found</p>
                    <p className="text-xs text-[var(--color-text-soft)] mt-1">Try adjusting your filters</p>
                  </div>
                </>
              ) : (
                <>
                  <ExternalLink className="w-12 h-12 text-[var(--color-text-muted)] opacity-30" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">No articles yet</p>
                    <p className="text-xs text-[var(--color-text-soft)] mt-1">Add a feed source and sync to see articles</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
