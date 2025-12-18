// Typed setting keys for type-safe settings access
//
// This file defines all available settings keys with their types.
// Add new settings here when adding features.

export enum SettingKey {
  // Appearance
  AppTheme = 'app.theme',
  
  // General
  AppAutoStart = 'app.auto_start',
  AppMinimizeToTray = 'app.minimize_to_tray',
  AppNotificationsEnabled = 'app.notifications_enabled',
  
  // News & Research
  NewsAutoSync = 'news.auto_sync',
  NewsSyncIntervalMinutes = 'news.sync_interval_minutes',
  NewsMaxArticles = 'news.max_articles',
  NewsAutoDismissRead = 'news.auto_dismiss_read',
  NewsDataApiKey = 'news.newsdata_api_key',
  
  // Writing
  WritingAutoSave = 'writing.auto_save',
  WritingAutoSaveDelayMs = 'writing.auto_save_delay_ms',
  WritingDefaultStatus = 'writing.default_status',
  WritingSpellCheck = 'writing.spell_check',
  
  // Storage
  StorageAutoCleanup = 'storage.auto_cleanup',
  StorageCleanupDays = 'storage.cleanup_days',
  StorageAutoBackup = 'storage.auto_backup',
  StorageBackupIntervalDays = 'storage.backup_interval_days',
  StorageMaxBackupCount = 'storage.max_backup_count',
  
  // Logging
  LoggingLevel = 'logging.level',
  LoggingMaxFileSizeMb = 'logging.max_file_size_mb',
  LoggingMaxFiles = 'logging.max_files',
}

// Type mapping for settings values
export type SettingValueType<K extends SettingKey> = 
  // Strings
  K extends SettingKey.AppTheme | SettingKey.NewsDataApiKey | SettingKey.WritingDefaultStatus | SettingKey.LoggingLevel
    ? string
  // Numbers
  : K extends SettingKey.NewsSyncIntervalMinutes | SettingKey.NewsMaxArticles | 
      SettingKey.WritingAutoSaveDelayMs | SettingKey.StorageCleanupDays | 
      SettingKey.StorageBackupIntervalDays | SettingKey.StorageMaxBackupCount |
      SettingKey.LoggingMaxFileSizeMb | SettingKey.LoggingMaxFiles
    ? number
  // Booleans
  : K extends SettingKey.AppAutoStart | SettingKey.AppMinimizeToTray | 
      SettingKey.AppNotificationsEnabled | SettingKey.NewsAutoSync | 
      SettingKey.NewsAutoDismissRead | SettingKey.WritingAutoSave | 
      SettingKey.WritingSpellCheck | SettingKey.StorageAutoCleanup | 
      SettingKey.StorageAutoBackup
    ? boolean
  : never;

// Feature capabilities based on configured settings
export interface FeatureCapabilities {
  news: {
    enabled: boolean;
    autoSync: boolean;
  };
  google: {
    enabled: boolean;
  };
  reddit: {
    enabled: boolean;
  };
  x: {
    enabled: boolean;
  };
}

// Setting metadata for UI display
export interface SettingMetadata {
  key: string;
  label: string;
  description: string;
  category: 'general' | 'news' | 'writing' | 'appearance' | 'advanced';
  type: 'string' | 'number' | 'boolean' | 'json';
  encrypted?: boolean;
  // For string settings, possible values
  options?: Array<{ value: string; label: string }>;
  // For number settings, min/max/step
  min?: number;
  max?: number;
  step?: number;
}

