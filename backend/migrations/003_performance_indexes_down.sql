-- Rollback performance indexes

DROP INDEX IF EXISTS idx_news_articles_user_dismissed_published;
DROP INDEX IF EXISTS idx_news_articles_url_lookup;
DROP INDEX IF EXISTS idx_news_articles_read_status;
DROP INDEX IF EXISTS idx_ideas_status_updated;
