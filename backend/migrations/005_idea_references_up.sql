-- Migration 005: Idea References
-- Adds support for attaching multiple resources (articles, URLs) to ideas

-- Idea References Table
-- Stores all resources attached to ideas (news articles, external URLs, etc.)
CREATE TABLE IF NOT EXISTS idea_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    idea_id INTEGER NOT NULL,
    reference_type TEXT NOT NULL CHECK(reference_type IN ('article', 'manual', 'url')),
    
    -- Article reference fields (when reference_type = 'article')
    news_article_id INTEGER,
    
    -- Manual/URL reference fields (when reference_type = 'manual' or 'url')
    title TEXT,
    url TEXT,
    description TEXT,
    
    -- Shared fields
    notes_markdown TEXT,
    source_id INTEGER,
    
    -- Metadata
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
    FOREIGN KEY (news_article_id) REFERENCES news_articles (id) ON DELETE SET NULL,
    FOREIGN KEY (source_id) REFERENCES feed_sources (id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_idea_references_idea_id ON idea_references (idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_references_news_article_id ON idea_references (news_article_id);
CREATE INDEX IF NOT EXISTS idx_idea_references_added_at ON idea_references (added_at DESC);

-- Migrate existing news_article_id from ideas table to references
-- Only migrate if there's a non-null news_article_id
INSERT INTO idea_references (idea_id, reference_type, news_article_id, added_at, updated_at)
SELECT 
    id as idea_id,
    'article' as reference_type,
    news_article_id,
    date_added as added_at,
    date_updated as updated_at
FROM ideas 
WHERE news_article_id IS NOT NULL;

-- Note: We keep the news_article_id column in ideas for backward compatibility
-- It can be removed in a future migration once all code is updated
