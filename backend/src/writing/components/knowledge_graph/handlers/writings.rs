//! CRUD handlers for writings
//!
//! Provides functions for creating, reading, updating, and deleting writings.
//! Writings are your outputs: articles, chapters, books.

use crate::core::components::errors::{AppError, AppResult};
use crate::writing::components::knowledge_graph::entities::writings::*;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// DTO for creating a writing
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWritingInput {
    pub r#type: Option<String>, // "article", "chapter", "book"
    pub title: String,
    pub slug: Option<String>,
    pub content_markdown: Option<String>,
    pub excerpt: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
}

/// DTO for updating a writing
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWritingInput {
    pub title: Option<String>,
    pub slug: Option<String>,
    pub content_markdown: Option<String>,
    pub excerpt: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub word_count: Option<i32>,
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
    pub is_pinned: Option<bool>,
    pub is_featured: Option<bool>,
}

/// DTO for writing response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingDto {
    pub id: i64,
    pub r#type: String,
    pub title: String,
    pub slug: Option<String>,
    pub content_markdown: String,
    pub excerpt: Option<String>,
    pub status: String,
    pub tags: Vec<String>,
    pub word_count: i32,
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
    pub published_at: Option<String>,
    pub is_pinned: bool,
    pub is_featured: bool,
}

/// Convert Model to DTO
fn writing_to_dto(model: Model) -> WritingDto {
    let tags: Vec<String> = model
        .tags
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default();

    WritingDto {
        id: model.id,
        r#type: model.r#type.to_string(),
        title: model.title,
        slug: model.slug,
        content_markdown: model.content_markdown,
        excerpt: model.excerpt,
        status: model.status.to_string(),
        tags,
        word_count: model.word_count,
        series_name: model.series_name,
        series_part: model.series_part,
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
        published_at: model.published_at.map(|dt| dt.to_rfc3339()),
        is_pinned: model.is_pinned != 0,
        is_featured: model.is_featured != 0,
    }
}

/// List writings with filtering
#[instrument(skip(db))]
pub async fn list_writings(
    db: &sea_orm::DatabaseConnection,
    r#type: Option<String>,
    status: Option<String>,
    search: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> AppResult<Vec<WritingDto>> {
    let mut query = Entity::find();

    if let Some(writing_type) = r#type {
        query = query.filter(Column::Type.eq(writing_type));
    }

    if let Some(status) = status {
        query = query.filter(Column::Status.eq(status));
    }

    if let Some(search) = search {
        let pattern = format!("%{}%", search);
        query = query.filter(
            Condition::any()
                .add(Column::Title.like(pattern.clone()))
                .add(Column::Excerpt.like(pattern)),
        );
    }

    let results = query
        .order_by_desc(Column::UpdatedAt)
        .paginate(db, limit.unwrap_or(50))
        .fetch_page(offset.unwrap_or(0))
        .await?;

    Ok(results.into_iter().map(writing_to_dto).collect())
}

/// Get a single writing by ID
pub async fn get_writing(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<WritingDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Writing not found: {}", id)))?;

    Ok(writing_to_dto(model))
}

/// Create a new writing
#[instrument(skip(db, input), fields(title = %input.title))]
pub async fn create_writing(
    db: &sea_orm::DatabaseConnection,
    input: CreateWritingInput,
) -> AppResult<WritingDto> {
    // Parse writing type
    let writing_type = match input.r#type.as_deref() {
        Some("article") | None => WritingType::Article,
        Some("chapter") => WritingType::Chapter,
        Some("book") => WritingType::Book,
        Some(t) => return Err(AppError::other(format!("Invalid writing type: {}", t))),
    };

    // Parse status
    let status = match input.status.as_deref() {
        Some("draft") | None => WritingStatus::Draft,
        Some("in_progress") => WritingStatus::InProgress,
        Some("review") => WritingStatus::Review,
        Some("published") => WritingStatus::Published,
        Some("archived") => WritingStatus::Archived,
        Some(s) => return Err(AppError::other(format!("Invalid status: {}", s))),
    };

    let tags_json = input
        .tags
        .map(|t| serde_json::to_string(&t).unwrap_or_else(|_| "[]".to_string()));

    let content = input.content_markdown.unwrap_or_default();
    let word_count = content.split_whitespace().count() as i32;

    let now = Utc::now();

    let active = ActiveModel {
        r#type: Set(writing_type),
        title: Set(input.title),
        slug: Set(input.slug),
        content_markdown: Set(content),
        excerpt: Set(input.excerpt),
        status: Set(status),
        tags: Set(tags_json),
        word_count: Set(word_count),
        series_name: Set(input.series_name),
        series_part: Set(input.series_part),
        created_at: Set(now),
        updated_at: Set(now),
        published_at: Set(None),
        is_pinned: Set(0),
        is_featured: Set(0),
        ..Default::default()
    };

    let result = active.insert(db).await?;
    Ok(writing_to_dto(result))
}

/// Update an existing writing
#[instrument(skip(db, input), fields(id = id))]
pub async fn update_writing(
    db: &sea_orm::DatabaseConnection,
    id: i64,
    input: UpdateWritingInput,
) -> AppResult<WritingDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Writing not found: {}", id)))?;

    let mut active: ActiveModel = model.into_active_model();

    if let Some(title) = input.title {
        active.title = Set(title);
    }
    if let Some(slug) = input.slug {
        active.slug = Set(Some(slug));
    }
    if let Some(content) = input.content_markdown {
        let word_count = content.split_whitespace().count() as i32;
        active.content_markdown = Set(content);
        active.word_count = Set(word_count);
    }
    if let Some(excerpt) = input.excerpt {
        active.excerpt = Set(Some(excerpt));
    }
    if let Some(status_str) = input.status {
        let status = match status_str.as_str() {
            "draft" => WritingStatus::Draft,
            "in_progress" => WritingStatus::InProgress,
            "review" => WritingStatus::Review,
            "published" => WritingStatus::Published,
            "archived" => WritingStatus::Archived,
            s => return Err(AppError::other(format!("Invalid status: {}", s))),
        };
        active.status = Set(status);
    }
    if let Some(tags) = input.tags {
        let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
        active.tags = Set(Some(tags_json));
    }
    if let Some(word_count) = input.word_count {
        active.word_count = Set(word_count);
    }
    if let Some(series_name) = input.series_name {
        active.series_name = Set(Some(series_name));
    }
    if let Some(series_part) = input.series_part {
        active.series_part = Set(Some(series_part));
    }
    if let Some(is_pinned) = input.is_pinned {
        active.is_pinned = Set(if is_pinned { 1 } else { 0 });
    }
    if let Some(is_featured) = input.is_featured {
        active.is_featured = Set(if is_featured { 1 } else { 0 });
    }

    active.updated_at = Set(Utc::now());

    let result = active.update(db).await?;
    Ok(writing_to_dto(result))
}

/// Publish a writing (sets status and published_at)
pub async fn publish_writing(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<WritingDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Writing not found: {}", id)))?;

    let mut active: ActiveModel = model.into_active_model();
    active.status = Set(WritingStatus::Published);
    active.published_at = Set(Some(Utc::now()));
    active.updated_at = Set(Utc::now());

    let result = active.update(db).await?;
    Ok(writing_to_dto(result))
}

/// Delete a writing
pub async fn delete_writing(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<()> {
    Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}
