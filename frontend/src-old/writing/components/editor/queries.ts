/**
 * TanStack Query hooks for Editor features
 */

import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

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

export type Job = {
  id: number;
  job_type: string;
  payload: string;
  status: string;
  run_at?: string;
  last_run_at?: string;
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
// Editor Context Queries
// ============================================================================

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
