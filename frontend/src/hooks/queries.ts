import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type FeedItem = {
  id: string;
  provider: string;
  title: string;
  summary?: string;
  url?: string;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
};

export type IdeaStatus = 'in_progress' | 'stalled' | 'complete';

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

export type Job = {
  id: number;
  job_type: string;
  payload: string;
  status: string;
  run_at?: string;
  last_run_at?: string;
};

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

export type NewsSettings = {
  user_id: number;
  provider: string;
  has_api_key: boolean;
  language?: string | null;
  languages: string[];
  countries: string[];
  categories: string[];
  sources: string[];
  query?: string;
  keywords_in_title?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  max_stored: number;
  max_articles: number;
  daily_call_limit: number;
  calls_today: number;
  last_reset_date?: string;
  last_synced_at?: string;
};

export type SaveNewsSettingsInput = {
  api_key?: string;
  language?: string;
  languages?: string[];
  countries?: string[];
  categories?: string[];
  sources?: string[];
  query?: string;
  keywords_in_title?: string;
  from_date?: string;
  to_date?: string;
  max_stored?: number;
  max_articles?: number;
  daily_call_limit?: number;
};

export type NewsSource = {
  id: number;
  source_id: string;
  name: string;
  url?: string | null;
  country?: string | null;
  language?: string | null;
  category: string[];
  is_active: boolean;
  is_muted: boolean;
};

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

export function useSystemUser() {
  return useQuery({
    queryKey: ['systemUser'],
    queryFn: () => invokeWithFallback('get_system_user', {}, 'Pilot'),
  });
}

export function useMixedFeed(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['mixedFeed', params],
    queryFn: () =>
      invokeWithFallback(
        'get_mixed_feed',
        params,
        [
          {
            id: 'mock-1',
            provider: 'reddit',
            title: 'Reddit systems check ready',
            summary: 'Quick status digest from your favorite subs.',
            url: '#',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-2',
            provider: 'news',
            title: 'SpaceX launches another batch of satellites',
            summary: 'Launch manifest updated for Q4.',
            url: '#',
            createdAt: new Date().toISOString(),
          },
        ] as FeedItem[]
      ),
  });
}

export function useUpcomingEvents(horizonMinutes = 480) {
  return useQuery({
    queryKey: ['upcomingEvents', horizonMinutes],
    queryFn: () =>
      invokeWithFallback(
        'get_upcoming_events',
        { horizonMinutes },
        [
          {
            id: 'evt-1',
            title: 'Mission planning sync',
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            location: 'Ops room',
          },
        ] as CalendarEvent[]
      ),
    staleTime: 1000 * 60,
  });
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

export function useScheduledJobs() {
  return useQuery({
    queryKey: ['scheduledJobs'],
    queryFn: () =>
      invokeWithFallback(
        'list_scheduled_jobs',
        {},
        [
          {
            id: 1,
            job_type: 'calendar_alert',
            payload: 'Mock alert to keep the UI alive',
            status: 'active',
            run_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        ] as Job[]
      ),
    staleTime: 1000 * 60,
  });
}

export function useNewsArticles(params: {
  status?: 'all' | 'unread' | 'dismissed' | 'ideas';
  limit?: number;
  offset?: number;
  includeDismissed?: boolean;
  search?: string;
}) {
  const { status = 'unread', limit = 30, offset = 0, includeDismissed = false, search } = params;
  return useQuery({
    queryKey: ['newsArticles', status, limit, offset, includeDismissed, search],
    queryFn: () =>
      invokeWithFallback(
        'list_news_articles',
        { status, limit, offset, include_dismissed: includeDismissed, search },
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

export function useNewsSettings() {
  return useQuery({
    queryKey: ['newsSettings'],
    queryFn: () =>
      invokeWithFallback(
        'get_news_settings',
        {},
        {
          user_id: 1,
          provider: 'newsdata',
          has_api_key: false,
          languages: ['en'],
          countries: ['us'],
          categories: [],
          sources: [],
          query: '',
          keywords_in_title: '',
          from_date: '',
          to_date: '',
          max_stored: 4000,
          max_articles: 4000,
          daily_call_limit: 180,
          calls_today: 0,
        } as NewsSettings
      ),
    staleTime: 1000 * 60,
  });
}

export function useNewsSources(filters: { country?: string; language?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['newsSources', filters],
    queryFn: () =>
      invokeWithFallback(
        'list_news_sources',
        filters,
        [] as NewsSource[]
      ),
    staleTime: 1000 * 60 * 5,
  });
}
