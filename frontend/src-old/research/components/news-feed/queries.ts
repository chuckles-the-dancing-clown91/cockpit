/**
 * TanStack Query hooks for News Feed Settings
 */

import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

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
// News Feed Queries
// ============================================================================

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
