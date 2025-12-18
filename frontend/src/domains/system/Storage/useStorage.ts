import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStorageStats,
  createDatabaseBackup,
  listDatabaseBackups,
  deleteDatabaseBackup,
  restoreDatabaseFromBackup,
  exportDatabase,
  cleanupLogs,
  cleanupNews,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

export function useStorage() {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: queryKeys.storage.stats(),
    queryFn: getStorageStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const backupsQuery = useQuery({
    queryKey: queryKeys.storage.backups(),
    queryFn: listDatabaseBackups,
  });

  const createBackup = useMutation({
    mutationFn: createDatabaseBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.backups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success('Backup created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create backup: ${error.message}`);
    },
  });

  const deleteBackup = useMutation({
    mutationFn: deleteDatabaseBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.backups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success('Backup deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete backup: ${error.message}`);
    },
  });

  const restoreBackup = useMutation({
    mutationFn: restoreDatabaseFromBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.backups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success('Database restored successfully. Please restart the app.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore backup: ${error.message}`);
    },
  });

  const exportDatabaseMutation = useMutation({
    mutationFn: exportDatabase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success(`Database exported: ${data.filename}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to export database: ${error.message}`);
    },
  });

  const cleanupLogsMutation = useMutation({
    mutationFn: (retentionDays?: number) => cleanupLogs(retentionDays),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success(`Cleaned up ${deletedCount} log files`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to cleanup logs: ${error.message}`);
    },
  });

  const cleanupNewsMutation = useMutation({
    mutationFn: (retentionDays?: number) => cleanupNews(retentionDays),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storage.stats() });
      toast.success(`Cleaned up ${deletedCount} old articles`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to cleanup news: ${error.message}`);
    },
  });

  return {
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    statsError: statsQuery.error,
    backups: backupsQuery.data,
    isLoadingBackups: backupsQuery.isLoading,
    backupsError: backupsQuery.error,
    createBackup,
    deleteBackup,
    restoreBackup,
    exportDatabase: exportDatabaseMutation,
    cleanupLogs: cleanupLogsMutation,
    cleanupNews: cleanupNewsMutation,
  };
}
