-- Migration 004 Rollback: Remove Feed Sources Table

-- Drop indexes first
DROP INDEX IF EXISTS idx_news_articles_feed_source_id;
DROP INDEX IF EXISTS idx_feed_sources_task_id;
DROP INDEX IF EXISTS idx_feed_sources_enabled;
DROP INDEX IF EXISTS idx_feed_sources_source_type;

-- Note: SQLite doesn't support DROP COLUMN directly, so we keep feed_source_id
-- In a real rollback scenario, you'd recreate the table without the column

-- Drop feed_sources table
DROP TABLE IF EXISTS feed_sources;

-- Restore old hardcoded news sync tasks
INSERT OR IGNORE INTO system_tasks (name, task_type, component, frequency_cron, enabled, created_at, updated_at)
VALUES 
    ('NewsData Sync', 'news_sync', 'news', '0 0/45 * * * * *', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('News Sources Sync', 'news_sources_sync', 'news', '0 0 2 * * * *', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
