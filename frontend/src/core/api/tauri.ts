import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import type { Idea, NewsArticle, FeedSource, AppSettings } from '@/shared/types';

/**
 * Typed wrappers for Tauri backend commands
 * This provides type safety and a single source of truth for API calls
 */

// ========== Ideas/Writing Commands ==========

export async function listIdeas(): Promise<Idea[]> {
  return tauriInvoke('list_ideas');
}

export async function getIdea(id: number): Promise<Idea> {
  return tauriInvoke('get_idea', { id });
}

export async function createIdea(input: {
  title: string;
  summary: string;
  status: string;
  priority: string;
}): Promise<Idea> {
  return tauriInvoke('create_idea', { input });
}

export async function updateIdeaMetadata(input: {
  id: number;
  title?: string;
  summary?: string;
  status?: string;
  priority?: string;
}): Promise<Idea> {
  return tauriInvoke('update_idea_metadata', { input });
}

export async function updateIdeaNotes(id: number, notesMarkdown: string): Promise<Idea> {
  return tauriInvoke('update_idea_notes', { id, input: { notesMarkdown } });
}

export async function archiveIdea(id: number): Promise<void> {
  return tauriInvoke('archive_idea', { id });
}

export async function restoreIdea(id: number): Promise<void> {
  return tauriInvoke('restore_idea', { id });
}

export async function bulkArchiveIdeas(ids: number[]): Promise<void> {
  return tauriInvoke('bulk_archive_ideas', { ids });
}

export async function deleteIdea(id: number): Promise<void> {
  return tauriInvoke('delete_idea', { id });
}

// ========== Research/News Commands ==========

export async function listNewsArticles(params?: {
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<NewsArticle[]> {
  return tauriInvoke('list_news_articles', params || {});
}

export async function getNewsArticle(id: number): Promise<NewsArticle> {
  return tauriInvoke('get_news_article', { id });
}

export async function listFeedSources(): Promise<FeedSource[]> {
  return tauriInvoke('list_feed_sources');
}

export async function createFeedSource(input: {
  name: string;
  source_type: string;
  url: string;
  config?: Record<string, unknown>;
}): Promise<FeedSource> {
  return tauriInvoke('create_feed_source', { input });
}

export async function updateFeedSource(input: {
  id: number;
  name?: string;
  url?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): Promise<FeedSource> {
  return tauriInvoke('update_feed_source', { input });
}

export async function deleteFeedSource(id: number): Promise<void> {
  return tauriInvoke('delete_feed_source', { id });
}

export async function refreshFeedSource(id: number): Promise<void> {
  return tauriInvoke('refresh_feed_source', { id });
}

// ========== System/Settings Commands ==========

export interface SettingValue {
  value: unknown;
  valueType: string;
  description?: string;
}

export interface AppSettingsDto {
  general: Record<string, SettingValue>;
  news: Record<string, SettingValue>;
  writing: Record<string, SettingValue>;
  appearance: Record<string, SettingValue>;
  advanced: Record<string, SettingValue>;
}

export async function getAppSettings(): Promise<AppSettingsDto> {
  return tauriInvoke('get_app_settings');
}

export async function updateAppSettings(input: {
  settings: Array<{ key: string; value: unknown }>;
}): Promise<void> {
  return tauriInvoke('update_settings', { inputs: input.settings });
}

// Legacy single-row settings (kept for compatibility)
export async function getLegacyAppSettings(): Promise<AppSettings> {
  return tauriInvoke('get_app_settings_legacy');
}

export interface StorageStats {
  totalBytes: number;
  dataBytes: number;
  logsBytes: number;
  cacheBytes: number;
  backupBytes: number;
  exportBytes: number;
}

export interface BackupInfo {
  filePath: string;
  fileSize: number;
  timestamp: string;
}

export interface ExportInfo {
  filename: string;
  size: number;
  created_at: string;
}

export async function getStorageStats(): Promise<StorageStats> {
  return tauriInvoke('get_storage_statistics');
}

export async function createDatabaseBackup(): Promise<BackupInfo> {
  return tauriInvoke('create_database_backup');
}

export async function listDatabaseBackups(): Promise<BackupInfo[]> {
  return tauriInvoke('list_database_backups');
}

export async function deleteDatabaseBackup(filePath: string): Promise<void> {
  return tauriInvoke('delete_database_backup', { backupPath: filePath });
}

export async function restoreDatabaseFromBackup(filePath: string): Promise<void> {
  return tauriInvoke('restore_database_from_backup', { backupPath: filePath });
}

export async function exportDatabase(): Promise<ExportInfo> {
  return tauriInvoke('export_database');
}

export async function cleanupLogs(retentionDays?: number): Promise<number> {
  return tauriInvoke('cleanup_logs', { retentionDays });
}

export async function cleanupNews(retentionDays?: number): Promise<number> {
  return tauriInvoke('cleanup_news', { retentionDays });
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  target: string;
}

export interface LogStats {
  totalCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  last24hCount: number;
  last7dCount: number;
  last30dCount: number;
}

export async function getApplicationLogs(params?: {
  levelFilter?: string;
  limit?: number;
  offset?: number;
}): Promise<LogEntry[]> {
  return tauriInvoke('get_application_logs', {
    levelFilter: params?.levelFilter,
    limit: params?.limit,
    offset: params?.offset,
  });
}

export async function getApplicationLogStats(): Promise<LogStats> {
  return tauriInvoke('get_application_log_stats');
}

export async function exportApplicationLogs(levelFilter?: string): Promise<string> {
  return tauriInvoke('export_application_logs', { levelFilter });
}

export async function clearApplicationLogs(): Promise<{ deleted_files: number }> {
  return tauriInvoke('clear_application_logs');
}

export async function exportData(format: string): Promise<string> {
  return tauriInvoke('export_data', { format });
}

export async function importData(filePath: string): Promise<void> {
  return tauriInvoke('import_data', { filePath });
}

// ========== User/Session Commands ==========

export interface CurrentUser {
  username: string;
  home_dir: string;
  user_id: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return tauriInvoke('get_current_user');
}

// ========== System Tasks Commands ==========

export interface SystemTaskDto {
  id: number;
  name: string;
  taskType: string;
  component: string;
  frequencyCron: string | null;
  frequencySeconds: number | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: string | null;
  errorCount: number;
}

export interface TaskRunDto {
  id: number;
  task_id: number;
  task_type: string;
  started_at: string;
  completed_at?: string;
  status: string;
  result_message?: string;
  error_message?: string;
}

export interface UpdateTaskInput {
  enabled?: boolean;
  frequency_seconds?: number | null;
  frequency_cron?: string | null;
  name?: string;
}

export async function listSystemTasks(): Promise<SystemTaskDto[]> {
  return tauriInvoke('list_system_tasks');
}

export async function getTaskHistory(params?: {
  taskId?: number;
  limit?: number;
  offset?: number;
}): Promise<TaskRunDto[]> {
  return tauriInvoke('get_task_history', {
    taskId: params?.taskId,
    limit: params?.limit,
    offset: params?.offset,
  });
}

export async function runSystemTaskNow(taskType: string): Promise<{ message: string; run_id: number }> {
  return tauriInvoke('run_system_task_now', { taskType });
}

export async function updateSystemTask(taskType: string, input: UpdateTaskInput): Promise<SystemTaskDto> {
  return tauriInvoke('update_system_task', { taskType, input });
}
