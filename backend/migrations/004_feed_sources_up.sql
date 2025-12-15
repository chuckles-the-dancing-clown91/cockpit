-- Migration 004: Feed Sources Table
-- Creates feed_sources table for plugin-based feed aggregation system
-- Each feed source (NewsData, Reddit, RSS, etc.) is linked to a system_task for scheduled syncing

-- Feed Sources Table (distinct from news_sources which tracks individual news outlets)
CREATE TABLE IF NOT EXISTS feed_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,                          -- Display name (e.g., "NewsData.io Tech News")
    source_type TEXT NOT NULL,                   -- NewsData, Reddit, RSS, Twitter, Custom
    enabled INTEGER NOT NULL DEFAULT 1,          -- 0 = disabled, 1 = enabled
    api_key_encrypted BLOB,                      -- Encrypted API key (if required)
    config TEXT,                                 -- JSON config: categories, filters, subreddits, etc.
    task_id INTEGER,                             -- Foreign key to system_tasks
    last_sync_at DATETIME,                       -- Last successful sync timestamp
    last_error TEXT,                             -- Last error message (if any)
    article_count INTEGER NOT NULL DEFAULT 0,    -- Cached article count
    error_count INTEGER NOT NULL DEFAULT 0,      -- Consecutive error count (for health scoring)
    api_calls_today INTEGER NOT NULL DEFAULT 0,  -- Rate limiting counter
    api_quota_daily INTEGER,                     -- Daily API limit (if applicable)
    last_quota_reset DATE,                       -- Date of last quota reset
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES system_tasks (id) ON DELETE SET NULL
);

-- Indexes for feed_sources
CREATE INDEX IF NOT EXISTS idx_feed_sources_source_type ON feed_sources (source_type);
CREATE INDEX IF NOT EXISTS idx_feed_sources_enabled ON feed_sources (enabled);
CREATE INDEX IF NOT EXISTS idx_feed_sources_task_id ON feed_sources (task_id);

-- Add feed_source_id to news_articles (links articles to their originating feed source)
-- Note: This is a new column, existing articles will have NULL feed_source_id
ALTER TABLE news_articles ADD COLUMN feed_source_id INTEGER REFERENCES feed_sources(id) ON DELETE SET NULL;

-- Index for feed_source_id lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_feed_source_id ON news_articles (feed_source_id);

-- Remove old hardcoded news sync tasks (will be replaced by per-source tasks)
DELETE FROM system_tasks WHERE task_type IN ('news_sync', 'news_sources_sync');
