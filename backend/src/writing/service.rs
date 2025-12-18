//! Writing service layer
//!
//! Business logic for creating, updating, and managing writings with TipTap JSON content

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    QueryOrder, Set, TransactionTrait,
};
use chrono::Utc;
use serde_json::Value as JsonValue;

use crate::writing::components::knowledge_graph::entities::{writings, writing_idea_links};
use crate::writing::text::{extract_plain_text, word_count};

/// Create a new writing with TipTap JSON content
///
/// # Arguments
/// * `db` - Database connection
/// * `title` - Writing title
/// * `slug` - Optional URL slug
/// * `writing_type` - Type enum (article/chapter/book)
/// * `link_idea_ids` - Ideas to link on creation
/// * `initial_content_json` - TipTap editor JSON
/// * `excerpt` - Optional excerpt/summary
/// * `tags` - Optional comma-separated tags
///
/// # Returns
/// Created writing model
pub async fn create_writing(
    db: &DatabaseConnection,
    title: String,
    slug: Option<String>,
    writing_type: writings::WritingType,
    link_idea_ids: Vec<i64>,
    initial_content_json: JsonValue,
    excerpt: Option<String>,
    tags: Option<String>,
) -> Result<writings::Model, DbErr> {
    let tx = db.begin().await?;

    // Extract plain text for search/preview
    let content_text = extract_plain_text(&initial_content_json);
    let wc = word_count(&content_text);

    // Store JSON as string in content_markdown column
    let content_json_str = serde_json::to_string(&initial_content_json)
        .map_err(|e| DbErr::Custom(format!("JSON serialization failed: {}", e)))?;

    let now = Utc::now();

    let writing = writings::ActiveModel {
        r#type: Set(writing_type),
        title: Set(title),
        slug: Set(slug),
        content_markdown: Set(content_json_str),
        excerpt: Set(excerpt),
        status: Set(writings::WritingStatus::Draft),
        tags: Set(tags),
        word_count: Set(wc),
        series_name: Set(None),
        series_part: Set(None),
        is_pinned: Set(0),
        is_featured: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
        published_at: Set(None),
        ..Default::default()
    }
    .insert(&tx)
    .await?;

    // Link ideas with "primary" purpose
    for idea_id in link_idea_ids {
        let _ = writing_idea_links::ActiveModel {
            writing_id: Set(writing.id),
            idea_id: Set(idea_id),
            purpose: Set(writing_idea_links::WritingPurpose::Primary),
            notes: Set(None),
            link_order: Set(0),
            created_at: Set(now),
            ..Default::default()
        }
        .insert(&tx)
        .await;
        // Ignore duplicate key errors if constraint exists
    }

    tx.commit().await?;
    Ok(writing)
}

/// Get writing by ID
pub async fn get_writing(
    db: &DatabaseConnection,
    writing_id: i64,
) -> Result<writings::Model, DbErr> {
    writings::Entity::find_by_id(writing_id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!(
            "Writing {} not found",
            writing_id
        )))
}

/// List writings with optional filters
pub async fn list_writings(
    db: &DatabaseConnection,
    status: Option<writings::WritingStatus>,
    writing_type: Option<writings::WritingType>,
    series_name: Option<String>,
    is_pinned: Option<bool>,
    is_featured: Option<bool>,
) -> Result<Vec<writings::Model>, DbErr> {
    let mut query = writings::Entity::find();

    if let Some(s) = status {
        query = query.filter(writings::Column::Status.eq(s));
    }
    if let Some(t) = writing_type {
        query = query.filter(writings::Column::Type.eq(t));
    }
    if let Some(sn) = series_name {
        query = query.filter(writings::Column::SeriesName.eq(sn));
    }
    if let Some(pinned) = is_pinned {
        query = query.filter(writings::Column::IsPinned.eq(if pinned { 1 } else { 0 }));
    }
    if let Some(featured) = is_featured {
        query = query.filter(writings::Column::IsFeatured.eq(if featured { 1 } else { 0 }));
    }

    query
        .order_by_desc(writings::Column::UpdatedAt)
        .all(db)
        .await
}

