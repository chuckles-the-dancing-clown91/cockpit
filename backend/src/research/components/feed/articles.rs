//! News articles CRUD module
//! 
//! Handles article listing, retrieval, and status management
//! (starring, dismissing, marking as read).

use tracing::instrument;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, QuerySelect,
    Set,
};

use crate::core::components::errors::{AppError, AppResult};
use super::entities::articles::{self as news_articles, Entity as EntityNewsArticles};

use super::types::{NewsArticleDto, parse_vec};

/// Convert article model to DTO
pub(crate) fn article_to_dto(m: news_articles::Model) -> NewsArticleDto {
    NewsArticleDto {
        id: m.id,
        article_id: m.provider_article_id,
        title: m.title,
        excerpt: m.excerpt,
        url: m.url,
        image_url: m.image_url,
        source_name: m.source_name,
        source_domain: m.source_domain,
        source_id: m.source_id,
        tags: parse_vec(&m.tags),
        country: parse_vec(&m.country),
        language: m.language,
        category: m.category,
        fetched_at: Some(m.fetched_at.to_rfc3339()),
        added_via: Some(m.added_via),
        is_starred: m.is_starred == 1,
        is_dismissed: m.is_dismissed == 1,
        is_read: m.is_read == 1,
        published_at: m.published_at.map(|d| d.to_rfc3339()),
        added_to_ideas_at: m.added_to_ideas_at.map(|d| d.to_rfc3339()),
        dismissed_at: m.dismissed_at.map(|d| d.to_rfc3339()),
    }
}

/// List news articles with filtering, search, and pagination
/// 
/// Supports filtering by read status, dismissal, search text, source, date range, starred.
/// Returns articles sorted by specified order (default: newest first).
#[instrument(skip(state), fields(limit = ?limit, offset = ?offset))]
pub async fn list_news_articles_handler(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    source_id: Option<i64>,
    starred: Option<bool>,
    start_date: Option<String>,
    end_date: Option<String>,
    sort_by: Option<String>,
    state: &crate::AppState,
) -> AppResult<Vec<NewsArticleDto>> {
    let mut query = EntityNewsArticles::find().filter(news_articles::Column::UserId.eq(1));
    
    // Status filter (unread, dismissed, ideas, all)
    match status.as_deref() {
        Some("unread") => {
            query = query
                .filter(news_articles::Column::DismissedAt.is_null())
                .filter(news_articles::Column::IsRead.eq(0))
                .filter(news_articles::Column::AddedToIdeasAt.is_null())
                .filter(news_articles::Column::IsDismissed.eq(0));
        }
        Some("dismissed") => query = query.filter(news_articles::Column::IsDismissed.eq(1)),
        Some("ideas") => query = query.filter(news_articles::Column::AddedToIdeasAt.is_not_null()),
        _ => {
            if include_dismissed != Some(true) {
                query = query.filter(news_articles::Column::IsDismissed.eq(0));
            }
        }
    }
    
    // Source filter
    if let Some(sid) = source_id {
        let via = format!("feed_source:{sid}");
        query = query.filter(
            news_articles::Column::FeedSourceId
                .eq(sid)
                .or(news_articles::Column::AddedVia.eq(via)),
        );
    }
    
    // Starred filter
    if let Some(is_starred) = starred {
        query = query.filter(news_articles::Column::IsStarred.eq(if is_starred { 1 } else { 0 }));
    }
    
    // Date range filters
    if let Some(start) = start_date {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&start) {
            query = query.filter(news_articles::Column::PublishedAt.gte(dt.with_timezone(&chrono::Utc)));
        }
    }
    if let Some(end) = end_date {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&end) {
            query = query.filter(news_articles::Column::PublishedAt.lte(dt.with_timezone(&chrono::Utc)));
        }
    }
    
    // Search filter
    if let Some(term) = search {
        if !term.trim().is_empty() {
            let like = format!("%{}%", term.trim());
            query = query.filter(
                news_articles::Column::Title
                    .like(like.clone())
                    .or(news_articles::Column::Excerpt.like(like.clone()))
                    .or(news_articles::Column::Content.like(like)),
            );
        }
    }
    let mut items_query = query;
    
    // Sorting
    match sort_by.as_deref() {
        Some("oldest") => {
            items_query = items_query
                .order_by_asc(news_articles::Column::PublishedAt)
                .order_by_asc(news_articles::Column::FetchedAt);
        }
        Some("starred") => {
            items_query = items_query
                .order_by_desc(news_articles::Column::IsStarred)
                .order_by_desc(news_articles::Column::PublishedAt);
        }
        _ => {
            // Default: latest first
            items_query = items_query
                .order_by_desc(news_articles::Column::PublishedAt)
                .order_by_desc(news_articles::Column::FetchedAt);
        }
    }
    
    // Pagination
    let items = items_query
        .limit(limit.unwrap_or(100))
        .offset(offset.unwrap_or(0))
        .all(&state.db)
        .await?;
    
    Ok(items.into_iter().map(article_to_dto).collect())
}

/// Get single news article by ID
pub async fn get_news_article_handler(
    id: i64,
    state: &crate::AppState,
) -> AppResult<NewsArticleDto> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    Ok(article_to_dto(m))
}

/// Dismiss a news article
#[tracing::instrument(skip(state), fields(article_id = %id))]
pub async fn dismiss_news_article_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    tracing::info!("Dismissing news article");
    
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        tracing::error!("Article not found for dismissal");
        return Err(AppError::other("Article not found"));
    };
    
    let mut active = m.into_active_model();
    active.dismissed_at = Set(Some(chrono::Utc::now()));
    active.is_dismissed = Set(1);
    active.updated_at = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    
    tracing::info!("Article dismissed successfully");
    Ok(())
}

/// Toggle star status of a news article
#[tracing::instrument(skip(state), fields(article_id = %id, starred = %starred))]
pub async fn toggle_star_news_article_handler(
    id: i64,
    starred: bool,
    state: &crate::AppState,
) -> AppResult<()> {
    tracing::info!("Toggling star status for article");
    
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        tracing::error!("Article not found for starring");
        return Err(AppError::other("Article not found"));
    };
    
    let mut active = m.into_active_model();
    active.is_starred = Set(if starred { 1 } else { 0 });
    active.updated_at = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    
    tracing::info!(new_star_status = %starred, "Article star status updated successfully");
    Ok(())
}

/// Mark news article as read
#[tracing::instrument(skip(state), fields(article_id = %id))]
pub async fn mark_news_article_read_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    tracing::info!("Marking article as read");
    
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        tracing::error!("Article not found for marking as read");
        return Err(AppError::other("Article not found"));
    };
    
    if m.is_read == 1 {
        tracing::info!("Article already marked as read, skipping update");
        return Ok(());
    }
    
    let read_at = chrono::Utc::now();
    let mut active = m.into_active_model();
    active.is_read = Set(1);
    active.updated_at = Set(read_at);
    active.update(&state.db).await?;
    
    tracing::info!(%read_at, "Article marked as read successfully");
    Ok(())
}
