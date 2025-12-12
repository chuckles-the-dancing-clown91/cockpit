-- Migration 002: App Settings Table
-- Stores user preferences and configuration

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json'
    category TEXT NOT NULL, -- 'general', 'news', 'writing', 'appearance', 'advanced'
    description TEXT,
    is_encrypted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings (key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings (category);

-- Seed default settings
INSERT OR IGNORE INTO app_settings (key, value, value_type, category, description, is_encrypted)
VALUES
    -- General Settings
    ('app.theme', 'dark', 'string', 'appearance', 'App theme: light, dark, or cyberpunk', 0),
    ('app.auto_start', 'false', 'boolean', 'general', 'Launch app on system startup', 0),
    ('app.minimize_to_tray', 'true', 'boolean', 'general', 'Minimize to system tray instead of taskbar', 0),
    ('app.notifications_enabled', 'true', 'boolean', 'general', 'Show desktop notifications', 0),
    
    -- News Settings
    ('news.auto_sync', 'true', 'boolean', 'news', 'Automatically sync news articles', 0),
    ('news.sync_interval_minutes', '45', 'number', 'news', 'Minutes between automatic syncs', 0),
    ('news.max_articles', '4000', 'number', 'news', 'Maximum articles to store', 0),
    ('news.auto_dismiss_read', 'false', 'boolean', 'news', 'Auto-dismiss articles after reading', 0),
    ('news.newsdata_api_key', '', 'string', 'news', 'NewsData.io API key', 1),
    
    -- Writing Settings  
    ('writing.auto_save', 'true', 'boolean', 'writing', 'Automatically save drafts while typing', 0),
    ('writing.auto_save_delay_ms', '600', 'number', 'writing', 'Milliseconds to wait before auto-saving', 0),
    ('writing.default_status', 'in_progress', 'string', 'writing', 'Default status for new ideas', 0),
    ('writing.spell_check', 'true', 'boolean', 'writing', 'Enable spell checking', 0),
    
    -- Storage & Maintenance
    ('storage.auto_cleanup', 'true', 'boolean', 'advanced', 'Automatically clean up old data', 0),
    ('storage.cleanup_days', '90', 'number', 'advanced', 'Days to keep old articles', 0),
    ('storage.auto_backup', 'true', 'boolean', 'advanced', 'Automatically create backups', 0),
    ('storage.backup_interval_days', '7', 'number', 'advanced', 'Days between automatic backups', 0),
    ('storage.max_backup_count', '10', 'number', 'advanced', 'Maximum number of backups to keep', 0),
    
    -- Logging
    ('logging.level', 'info', 'string', 'advanced', 'Log level: trace, debug, info, warn, error', 0),
    ('logging.max_file_size_mb', '50', 'number', 'advanced', 'Maximum log file size in MB', 0),
    ('logging.max_files', '5', 'number', 'advanced', 'Maximum number of log files to keep', 0);
