//! Handlers for link tables (many-to-many relationships)
//!
//! Handles idea_reference_links and writing_idea_links.

use crate::core::components::errors::{AppError, AppResult};
use crate::writing::components::knowledge_graph::entities::{
    idea_reference_links, writing_idea_links,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use tracing::instrument;

// ============================================================================
// Idea Reference Links
// ============================================================================

/// DTO for creating idea-reference link
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkIdeaReferenceInput {
    pub idea_id: i64,
    pub reference_id: i64,
    pub role: Option<String>, // "supporting", "counter", "quote", "background"
    pub link_order: Option<i32>,
}

/// DTO for idea-reference link response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaReferenceLinkDto {
    pub id: i64,
    pub idea_id: i64,
    pub reference_id: i64,
    pub role: String,
    pub notes: Option<String>,
    pub link_order: i32,
    pub created_at: String,
}

/// Convert Model to DTO
fn idea_ref_link_to_dto(model: idea_reference_links::Model) -> IdeaReferenceLinkDto {
    IdeaReferenceLinkDto {
        id: model.id,
        idea_id: model.idea_id,
        reference_id: model.reference_id,
        role: model.role.to_string(),
        notes: model.notes,
        link_order: model.link_order,
        created_at: model.created_at.to_rfc3339(),
    }
}

/// Link a reference to an idea
#[instrument(skip(db), fields(idea_id = input.idea_id, reference_id = input.reference_id))]
pub async fn link_idea_reference(
    db: &sea_orm::DatabaseConnection,
    input: LinkIdeaReferenceInput,
) -> AppResult<IdeaReferenceLinkDto> {
    use idea_reference_links::*;

    // Parse role
    let role = match input.role.as_deref() {
        Some("supporting") => ReferenceRole::Supporting,
        Some("counter") => ReferenceRole::Counter,
        Some("quote") => ReferenceRole::Quote,
        Some("background") | None => ReferenceRole::Background,
        Some(r) => return Err(AppError::other(format!("Invalid role: {}", r))),
    };

    let active = ActiveModel {
        idea_id: Set(input.idea_id),
        reference_id: Set(input.reference_id),
        role: Set(role),
        notes: Set(None),
        link_order: Set(input.link_order.unwrap_or(0)),
        created_at: Set(Utc::now()),
        ..Default::default()
    };

    let result = active.insert(db).await?;
    Ok(idea_ref_link_to_dto(result))
}

/// Unlink a reference from an idea
pub async fn unlink_idea_reference(
    db: &sea_orm::DatabaseConnection,
    idea_id: i64,
    reference_id: i64,
) -> AppResult<()> {
    use idea_reference_links::*;

    Entity::delete_many()
        .filter(Column::IdeaId.eq(idea_id))
        .filter(Column::ReferenceId.eq(reference_id))
        .exec(db)
        .await?;

    Ok(())
}

/// List references for an idea
pub async fn list_references_for_idea(
    db: &sea_orm::DatabaseConnection,
    idea_id: i64,
) -> AppResult<Vec<IdeaReferenceLinkDto>> {
    use idea_reference_links::*;

    let results = Entity::find()
        .filter(Column::IdeaId.eq(idea_id))
        .all(db)
        .await?;

    Ok(results.into_iter().map(idea_ref_link_to_dto).collect())
}

/// List ideas for a reference
pub async fn list_ideas_for_reference(
    db: &sea_orm::DatabaseConnection,
    reference_id: i64,
) -> AppResult<Vec<IdeaReferenceLinkDto>> {
    use idea_reference_links::*;

    let results = Entity::find()
        .filter(Column::ReferenceId.eq(reference_id))
        .all(db)
        .await?;

    Ok(results.into_iter().map(idea_ref_link_to_dto).collect())
}

// ============================================================================
// Writing Idea Links
// ============================================================================

/// DTO for creating writing-idea link
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkWritingIdeaInput {
    pub writing_id: i64,
    pub idea_id: i64,
    pub purpose: Option<String>, // "primary", "secondary", "mention"
    pub link_order: Option<i32>,
}

/// DTO for writing-idea link response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingIdeaLinkDto {
    pub id: i64,
    pub writing_id: i64,
    pub idea_id: i64,
    pub purpose: String,
    pub notes: Option<String>,
    pub link_order: i32,
    pub created_at: String,
}

/// Convert Model to DTO
fn writing_idea_link_to_dto(model: writing_idea_links::Model) -> WritingIdeaLinkDto {
    WritingIdeaLinkDto {
        id: model.id,
        writing_id: model.writing_id,
        idea_id: model.idea_id,
        purpose: model.purpose.unwrap_or_else(|| "secondary".to_string()),
        notes: None,
        link_order: model.link_order,
        created_at: model.created_at.to_rfc3339(),
    }
}

/// Link an idea to a writing
#[instrument(skip(db), fields(writing_id = input.writing_id, idea_id = input.idea_id))]
pub async fn link_writing_idea(
    db: &sea_orm::DatabaseConnection,
    input: LinkWritingIdeaInput,
) -> AppResult<WritingIdeaLinkDto> {
    use writing_idea_links::*;

    // Parse purpose - validate and default to "secondary"
    let purpose = match input.purpose.as_deref() {
        Some("primary") => Some("primary".to_string()),
        Some("secondary") => Some("secondary".to_string()),
        Some("mention") => Some("mention".to_string()),
        None => Some("secondary".to_string()),
        Some(p) => return Err(AppError::other(format!("Invalid purpose: {}", p))),
    };

    let active = ActiveModel {
        writing_id: Set(input.writing_id),
        idea_id: Set(input.idea_id),
        purpose: Set(purpose),
        link_order: Set(input.link_order.unwrap_or(0)),
        created_at: Set(Utc::now()),
        ..Default::default()
    };

    let result = active.insert(db).await?;
    Ok(writing_idea_link_to_dto(result))
}

/// Unlink an idea from a writing
pub async fn unlink_writing_idea(
    db: &sea_orm::DatabaseConnection,
    writing_id: i64,
    idea_id: i64,
) -> AppResult<()> {
    use writing_idea_links::*;

    Entity::delete_many()
        .filter(Column::WritingId.eq(writing_id))
        .filter(Column::IdeaId.eq(idea_id))
        .exec(db)
        .await?;

    Ok(())
}

/// List ideas for a writing
pub async fn list_ideas_for_writing(
    db: &sea_orm::DatabaseConnection,
    writing_id: i64,
) -> AppResult<Vec<WritingIdeaLinkDto>> {
    use writing_idea_links::*;

    let results = Entity::find()
        .filter(Column::WritingId.eq(writing_id))
        .all(db)
        .await?;

    Ok(results.into_iter().map(writing_idea_link_to_dto).collect())
}

/// List writings for an idea
pub async fn list_writings_for_idea(
    db: &sea_orm::DatabaseConnection,
    idea_id: i64,
) -> AppResult<Vec<WritingIdeaLinkDto>> {
    use writing_idea_links::*;

    let results = Entity::find()
        .filter(Column::IdeaId.eq(idea_id))
        .all(db)
        .await?;

    Ok(results.into_iter().map(writing_idea_link_to_dto).collect())
}
