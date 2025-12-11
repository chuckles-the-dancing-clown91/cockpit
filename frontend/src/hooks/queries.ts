import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

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

export type ArticleIdea = {
  id: number;
  title: string;
  notes?: string;
  sourceUrl?: string;
  status: 'inbox' | 'planned' | 'drafting' | 'archived';
  createdAt: string;
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
  title: string;
  excerpt?: string;
  url?: string;
  source_name?: string;
  source_domain?: string;
  tags: string[];
  language?: string;
  category?: string;
  published_at?: string;
  added_to_ideas_at?: string;
  dismissed_at?: string;
};

export type NewsSettings = {
  user_id: number;
  provider: string;
  has_api_key: boolean;
  languages: string[];
  countries: string[];
  categories: string[];
  sources: string[];
  query?: string;
  max_articles: number;
  daily_call_limit: number;
  calls_today: number;
  last_reset_date?: string;
  last_synced_at?: string;
};

export type SaveNewsSettingsInput = {
  api_key?: string;
  languages?: string[];
  countries?: string[];
  categories?: string[];
  sources?: string[];
  query?: string;
  max_articles?: number;
  daily_call_limit?: number;
};

async function invokeWithFallback<T>(command: string, args: Record<string, unknown> = {}, fallback: T): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    console.warn(`[mock:${command}] using fallback`, err);
    return fallback;
  }
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

export function useArticleIdeas(status?: ArticleIdea['status']) {
  return useQuery({
    queryKey: ['articleIdeas', status],
    queryFn: () =>
      invokeWithFallback(
        'list_article_ideas',
        status ? { status } : {},
        [
          {
            id: 1,
            title: 'Build a moderator autopilot',
            notes: 'Blend Reddit mod actions with calendar events',
            status: 'inbox',
            createdAt: new Date().toISOString(),
          },
        ] as ArticleIdea[]
      ),
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

export function useNewsArticles(status: 'all' | 'unread' | 'dismissed' | 'ideas' = 'unread', limit = 30) {
  return useQuery({
    queryKey: ['newsArticles', status, limit],
    queryFn: () =>
      invokeWithFallback(
        'list_news_articles',
        { status, limit },
        [
          {
            id: 1,
            title: 'Mock: Latest AI policy update',
            excerpt: 'Placeholder article while backend is offline.',
            source_name: 'mock',
            tags: ['policy'],
            published_at: new Date().toISOString(),
          },
        ] as NewsArticle[]
      ),
    staleTime: 1000 * 60,
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
          max_articles: 4000,
          daily_call_limit: 180,
          calls_today: 0,
        } as NewsSettings
      ),
    staleTime: 1000 * 60,
  });
}
