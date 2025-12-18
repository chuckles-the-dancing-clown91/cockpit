import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApplicationLogs,
  getApplicationLogStats,
  exportApplicationLogs,
  clearApplicationLogs,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

export function useLogs(level: string = 'all') {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: queryKeys.logs.list(level),
    queryFn: () =>
      getApplicationLogs({
        levelFilter: level === 'all' ? undefined : level,
        limit: 100,
      }),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.logs.stats(),
    queryFn: getApplicationLogStats,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const exportLogs = useMutation({
    mutationFn: (levelFilter?: string) => exportApplicationLogs(levelFilter),
    onSuccess: (filename) => {
      toast.success(`Logs exported: ${filename}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to export logs: ${error.message}`);
    },
  });

  const clearLogs = useMutation({
    mutationFn: clearApplicationLogs,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all() });
      toast.success(`Cleared ${result.deleted_files} log files`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear logs: ${error.message}`);
    },
  });

  return {
    logs: logsQuery.data,
    isLoading: logsQuery.isLoading,
    logsError: logsQuery.error,
    stats: statsQuery.data,
    statsError: statsQuery.error,
    exportLogs,
    clearLogs,
    refetch: logsQuery.refetch,
  };
}
