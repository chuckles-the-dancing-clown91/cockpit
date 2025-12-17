/**
 * TanStack Query hooks for Article Ideas
 */

import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type IdeaStatus = 'in_progress' | 'stalled' | 'complete';

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

export type ArticleIdea = {
  id: number;
  title: string;
  status: IdeaStatus;
  priority: number;
  isPinned: boolean;
  articleMarkdown: string;
  notesMarkdown: string;
  notes?: string;
  sourceUrl?: string;
  newsArticleId?: number | null;
  newsArticle?: NewsArticle;
  createdAt?: string;
  dateRemoved?: string | null;
};

export type Idea = {
  id: number;
  title: string;
  summary?: string | null;
  status: 'in_progress' | 'stalled' | 'complete';
  newsArticleId?: number | null;
  target?: string | null;
  tags: string[];
  notesMarkdown?: string | null;
  articleTitle?: string | null;
  articleMarkdown?: string | null;
  dateAdded?: string;
  dateUpdated?: string | null;
  dateCompleted?: string | null;
  dateRemoved?: string | null;
  priority?: number | null;
  isPinned?: boolean;
};

export type CreateArticleIdeaInput = {
  title: string;
  summary?: string;
  newsArticleId?: number;
  target?: string;
  tags?: string[];
  priority?: number;
};

export type UpdateArticleIdeaMetadataInput = {
  id: number;
  title?: string;
  summary?: string | null;
  status?: ArticleIdea['status'];
  newsArticleId?: number | null;
  target?: string | null;
  tags?: string[];
  priority?: number | null;
  isPinned?: boolean;
};

export type UpdateArticleIdeaNotesInput = {
  id: number;
  notesMarkdown: string;
};

export type UpdateArticleIdeaArticleInput = {
  id: number;
  articleTitle?: string | null;
  articleMarkdown?: string | null;
  status: 'inbox' | 'planned' | 'drafting' | 'archived';
  priority?: 'low' | 'normal' | 'high';
  isPinned?: boolean;
  articleMarkdown?: string;
  notesMarkdown?: string;
  notes?: string;
  sourceUrl?: string;
  newsArticleId?: number | null;
  newsArticle?: NewsArticle;
  createdAt?: string;
  dateRemoved?: string | null;
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

function normalizeIdea(raw: any): ArticleIdea {
  return {
    id: raw.id,
    title: raw.title ?? 'Untitled idea',
    status: (raw.status as IdeaStatus) ?? 'in_progress',
    priority: Number(raw.priority ?? raw.idea_priority ?? 0),
    isPinned: raw.is_pinned ?? raw.pinned ?? false,
    articleMarkdown: raw.article_markdown ?? raw.articleMarkdown ?? '',
    notesMarkdown: raw.notes_markdown ?? raw.notesMarkdown ?? raw.notes ?? '',
    notes: raw.notes ?? raw.notes_markdown ?? '',
    sourceUrl: raw.source_url ?? raw.sourceUrl,
    newsArticleId: raw.news_article_id ?? raw.newsArticleId ?? null,
    newsArticle: raw.news_article ?? raw.newsArticle,
    createdAt: raw.created_at ?? raw.createdAt,
    dateRemoved: raw.date_removed ?? raw.dateRemoved ?? null,
  };
}

// ============================================================================
// Article Ideas Queries
// ============================================================================

export function useArticleIdeas(params: { status?: ArticleIdea['status'] | 'all'; search?: string } = {}) {
  const { status, search } = params;
  const normalizedStatus = status && status !== 'all' ? status : undefined;
  return useQuery({
    queryKey: ['articleIdeas', normalizedStatus, search],
    queryFn: () =>
      invokeWithFallback(
        'list_ideas',
        { status: normalizedStatus, search },
        [
          {
            id: 1,
            title: 'Build a moderator autopilot',
            notes_markdown: 'Blend Reddit mod actions with calendar events',
            status: 'in_progress',
            article_markdown: '# Draft outline\n- automation\n- safety nets',
            news_article_id: 42,
            news_article: {
              id: 42,
              title: 'Mock reference article',
              sourceName: 'mock.news',
              url: 'https://example.com/mock',
              tags: ['ai'],
              country: [],
            },
            created_at: new Date().toISOString(),
          },
        ] as ArticleIdea[]
      ).then((ideas) => ideas.map(normalizeIdea)),
  });
}

export function useIdea(id?: number) {
  return useQuery({
    queryKey: ['idea', id],
    queryFn: () => invoke<Idea>('get_idea', { id }),
    enabled: !!id,
  });
}
