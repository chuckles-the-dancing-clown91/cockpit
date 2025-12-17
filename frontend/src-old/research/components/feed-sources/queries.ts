/**
 * TanStack Query hooks for Feed Source Management
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type FeedSource = {
  id: number;
  name: string;
  sourceType: string;
  enabled: boolean;
  hasApiKey: boolean;
  config?: SourceConfig;
  taskId?: number;
  schedule?: string;
  lastSyncAt?: string;
  lastError?: string;
  articleCount: number;
  errorCount: number;
  apiCallsToday: number;
  apiQuotaDaily?: number;
  createdAt: string;
  updatedAt: string;
};

export type SourceConfig = {
  schedule?: string;
  newsdata?: NewsDataConfig;
  reddit?: RedditConfig;
  rss?: RssConfig;
};

export type NewsDataConfig = {
  language?: string;
  countries?: string[];
  categories?: string[];
  domains?: string[];
  excludeDomains?: string[];
  query?: string;
  maxPages?: number;
  useArchive?: boolean;
  fromDate?: string;
  toDate?: string;
};

export type RedditConfig = {
  subreddits?: string[];
  sortBy?: string;
  timeRange?: string;
};

export type RssConfig = {
  feedUrl: string;
  updateInterval?: number;
};

export type CreateFeedSourceInput = {
  name: string;
  sourceType: string;
  apiKey?: string;
  config?: SourceConfig;
  schedule?: string;
};

export type UpdateFeedSourceInput = {
  name?: string;
  enabled?: boolean;
  apiKey?: string;
  config?: SourceConfig;
  schedule?: string;
};

export type SyncSourceResult = {
  sourceId: number;
  sourceName: string;
  success: boolean;
  articlesAdded: number;
  error?: string;
};

export type SyncAllResult = {
  totalSources: number;
  successful: number;
  failed: number;
  totalArticles: number;
  results: SyncSourceResult[];
};

// ============================================================================
// Feed Source Queries
// ============================================================================

export function useListFeedSources() {
  return useQuery({
    queryKey: ['feedSources'],
    queryFn: () => invoke<FeedSource[]>('list_feed_sources'),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useGetFeedSource(sourceId: number) {
  return useQuery({
    queryKey: ['feedSource', sourceId],
    queryFn: () => invoke<FeedSource>('get_feed_source', { sourceId }),
    enabled: sourceId > 0,
  });
}

export function useCreateFeedSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFeedSourceInput) => {
      return await invoke<FeedSource>('create_feed_source', { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
    },
  });
}

export function useUpdateFeedSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, input }: { sourceId: number; input: UpdateFeedSourceInput }) => {
      return await invoke<FeedSource>('update_feed_source', { sourceId, input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
      queryClient.invalidateQueries({ queryKey: ['feedSource', variables.sourceId] });
    },
  });
}

export function useDeleteFeedSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: number) => {
      await invoke('delete_feed_source', { sourceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
    },
  });
}

export function useToggleFeedSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, enabled }: { sourceId: number; enabled: boolean }) => {
      return await invoke<FeedSource>('toggle_feed_source', { sourceId, enabled });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
      queryClient.invalidateQueries({ queryKey: ['feedSource', variables.sourceId] });
    },
  });
}

export function useTestFeedSourceConnection() {
  return useMutation({
    mutationFn: async (sourceId: number) => {
      return await invoke<{ success: boolean; message: string; quotaRemaining?: number }>(
        'test_feed_source_connection',
        { sourceId }
      );
    },
  });
}

export function useSyncFeedSourceNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: number) => {
      return await invoke<SyncSourceResult>('sync_feed_source_now', { sourceId });
    },
    onSuccess: (_, sourceId) => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
      queryClient.invalidateQueries({ queryKey: ['feedSource', sourceId] });
      queryClient.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });
}

export function useSyncAllFeedSources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await invoke<SyncAllResult>('sync_all_feed_sources');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedSources'] });
      queryClient.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });
}
