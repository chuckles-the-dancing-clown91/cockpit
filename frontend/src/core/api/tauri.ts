import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import type { FeedSource, FeedSourceConfig, Idea, NewsArticle, NewsSourceDto, Reference } from '@/shared/types';
import { priorityFromNumber } from '@/shared/types';

/**
 * Typed wrappers for Tauri backend commands
 * This provides type safety and a single source of truth for API calls
 */

// Transform backend idea (with numeric priority) to frontend Idea type
function transformIdea(idea: any): Idea {
  return {
    ...idea,
    priority: priorityFromNumber(idea.priority),
  };
}

// ========== Ideas/Writing Commands ==========

export async function listIdeas(): Promise<Idea[]> {
  const ideas = await tauriInvoke<any[]>('list_ideas');
  return ideas.map(transformIdea);
}

export async function getIdea(id: number): Promise<Idea> {
  const idea = await tauriInvoke<any>('get_idea', { id });
  return transformIdea(idea);
}

export async function createIdea(input: {
  title: string;
  summary?: string;
  status?: string;
  priority?: number;
  target?: string;
}): Promise<Idea> {
  const idea = await tauriInvoke<any>('create_idea', { input });
  return transformIdea(idea);
}

export async function updateIdeaMetadata(input: {
  id: number;
  title?: string;
  summary?: string;
  status?: string;
  priority?: number;
  target?: string;
}): Promise<Idea> {
  const { id, ...rest } = input;
  const idea = await tauriInvoke<any>('update_idea_metadata', { id, input: rest });
  return transformIdea(idea);
}

export async function updateIdeaNotes(id: number, notesMarkdown: string): Promise<Idea> {
  const idea = await tauriInvoke<any>('update_idea_notes', { id, input: { notesMarkdown } });
  return transformIdea(idea);
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

// ========== References Commands ==========

export async function listIdeaReferences(ideaId: number): Promise<Reference[]> {
  return tauriInvoke('list_idea_references', { ideaId });
}

export async function addReferenceToIdea(input: {
  ideaId: number;
  referenceType: string;
  newsArticleId?: number;
  title?: string;
  url?: string;
  description?: string;
  sourceId?: number;
}): Promise<Reference> {
  return tauriInvoke('add_reference_to_idea', { input });
}

export async function removeReference(referenceId: number): Promise<void> {
  return tauriInvoke('remove_reference', { referenceId });
}

export async function updateReferenceNotes(referenceId: number, notesMarkdown: string): Promise<Reference> {
  return tauriInvoke('update_reference_notes', { referenceId, input: { notesMarkdown } });
}

// ========== Research/News Commands ==========

export async function listNewsArticles(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  includeDismissed?: boolean;
  search?: string;
  sourceId?: number;
  starred?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}): Promise<NewsArticle[]> {
  const args: Record<string, unknown> = {};
  if (params?.status) args.status = params.status;
  if (typeof params?.limit === 'number') args.limit = params.limit;
  if (typeof params?.offset === 'number') args.offset = params.offset;
  if (params?.includeDismissed === true) args.includeDismissed = true;
  if (params?.search) args.search = params.search;
  if (typeof params?.sourceId === 'number' && !Number.isNaN(params.sourceId)) {
    args.sourceId = params.sourceId;
  }
  if (typeof params?.starred === 'boolean') args.starred = params.starred;
  if (params?.startDate) args.startDate = params.startDate;
  if (params?.endDate) args.endDate = params.endDate;
  if (params?.sortBy) args.sortBy = params.sortBy;
  return tauriInvoke('list_news_articles', args);
}

export async function getNewsArticle(id: number): Promise<NewsArticle> {
  return tauriInvoke('get_news_article', { id });
}

export async function clearNewsArticles(): Promise<number> {
  return tauriInvoke('clear_news_articles');
}

export async function toggleStarNewsArticle(id: number, starred: boolean): Promise<void> {
  return tauriInvoke('toggle_star_news_article', { id, starred });
}

export async function markNewsArticleRead(id: number): Promise<void> {
  return tauriInvoke('mark_news_article_read', { id });
}

export async function dismissNewsArticle(id: number): Promise<void> {
  return tauriInvoke('dismiss_news_article', { id });
}

export async function syncNewsNow(): Promise<unknown> {
  return tauriInvoke('sync_news_now');
}

export async function listFeedSources(): Promise<FeedSource[]> {
  return tauriInvoke('list_feed_sources');
}

