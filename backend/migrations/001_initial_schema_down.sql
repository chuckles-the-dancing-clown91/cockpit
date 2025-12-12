-- Rollback Migration 001: Drop all tables and indexes

DROP INDEX IF EXISTS idx_ideas_date_removed;
DROP INDEX IF EXISTS idx_ideas_date_updated;
DROP INDEX IF EXISTS idx_ideas_status;
DROP TABLE IF EXISTS ideas;

DROP INDEX IF EXISTS idx_news_sources_source_id;
DROP TABLE IF EXISTS news_sources;

DROP INDEX IF EXISTS idx_news_articles_user_provider;
DROP INDEX IF EXISTS idx_news_articles_fetched_at;
DROP INDEX IF EXISTS idx_news_articles_published_at;
DROP TABLE IF EXISTS news_articles;

DROP TABLE IF EXISTS news_settings;

DROP TABLE IF EXISTS system_task_runs;

DROP INDEX IF EXISTS idx_system_tasks_task_type;
DROP TABLE IF EXISTS system_tasks;
