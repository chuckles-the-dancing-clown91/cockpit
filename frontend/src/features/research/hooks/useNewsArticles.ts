import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dismissNewsArticle,
  listNewsArticles,
  markNewsArticleRead,
  syncAllFeedSources,
  syncFeedSourceNow,
  toggleStarNewsArticle,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';
import type { NewsArticle } from '@/shared/types';

function errorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  const anyErr = err as any;
  if (anyErr && typeof anyErr.message === 'string') return anyErr.message;
  return String(err);
}

export type NewsArticleFilters = {
  sourceId?: number | null;
  search?: string | null;
  onlyStarred?: boolean | null;
  includeDismissed?: boolean | null;
  limit?: number;
  offset?: number;
};

export function useNewsArticles(filters?: NewsArticleFilters) {
  return useQuery<NewsArticle[]>({
    queryKey: queryKeys.articles.list(filters || {}),
    queryFn: () =>
      listNewsArticles({
        search: filters?.search ?? undefined,
        sourceId: filters?.sourceId ?? undefined,
        starred: filters?.onlyStarred ?? undefined,
        includeDismissed: filters?.includeDismissed ?? undefined,
        limit: filters?.limit ?? 100,
        offset: filters?.offset ?? 0,
      }),
    staleTime: 10_000,
  });
}

export function useNewsArticleActions() {
  const qc = useQueryClient();

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.articles.lists() });
    await qc.invalidateQueries({ queryKey: queryKeys.articles.details() });
  };

  const toggleStar = useMutation({
    mutationFn: (p: { articleId: number; starred: boolean }) =>
      toggleStarNewsArticle(p.articleId, p.starred),
    onSuccess: invalidate,
    onError: (err) => toast.error('Failed to update star', errorMessage(err)),
  });

  const markRead = useMutation({
    mutationFn: (articleId: number) => markNewsArticleRead(articleId),
    onSuccess: invalidate,
    onError: (err) => toast.error('Failed to mark read', errorMessage(err)),
  });

  const dismiss = useMutation({
    mutationFn: (articleId: number) => dismissNewsArticle(articleId),
    onSuccess: invalidate,
    onError: (err) => toast.error('Failed to dismiss', errorMessage(err)),
  });

  const syncNow = useMutation({
    mutationFn: async (sourceId?: number | null) => {
      if (sourceId) {
        return await syncFeedSourceNow(sourceId);
      }
      return await syncAllFeedSources();
    },
    onSuccess: async () => {
      toast.success('Sync started');
      await invalidate();
    },
    onError: (err) => toast.error('Failed to sync', errorMessage(err)),
  });

  return { toggleStar, markRead, dismiss, syncNow };
}
