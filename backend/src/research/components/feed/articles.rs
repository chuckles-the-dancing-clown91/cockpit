//! News articles CRUD module
//! 
//! Handles article listing, retrieval, and status management
//! (starring, dismissing, marking as read).

use tracing::instrument;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, QuerySelect, Set};

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
/// Supports filtering by read status, dismissal, search text.
/// Returns articles sorted by published date (newest first).
#[instrument(skip(state), fields(limit = ?limit, offset = ?offset))]
pub async fn list_news_articles_handler(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    state: &crate::AppState,
) -> AppResult<Vec<NewsArticleDto>> {
    let mut query = EntityNewsArticles::find().filter(news_articles::Column::UserId.eq(1));
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
    // Optimize by excluding heavy content field in list view
    // Content can be large, only fetch when viewing individual articles
    let items = query
        .select_only()
        .columns([
            news_articles::Column::Id,
            news_articles::Column::UserId,
            news_articles::Column::Provider,
            news_articles::Column::ProviderArticleId,
            news_articles::Column::Title,
            news_articles::Column::Excerpt,
            news_articles::Column::Url,
            news_articles::Column::ImageUrl,
            news_articles::Column::SourceName,
            news_articles::Column::SourceDomain,
            news_articles::Column::SourceId,
            news_articles::Column::Tags,
            news_articles::Column::Country,
            news_articles::Column::Language,
            news_articles::Column::Category,
            news_articles::Column::PublishedAt,
            news_articles::Column::FetchedAt,
            news_articles::Column::AddedVia,
            news_articles::Column::IsStarred,
            news_articles::Column::IsDismissed,
            news_articles::Column::IsRead,
            news_articles::Column::AddedToIdeasAt,
            news_articles::Column::DismissedAt,
        ])
        // Exclude: Content (can be large text field)
        .order_by_desc(news_articles::Column::PublishedAt)
        .order_by_desc(news_articles::Column::FetchedAt)
        .limit(limit.unwrap_or(30))
        .offset(offset.unwrap_or(0))
        .into_model::<news_articles::Model>()
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
pub async fn dismiss_news_article_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    let mut active = m.into_active_model();
    active.dismissed_at = Set(Some(chrono::Utc::now()));
    active.is_dismissed = Set(1);
    active.updated_at = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

/// Toggle star status of a news article
pub async fn toggle_star_news_article_handler(
    id: i64,
    starred: bool,
    state: &crate::AppState,
) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    let mut active = m.into_active_model();
    active.is_starred = Set(if starred { 1 } else { 0 });
    active.updated_at = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

/// Mark news article as read
pub async fn mark_news_article_read_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    if m.is_read == 1 {
        return Ok(());
    }
    let mut active = m.into_active_model();
    active.is_read = Set(1);
    active.updated_at = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}
