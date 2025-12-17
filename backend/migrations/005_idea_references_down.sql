-- Rollback Migration 005: Idea References
-- Removes the idea_references table

DROP INDEX IF EXISTS idx_idea_references_added_at;
DROP INDEX IF EXISTS idx_idea_references_news_article_id;
DROP INDEX IF EXISTS idx_idea_references_idea_id;
DROP TABLE IF EXISTS idea_references;
