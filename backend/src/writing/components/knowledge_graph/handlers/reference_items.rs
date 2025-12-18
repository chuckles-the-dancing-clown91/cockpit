//! CRUD handlers for reference items
//!
//! Provides functions for creating, reading, updating, and deleting reference items.
//! Reference items are unified sources: news articles, URLs, tweets, papers, books, PDFs, manuals.

use crate::core::components::errors::{AppError, AppResult};
use crate::writing::components::knowledge_graph::entities::reference_items::*;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// DTO for creating a reference
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReferenceInput {
    pub reference_type: String, // "news_article", "url", "tweet", "paper", "book", "pdf", "manual"
    pub title: String,
    pub url: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<String>, // ISO 8601 datetime
    pub summary: Option<String>,
    pub news_article_id: Option<i64>, // Link to existing news article
    pub metadata: Option<String>, // JSON object
}

/// DTO for updating a reference
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReferenceInput {
    pub title: Option<String>,
    pub url: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<String>,
    pub summary: Option<String>,
    pub metadata: Option<String>,
}

/// DTO for reference response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceDto {
    pub id: i64,
    pub reference_type: String,
    pub title: String,
    pub url: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<String>,
    pub summary: Option<String>,
    pub news_article_id: Option<i64>,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Convert Model to DTO
fn reference_to_dto(model: Model) -> ReferenceDto {
    ReferenceDto {
        id: model.id,
        reference_type: model.reference_type.to_string(),
        title: model.title,
        url: model.url,
        author: model.author,
        published_date: model.published_date.map(|dt| dt.to_rfc3339()),
        summary: model.summary,
        news_article_id: model.news_article_id,
        metadata: model.metadata,
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
    }
}

/// List reference items with filtering
#[instrument(skip(db))]
pub async fn list_references(
    db: &sea_orm::DatabaseConnection,
    reference_type: Option<String>,
    search: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> AppResult<Vec<ReferenceDto>> {
    let mut query = Entity::find();

    if let Some(ref_type) = reference_type {
        query = query.filter(Column::ReferenceType.eq(ref_type));
    }

    if let Some(search) = search {
        let pattern = format!("%{}%", search);
        query = query.filter(
            Condition::any()
                .add(Column::Title.like(pattern.clone()))
                .add(Column::Author.like(pattern)),
        );
    }

    let results = query
        .order_by_desc(Column::CreatedAt)
        .paginate(db, limit.unwrap_or(50))
        .fetch_page(offset.unwrap_or(0))
        .await?;

    Ok(results.into_iter().map(reference_to_dto).collect())
}

/// Get a single reference by ID
pub async fn get_reference(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<ReferenceDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference not found: {}", id)))?;

    Ok(reference_to_dto(model))
}

/// Create a new reference
#[instrument(skip(db, input), fields(reference_type = %input.reference_type))]
pub async fn create_reference(
    db: &sea_orm::DatabaseConnection,
    input: CreateReferenceInput,
) -> AppResult<ReferenceDto> {
    // Parse reference type
    let reference_type = match input.reference_type.as_str() {
        "news_article" => ReferenceType::NewsArticle,
        "url" => ReferenceType::Url,
        "tweet" => ReferenceType::Tweet,
        "paper" => ReferenceType::Paper,
        "book" => ReferenceType::Book,
        "pdf" => ReferenceType::Pdf,
        "manual" => ReferenceType::Manual,
        _ => {
            return Err(AppError::other(format!(
                "Invalid reference type: {}",
                input.reference_type
            )))
        }
    };

    // Parse optional published date
    let published_date = if let Some(date_str) = input.published_date {
        Some(
            chrono::DateTime::parse_from_rfc3339(&date_str)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .map_err(|e| AppError::other(format!("Invalid published_date: {}", e)))?,
        )
    } else {
        None
    };

    let now = Utc::now();

    let active = ActiveModel {
        reference_type: Set(reference_type),
        title: Set(input.title),
        url: Set(input.url),
        author: Set(input.author),
        published_date: Set(published_date),
        summary: Set(input.summary),
        news_article_id: Set(input.news_article_id),
        metadata: Set(input.metadata),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let result = active.insert(db).await?;
    Ok(reference_to_dto(result))
}

/// Update an existing reference
#[instrument(skip(db, input), fields(id = id))]
pub async fn update_reference(
    db: &sea_orm::DatabaseConnection,
    id: i64,
    input: UpdateReferenceInput,
) -> AppResult<ReferenceDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference not found: {}", id)))?;

    let mut active: ActiveModel = model.into_active_model();

    if let Some(title) = input.title {
        active.title = Set(title);
    }
    if let Some(url) = input.url {
        active.url = Set(Some(url));
    }
    if let Some(author) = input.author {
        active.author = Set(Some(author));
    }
    if let Some(date_str) = input.published_date {
        let parsed = chrono::DateTime::parse_from_rfc3339(&date_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .map_err(|e| AppError::other(format!("Invalid published_date: {}", e)))?;
        active.published_date = Set(Some(parsed));
    }
    if let Some(summary) = input.summary {
        active.summary = Set(Some(summary));
    }
    if let Some(metadata) = input.metadata {
        active.metadata = Set(Some(metadata));
    }

    active.updated_at = Set(Utc::now());

    let result = active.update(db).await?;
    Ok(reference_to_dto(result))
}

/// Delete a reference
pub async fn delete_reference(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<()> {
    Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}
