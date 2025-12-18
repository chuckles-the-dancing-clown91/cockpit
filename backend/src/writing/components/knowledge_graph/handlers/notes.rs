//! CRUD handlers for notes
//!
//! Provides functions for creating, reading, updating, and deleting notes.
//! Notes are polymorphic and can be attached to ideas, references, or writings.

use crate::core::components::errors::{AppError, AppResult};
use crate::writing::components::knowledge_graph::entities::notes::*;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// DTO for creating a note
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub entity_type: String, // "idea", "reference", "writing"
    pub entity_id: i64,
    pub body_html: String,
    pub note_type: Option<String>, // "main", "highlight", "annotation", "todo", "draft_note"
}

/// DTO for updating a note
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub body_html: Option<String>,
    pub note_type: Option<String>,
}

/// DTO for note response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteDto {
    pub id: i64,
    pub entity_type: String,
    pub entity_id: i64,
    pub note_type: String,
    pub body_html: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Convert Model to DTO
fn note_to_dto(model: Model) -> NoteDto {
    NoteDto {
        id: model.id,
        entity_type: model.entity_type.to_string(),
        entity_id: model.entity_id,
        note_type: model.note_type.unwrap_or_else(|| "main".to_string()),
        body_html: model.body_html,
        created_at: model.created_at.to_rfc3339(),
        updated_at: model.updated_at.to_rfc3339(),
    }
}

/// List notes for a specific entity
#[instrument(skip(db))]
pub async fn list_notes_for_entity(
    db: &sea_orm::DatabaseConnection,
    entity_type: String,
    entity_id: i64,
) -> AppResult<Vec<NoteDto>> {
    let results = Entity::find()
        .filter(Column::EntityType.eq(entity_type))
        .filter(Column::EntityId.eq(entity_id))
        .order_by_desc(Column::CreatedAt)
        .all(db)
        .await?;

    Ok(results.into_iter().map(note_to_dto).collect())
}

/// Get a single note by ID
pub async fn get_note(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<NoteDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Note not found: {}", id)))?;

    Ok(note_to_dto(model))
}

/// Create a new note
#[instrument(skip(db, input), fields(entity_type = %input.entity_type, entity_id = input.entity_id))]
pub async fn create_note(
    db: &sea_orm::DatabaseConnection,
    input: CreateNoteInput,
) -> AppResult<NoteDto> {
    // Parse entity type
    let entity_type = match input.entity_type.as_str() {
        "idea" => EntityType::Idea,
        "reference" => EntityType::Reference,
        "writing" => EntityType::Writing,
        _ => {
            return Err(AppError::other(format!(
                "Invalid entity type: {}",
                input.entity_type
            )))
        }
    };

    let now = Utc::now();

    let active = ActiveModel {
        entity_type: Set(entity_type),
        entity_id: Set(input.entity_id),
        note_type: Set(input.note_type.or(Some("main".to_string()))),
        body_html: Set(input.body_html),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let result = active.insert(db).await?;
    Ok(note_to_dto(result))
}

/// Update an existing note
#[instrument(skip(db, input), fields(id = id))]
pub async fn update_note(
    db: &sea_orm::DatabaseConnection,
    id: i64,
    input: UpdateNoteInput,
) -> AppResult<NoteDto> {
    let model = Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Note not found: {}", id)))?;

    let mut active: ActiveModel = model.into_active_model();

    if let Some(body_html) = input.body_html {
        active.body_html = Set(body_html);
    }
    if let Some(note_type_str) = input.note_type {
        active.note_type = Set(Some(note_type_str));
    }

    active.updated_at = Set(Utc::now());

    let result = active.update(db).await?;
    Ok(note_to_dto(result))
}

/// Delete a note
pub async fn delete_note(db: &sea_orm::DatabaseConnection, id: i64) -> AppResult<()> {
    Entity::delete_by_id(id).exec(db).await?;
    Ok(())
}