/// Update writing metadata (title, status, tags, etc.)
pub async fn update_writing_meta(
    db: &DatabaseConnection,
    writing_id: i64,
    title: Option<String>,
    slug: Option<String>,
    writing_type: Option<writings::WritingType>,
    status: Option<writings::WritingStatus>,
    excerpt: Option<String>,
    tags: Option<String>,
    series_name: Option<String>,
    series_part: Option<i32>,
    is_pinned: Option<bool>,
    is_featured: Option<bool>,
) -> Result<writings::Model, DbErr> {
    let w = writings::Entity::find_by_id(writing_id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!(
            "Writing {} not found",
            writing_id
        )))?;

    let mut am: writings::ActiveModel = w.into();

    if let Some(t) = title {
        am.title = Set(t);
    }
    if let Some(s) = slug {
        am.slug = Set(Some(s));
    }
    if let Some(t) = writing_type {
        am.r#type = Set(t);
    }
    if let Some(s) = status {
        am.status = Set(s);
    }
    if let Some(e) = excerpt {
        am.excerpt = Set(Some(e));
    }
    if let Some(t) = tags {
        am.tags = Set(Some(t));
    }
    if let Some(sn) = series_name {
        am.series_name = Set(Some(sn));
    }
    if let Some(sp) = series_part {
        am.series_part = Set(Some(sp));
    }
    if let Some(pinned) = is_pinned {
        am.is_pinned = Set(if pinned { 1 } else { 0 });
    }
    if let Some(featured) = is_featured {
        am.is_featured = Set(if featured { 1 } else { 0 });
    }

    am.updated_at = Set(Utc::now());

    am.update(db).await
}

/// Save draft content (TipTap JSON)
pub async fn save_draft(
    db: &DatabaseConnection,
    writing_id: i64,
    content_json: JsonValue,
) -> Result<writings::Model, DbErr> {
    let w = writings::Entity::find_by_id(writing_id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!(
            "Writing {} not found",
            writing_id
        )))?;

    // Extract plain text for search
    let content_text = extract_plain_text(&content_json);
    let wc = word_count(&content_text);

    // Serialize JSON to string
    let content_json_str = serde_json::to_string(&content_json)
        .map_err(|e| DbErr::Custom(format!("JSON serialization failed: {}", e)))?;

    let mut am: writings::ActiveModel = w.into();
    am.content_markdown = Set(content_json_str);
    am.word_count = Set(wc);
    am.updated_at = Set(Utc::now());

    am.update(db).await
}

/// Publish a writing (set status to published, set published_at)
pub async fn publish_writing(
    db: &DatabaseConnection,
    writing_id: i64,
) -> Result<writings::Model, DbErr> {
    let w = writings::Entity::find_by_id(writing_id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!(
            "Writing {} not found",
            writing_id
        )))?;

    let mut am: writings::ActiveModel = w.into();
    am.status = Set(writings::WritingStatus::Published);
    am.published_at = Set(Some(Utc::now()));
    am.updated_at = Set(Utc::now());

    am.update(db).await
}

/// Link an idea to a writing
pub async fn link_idea(
    db: &DatabaseConnection,
    writing_id: i64,
    idea_id: i64,
    purpose: writing_idea_links::WritingPurpose,
) -> Result<(), DbErr> {
    let _ = writing_idea_links::ActiveModel {
        writing_id: Set(writing_id),
        idea_id: Set(idea_id),
        purpose: Set(purpose),
        notes: Set(None),
        link_order: Set(0),
        created_at: Set(Utc::now()),
        ..Default::default()
    }
    .insert(db)
    .await;
    Ok(())
}

/// Unlink an idea from a writing
pub async fn unlink_idea(
    db: &DatabaseConnection,
    writing_id: i64,
    idea_id: i64,
) -> Result<(), DbErr> {
    writing_idea_links::Entity::delete_many()
        .filter(writing_idea_links::Column::WritingId.eq(writing_id))
        .filter(writing_idea_links::Column::IdeaId.eq(idea_id))
        .exec(db)
        .await?;
    Ok(())
}

/// List ideas linked to a writing
pub async fn list_linked_ideas(
    db: &DatabaseConnection,
    writing_id: i64,
) -> Result<Vec<writing_idea_links::Model>, DbErr> {
    writing_idea_links::Entity::find()
        .filter(writing_idea_links::Column::WritingId.eq(writing_id))
        .order_by_asc(writing_idea_links::Column::LinkOrder)
        .order_by_desc(writing_idea_links::Column::CreatedAt)
        .all(db)
        .await
}
