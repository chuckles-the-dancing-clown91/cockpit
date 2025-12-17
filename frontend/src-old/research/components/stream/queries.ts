/**
 * TanStack Query hooks for News Articles Stream
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type NewsArticle = {
  id: number;
  articleId?: string | null;
  title: string;
  excerpt?: string;
  url?: string;
  sourceName?: string;
  sourceDomain?: string;
  imageUrl?: string;
  sourceId?: string | null;
  tags: string[];
  country: string[];
  language?: string;
  category?: string;
  fetchedAt?: string;
  addedVia?: string;
  isStarred?: boolean;
  isDismissed?: boolean;
  isRead?: boolean;
  publishedAt?: string;
  addedToIdeasAt?: string;
  dismissedAt?: string;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Invoke Tauri command with retry logic and error handling
 */
async function invokeWithRetry<T>(
  command: string,
  args: Record<string, unknown> = {},
  options: {
    retries?: number;
    retryDelay?: number;
    fallback?: T;
  } = {}
): Promise<T> {
  const { retries = 3, retryDelay = 1000, fallback } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await invoke<T>(command, args);
    } catch (err) {
      lastError = err as Error;
      console.warn(
        `[invoke:${command}] attempt ${attempt + 1}/${retries} failed:`,
        err
      );

      // Don't retry on validation errors or 4xx errors
      if (
        lastError.message.includes('validation') ||
        lastError.message.includes('400') ||
        lastError.message.includes('404')
      ) {
        break;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // If we have a fallback, use it
  if (fallback !== undefined) {
    console.warn(`[invoke:${command}] using fallback after ${retries} attempts`);
    return fallback;
  }

  // Otherwise, throw the error
  throw lastError;
}

/**
 * Legacy function for backward compatibility
 */
async function invokeWithFallback<T>(
  command: string,
  args: Record<string, unknown> = {},
  fallback: T
): Promise<T> {
  return invokeWithRetry(command, args, { fallback });
}

// ============================================================================
// News Articles Stream Queries
// ============================================================================

export function useNewsArticles(params: {
  status?: 'all' | 'unread' | 'dismissed' | 'ideas';
  limit?: number;
  offset?: number;
  includeDismissed?: boolean;
  search?: string;
  sourceId?: number;
  starred?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'latest' | 'oldest' | 'starred';
}) {
  const {
    status = 'unread',
    limit = 100,
    offset = 0,
    includeDismissed = false,
    search,
    sourceId,
    starred,
    startDate,
    endDate,
    sortBy = 'latest',
  } = params;
  
  return useQuery({
    queryKey: ['newsArticles', status, limit, offset, includeDismissed, search, sourceId, starred, startDate, endDate, sortBy],
    queryFn: () =>
      invokeWithFallback(
        'list_news_articles',
        {
          status,
          limit,
          offset,
          include_dismissed: includeDismissed,
          search,
          source_id: sourceId,
          starred,
          start_date: startDate,
          end_date: endDate,
          sort_by: sortBy,
        },
        (() => {
          const mock: NewsArticle[] = [
            {
              id: 1,
              title: 'Mock: Latest AI policy update',
              excerpt: 'Placeholder article while backend is offline.',
              sourceName: 'mock',
              tags: ['policy'],
              publishedAt: new Date().toISOString(),
              isRead: false,
            },
            {
              id: 2,
              title: 'Mock: Funding round for AI startup',
              excerpt: 'Example item already reviewed into Ideas.',
              sourceName: 'mock',
              tags: ['funding'],
              publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              isRead: true,
              addedToIdeasAt: new Date().toISOString(),
            },
          ];
          switch (status) {
            case 'unread':
              return mock.filter((m) => !m.isRead && !m.addedToIdeasAt);
            case 'ideas':
              return mock.filter((m) => !!m.addedToIdeasAt);
            default:
              return mock;
          }
        })()
      ),
    staleTime: 1000 * 60,
  });
}

export function useNewsArticle(id?: number) {
  return useQuery({
    queryKey: ['newsArticle', id],
    queryFn: () => invoke<NewsArticle>('get_news_article', { id }),
    enabled: !!id,
  });
}

export function useToggleStarArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, starred }: { id: number; starred: boolean }) => {
      return await invoke('toggle_star_news_article', { id, starred });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsArticles'] });
      queryClient.invalidateQueries({ queryKey: ['newsArticle'] });
    },
  });
}

export function useDismissArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await invoke('dismiss_news_article', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsArticles'] });
      queryClient.invalidateQueries({ queryKey: ['newsArticle'] });
    },
  });
}