export async function createFeedSource(input: {
  name: string;
  sourceType: string;
  apiKey?: string | null;
  config?: FeedSourceConfig | null;
  schedule?: string | null;
}): Promise<FeedSource> {
  return tauriInvoke('create_feed_source', { input });
}

export async function updateFeedSource(
  sourceId: number,
  input: {
    name?: string | null;
    enabled?: boolean | null;
    apiKey?: string | null;
    config?: FeedSourceConfig | null;
    schedule?: string | null;
  },
): Promise<FeedSource> {
  return tauriInvoke('update_feed_source', { sourceId, input });
}

export async function deleteFeedSource(sourceId: number): Promise<void> {
  return tauriInvoke('delete_feed_source', { sourceId });
}

export async function toggleFeedSource(sourceId: number, enabled: boolean): Promise<FeedSource> {
  return tauriInvoke('toggle_feed_source', { sourceId, enabled });
}

export async function testFeedSourceConnection(sourceId: number): Promise<unknown> {
  return tauriInvoke('test_feed_source_connection', { sourceId });
}

export async function syncFeedSourceNow(sourceId: number): Promise<unknown> {
  return tauriInvoke('sync_feed_source_now', { sourceId });
}

export async function syncAllFeedSources(): Promise<unknown> {
  return tauriInvoke('sync_all_feed_sources');
}

export type ResearchCockpitPane = 'references' | 'notes';

function resolveResearchCockpitLabel(pane: ResearchCockpitPane): string {
  return pane === 'references' ? 'research_cockpit_left' : 'research_cockpit_right';
}

export async function researchOpenCockpit(input: {
  pane: ResearchCockpitPane;
  url: string;
  title?: string;
  referenceId?: number;
  ideaId?: number;
  writingId?: number;
  windowLabel?: string;
  webviewLabel?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = { url: input.url };
  if (input.title !== undefined) payload.title = input.title;
  if (input.referenceId !== undefined) payload.referenceId = input.referenceId;
  if (input.ideaId !== undefined) payload.ideaId = input.ideaId;
  if (input.writingId !== undefined) payload.writingId = input.writingId;
  if (input.windowLabel !== undefined) payload.windowLabel = input.windowLabel;
  payload.webviewLabel = input.webviewLabel ?? resolveResearchCockpitLabel(input.pane);
  return tauriInvoke('research_open_cockpit', { input: payload });
}

export async function researchCloseCockpit(): Promise<void> {
  return tauriInvoke('research_close_cockpit');
}

export async function researchSetCockpitBounds(input: {
  pane: ResearchCockpitPane;
  x: number;
  y: number;
  width: number;
  height: number;
  windowLabel?: string;
  webviewLabel?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  };
  if (input.windowLabel !== undefined) payload.windowLabel = input.windowLabel;
  payload.webviewLabel = input.webviewLabel ?? resolveResearchCockpitLabel(input.pane);
  return tauriInvoke('research_set_cockpit_bounds', { input: payload });
}

export async function researchOpenDetachedCockpit(input: {
  url: string;
  title?: string;
  referenceId?: number;
  ideaId?: number;
  writingId?: number;
}): Promise<void> {
  const payload: Record<string, unknown> = { url: input.url };
  if (input.title !== undefined) payload.title = input.title;
  if (input.referenceId !== undefined) payload.referenceId = input.referenceId;
  if (input.ideaId !== undefined) payload.ideaId = input.ideaId;
  if (input.writingId !== undefined) payload.writingId = input.writingId;
  return tauriInvoke('research_open_detached_cockpit', { input: payload });
}

// Backwards-compatible alias
export async function refreshFeedSource(sourceId: number): Promise<unknown> {
  return syncFeedSourceNow(sourceId);
}

export async function getNewsSettings(): Promise<{ hasApiKey: boolean }> {
  const res = await tauriInvoke<any>('get_news_settings');
  return { hasApiKey: Boolean(res?.hasApiKey) };
}

export async function saveNewsSettings(input: { apiKey?: string | null }): Promise<{ hasApiKey: boolean }> {
  const res = await tauriInvoke<any>('save_news_settings', { input });
  return { hasApiKey: Boolean(res?.hasApiKey) };
}

export async function syncNewsSourcesNow(): Promise<unknown> {
  return tauriInvoke('sync_news_sources_now');
}

export async function listNewsSources(params?: {
  country?: string;
  language?: string;
  search?: string;
}): Promise<NewsSourceDto[]> {
  return tauriInvoke('list_news_sources', {
    country: params?.country,
    language: params?.language,
    search: params?.search,
  });
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
export async function getLegacyAppSettings(): Promise<any> {
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
