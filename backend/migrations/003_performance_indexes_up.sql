-- Add composite indexes for common query patterns

-- Index for fetching news articles filtered by user/dismissed status and sorted by date
-- Used in: news article listing, dashboard views
CREATE INDEX IF NOT EXISTS idx_news_articles_user_dismissed_published 
    ON news_articles (user_id, is_dismissed, published_at DESC);

-- Index for URL-based lookups during news sync
-- Used in: checking for existing articles by URL to prevent duplicates
CREATE INDEX IF NOT EXISTS idx_news_articles_url_lookup 
    ON news_articles (user_id, provider, url);

-- Index for read status filtering with dismissal
-- Used in: filtering read/unread articles in the UI
CREATE INDEX IF NOT EXISTS idx_news_articles_read_status 
    ON news_articles (user_id, is_read, is_dismissed, published_at DESC);

-- Index for ideas filtering by status and date
-- Used in: active ideas listing, archived ideas queries
CREATE INDEX IF NOT EXISTS idx_ideas_status_updated 
    ON ideas (status, date_removed, date_updated DESC);
