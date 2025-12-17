/**
 * TanStack Query hooks for Storage Management
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type StorageStats = {
  totalBytes: number;
  dataBytes: number;
  logsBytes: number;
  cacheBytes: number;
  backupBytes: number;
  exportBytes: number;
};

export type BackupInfo = {
  filePath: string;
  fileSize: number;
  timestamp: string;
};

export type ExportInfo = {
  filePath: string;
  fileSize: number;
  timestamp: string;
  recordCounts: {
    ideas: number;
    newsArticles: number;
    appSettings: number;
  };
};

export type ImportSummary = {
  recordsAdded: number;
  recordsSkipped: number;
  errors: string[];
};

export type CleanupSummary = {
  filesDeleted: number;
  spaceFreedBytes: number;
  retentionDays: number;
};

// ============================================================================
// Storage Statistics Queries
// ============================================================================

export function useStorageStats() {
  return useQuery({
    queryKey: ['storageStats'],
    queryFn: async () => {
      const result = await invoke<StorageStats>('get_storage_statistics');
      return result;
    },
  });
}

// ============================================================================
// Backup Management
// ============================================================================

export function useListBackups() {
  return useQuery({
    queryKey: ['backupsList'],
    queryFn: async () => {
      const result = await invoke<BackupInfo[]>('list_database_backups');
      return result;
    },
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await invoke<BackupInfo>('create_database_backup');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] });
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backupPath: string) => {
      await invoke('restore_database_from_backup', { backupPath });
    },
    onSuccess: () => {
      // After restore, invalidate all queries since data may have changed
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backupPath: string) => {
      await invoke('delete_database_backup', { backupPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] });
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
    },
  });
}

// ============================================================================
// Export/Import Management
// ============================================================================

export function useExportData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await invoke<ExportInfo>('export_database');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
    },
  });
}

export function useImportData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (importPath: string) => {
      const result = await invoke<ImportSummary>('import_database', { importPath });
      return result;
    },
    onSuccess: () => {
      // After import, invalidate all queries since data may have changed
      queryClient.invalidateQueries();
    },
  });
}

// ============================================================================
// Cleanup Operations
// ============================================================================

export function useCleanupLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (retentionDays?: number) => {
      const result = await invoke<CleanupSummary>('cleanup_logs', { retentionDays });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
    },
  });
}

export function useCleanupNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (retentionDays?: number) => {
      const result = await invoke<CleanupSummary>('cleanup_news', { retentionDays });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageStats'] });
      queryClient.invalidateQueries({ queryKey: ['newsArticles'] });
    },
  });
}
