-- Migration 001: Initial Schema
-- Creates all core tables for Architect Cockpit

-- System Tasks Table
CREATE TABLE IF NOT EXISTS system_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    component TEXT NOT NULL,
    frequency_cron TEXT,
    frequency_seconds INTEGER,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at DATETIME,
    last_status TEXT,
    last_result TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_tasks_task_type ON system_tasks (task_type);

-- System Task Runs Table
CREATE TABLE IF NOT EXISTS system_task_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    task_id INTEGER NOT NULL,
    started_at DATETIME NOT NULL,
    finished_at DATETIME,
    status TEXT NOT NULL,
    result TEXT,
    error_message TEXT
);

-- News Settings Table
CREATE TABLE IF NOT EXISTS news_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    api_key_encrypted BLOB NOT NULL,
    language TEXT,
    languages TEXT,
    countries TEXT,
    categories TEXT,
    sources TEXT,
    query TEXT,
    keywords_in_title TEXT,
    from_date TEXT,
    to_date TEXT,
    max_stored INTEGER,
    max_articles INTEGER NOT NULL DEFAULT 4000,
    daily_call_limit INTEGER NOT NULL DEFAULT 180,
    calls_today INTEGER NOT NULL DEFAULT 0,
    last_reset_date DATE,
    last_synced_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- News Articles Table
CREATE TABLE IF NOT EXISTS news_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_article_id TEXT,
    source_name TEXT,
    source_domain TEXT,
    source_id TEXT,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    tags TEXT,
    url TEXT,
    image_url TEXT,
    language TEXT,
    category TEXT,
    country TEXT,
    published_at DATETIME,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_via TEXT NOT NULL DEFAULT 'sync',
    is_starred INTEGER NOT NULL DEFAULT 0,
    is_dismissed INTEGER NOT NULL DEFAULT 0,
    is_read INTEGER NOT NULL DEFAULT 0,
    added_to_ideas_at DATETIME,
    dismissed_at DATETIME,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_user_provider ON news_articles (user_id, provider);

-- News Sources Table
CREATE TABLE IF NOT EXISTS news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    country TEXT,
    language TEXT,
    category TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_muted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_sources_source_id ON news_sources (source_id);

-- Ideas Table
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT NOT NULL,
    news_article_id INTEGER,
    target TEXT,
    tags TEXT,
    notes_markdown TEXT,
    article_title TEXT,
    article_markdown TEXT,
    date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_completed DATETIME,
    date_removed DATETIME,
    priority INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (news_article_id) REFERENCES news_articles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas (status);
CREATE INDEX IF NOT EXISTS idx_ideas_date_updated ON ideas (date_updated DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_date_removed ON ideas (date_removed);

-- Seed initial system tasks
INSERT OR IGNORE INTO system_tasks (name, task_type, component, frequency_cron, enabled, created_at, updated_at)
VALUES 
    ('NewsData Sync', 'news_sync', 'news', '0 0/45 * * * * *', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('News Sources Sync', 'news_sources_sync', 'news', '0 0 2 * * * *', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