// Settings registry - metadata for all settings
export const SETTINGS_REGISTRY: Record<string, SettingMetadata> = {
  // Appearance
  [SettingKey.AppTheme]: {
    key: SettingKey.AppTheme,
    label: 'Theme',
    description: 'Application color theme',
    category: 'appearance',
    type: 'string',
    options: [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'cyberpunk', label: 'Cyberpunk' },
    ],
  },
  
  // General
  [SettingKey.AppAutoStart]: {
    key: SettingKey.AppAutoStart,
    label: 'Auto Start',
    description: 'Launch app on system startup',
    category: 'general',
    type: 'boolean',
  },
  [SettingKey.AppMinimizeToTray]: {
    key: SettingKey.AppMinimizeToTray,
    label: 'Minimize to Tray',
    description: 'Minimize to system tray instead of taskbar',
    category: 'general',
    type: 'boolean',
  },
  [SettingKey.AppNotificationsEnabled]: {
    key: SettingKey.AppNotificationsEnabled,
    label: 'Notifications',
    description: 'Show desktop notifications',
    category: 'general',
    type: 'boolean',
  },
  
  // News
  [SettingKey.NewsAutoSync]: {
    key: SettingKey.NewsAutoSync,
    label: 'Auto Sync',
    description: 'Automatically sync news articles',
    category: 'news',
    type: 'boolean',
  },
  [SettingKey.NewsSyncIntervalMinutes]: {
    key: SettingKey.NewsSyncIntervalMinutes,
    label: 'Sync Interval',
    description: 'Minutes between automatic syncs',
    category: 'news',
    type: 'number',
    min: 15,
    max: 1440,
    step: 15,
  },
  [SettingKey.NewsMaxArticles]: {
    key: SettingKey.NewsMaxArticles,
    label: 'Max Articles',
    description: 'Maximum articles to store',
    category: 'news',
    type: 'number',
    min: 100,
    max: 10000,
    step: 100,
  },
  [SettingKey.NewsAutoDismissRead]: {
    key: SettingKey.NewsAutoDismissRead,
    label: 'Auto Dismiss Read',
    description: 'Auto-dismiss articles after reading',
    category: 'news',
    type: 'boolean',
  },
  [SettingKey.NewsDataApiKey]: {
    key: SettingKey.NewsDataApiKey,
    label: 'NewsData API Key',
    description: 'NewsData.io API key for news feeds',
    category: 'news',
    type: 'string',
    encrypted: true,
  },
  
  // Writing
  [SettingKey.WritingAutoSave]: {
    key: SettingKey.WritingAutoSave,
    label: 'Auto Save',
    description: 'Automatically save drafts while typing',
    category: 'writing',
    type: 'boolean',
  },
  [SettingKey.WritingAutoSaveDelayMs]: {
    key: SettingKey.WritingAutoSaveDelayMs,
    label: 'Auto Save Delay',
    description: 'Milliseconds to wait before auto-saving',
    category: 'writing',
    type: 'number',
    min: 100,
    max: 5000,
    step: 100,
  },
  [SettingKey.WritingDefaultStatus]: {
    key: SettingKey.WritingDefaultStatus,
    label: 'Default Status',
    description: 'Default status for new ideas',
    category: 'writing',
    type: 'string',
    options: [
      { value: 'in_progress', label: 'In Progress' },
      { value: 'stalled', label: 'Stalled' },
      { value: 'complete', label: 'Complete' },
    ],
  },
  [SettingKey.WritingSpellCheck]: {
    key: SettingKey.WritingSpellCheck,
    label: 'Spell Check',
    description: 'Enable spell checking',
    category: 'writing',
    type: 'boolean',
  },
  
  // Storage
  [SettingKey.StorageAutoCleanup]: {
    key: SettingKey.StorageAutoCleanup,
    label: 'Auto Cleanup',
    description: 'Automatically clean up old data',
    category: 'advanced',
    type: 'boolean',
  },
  [SettingKey.StorageCleanupDays]: {
    key: SettingKey.StorageCleanupDays,
    label: 'Cleanup After',
    description: 'Days to keep old articles',
    category: 'advanced',
    type: 'number',
    min: 7,
    max: 365,
    step: 7,
  },
  [SettingKey.StorageAutoBackup]: {
    key: SettingKey.StorageAutoBackup,
    label: 'Auto Backup',
    description: 'Automatically create backups',
    category: 'advanced',
    type: 'boolean',
  },
  [SettingKey.StorageBackupIntervalDays]: {
    key: SettingKey.StorageBackupIntervalDays,
    label: 'Backup Interval',
    description: 'Days between automatic backups',
    category: 'advanced',
    type: 'number',
    min: 1,
    max: 30,
    step: 1,
  },
  [SettingKey.StorageMaxBackupCount]: {
    key: SettingKey.StorageMaxBackupCount,
    label: 'Max Backups',
    description: 'Maximum number of backups to keep',
    category: 'advanced',
    type: 'number',
    min: 1,
    max: 50,
    step: 1,
  },
  
  // Logging
  [SettingKey.LoggingLevel]: {
    key: SettingKey.LoggingLevel,
    label: 'Log Level',
    description: 'Application logging verbosity',
    category: 'advanced',
    type: 'string',
    options: [
      { value: 'error', label: 'Error' },
      { value: 'warn', label: 'Warning' },
      { value: 'info', label: 'Info' },
      { value: 'debug', label: 'Debug' },
      { value: 'trace', label: 'Trace' },
    ],
  },
  [SettingKey.LoggingMaxFileSizeMb]: {
    key: SettingKey.LoggingMaxFileSizeMb,
    label: 'Max Log File Size',
    description: 'Maximum log file size in MB',
    category: 'advanced',
    type: 'number',
    min: 1,
    max: 100,
    step: 1,
  },
  [SettingKey.LoggingMaxFiles]: {
    key: SettingKey.LoggingMaxFiles,
    label: 'Max Log Files',
    description: 'Maximum number of log files to keep',
    category: 'advanced',
    type: 'number',
    min: 1,
    max: 20,
    step: 1,
  },
};

// Helper to get setting metadata
export function getSettingMetadata(key: SettingKey): SettingMetadata | undefined {
  return SETTINGS_REGISTRY[key];
}

// Helper to get all settings for a category
export function getSettingsByCategory(category: SettingMetadata['category']): SettingMetadata[] {
  return Object.values(SETTINGS_REGISTRY).filter(setting => setting.category === category);
}
