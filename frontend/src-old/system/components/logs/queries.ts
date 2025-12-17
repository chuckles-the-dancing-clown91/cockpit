/**
 * TanStack Query hooks for Log Management
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type LogEntry = {
  timestamp: string;
  level: string;
  target: string;
  message: string;
  fields?: Record<string, unknown>;
};

export type LogStats = {
  totalCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  last24hCount: number;
  last7dCount: number;
  last30dCount: number;
};

export type CleanupSummary = {
  filesDeleted: number;
  spaceFreedBytes: number;
  retentionDays: number;
};

// ============================================================================
// Log Queries
// ============================================================================

export function useGetLogs(levelFilter?: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: ['logs', levelFilter, limit, offset],
    queryFn: async () => {
      const result = await invoke<LogEntry[]>('get_application_logs', {
        levelFilter,
        limit,
        offset,
      });
      return result;
    },
  });
}

export function useGetLogStats() {
  return useQuery({
    queryKey: ['logStats'],
    queryFn: async () => {
      const result = await invoke<LogStats>('get_application_log_stats');
      return result;
    },
  });
}

export function useExportLogs() {
  return useMutation({
    mutationFn: async (levelFilter?: string) => {
      const result = await invoke<string>('export_application_logs', { levelFilter });
      return result;
    },
  });
}

export function useClearLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await invoke<CleanupSummary>('clear_application_logs');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['logStats'] });
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
    },
  });
}
