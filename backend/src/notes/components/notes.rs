//! Notes Feature - Business Logic
//!
//! Handles polymorphic notes attached to ideas, references, and writings.
//! Notes are 1:1 per entity (per note_type), with "main" being the primary note document.

use chrono::Utc;
use sea_orm::{ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::core::components::errors::{AppError, AppResult};
use crate::writing::components::knowledge_graph::entities::notes::{self, Entity as Notes};

/// DTO for note responses (camelCase for frontend compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl From<notes::Model> for NoteDto {
    fn from(model: notes::Model) -> Self {
        Self {
            id: model.id,
            entity_type: model.entity_type.to_string(),
            entity_id: model.entity_id,
            note_type: model.note_type.unwrap_or_else(|| "main".to_string()),
            body_html: model.body_html,
            created_at: model.created_at.to_rfc3339(),
            updated_at: model.updated_at.to_rfc3339(),
        }
    }
}

/// Get or create a note for an entity
///
/// If the note doesn't exist, creates an empty one.
/// Always returns a note (never None).
pub async fn get_or_create(
    db: &DatabaseConnection,
    entity_type: &str,
    entity_id: i64,
    note_type: Option<&str>,
) -> AppResult<NoteDto> {
    let note_type = note_type.unwrap_or("main");
    
    // Validate entity type
    let entity_type_enum = parse_entity_type(entity_type)?;
    
    // Try to find existing note
    let existing = Notes::find()
        .filter(notes::Column::EntityType.eq(entity_type_enum.clone()))
        .filter(notes::Column::EntityId.eq(entity_id))
        .filter(notes::Column::NoteType.eq(note_type))
        .one(db)
        .await?;
    
    if let Some(note) = existing {
        return Ok(note.into());
    }
    
    // Create new empty note
    let now = Utc::now();
    let new_note = notes::ActiveModel {
        entity_type: ActiveValue::Set(entity_type_enum),
        entity_id: ActiveValue::Set(entity_id),
        note_type: ActiveValue::Set(Some(note_type.to_string())),
        body_html: ActiveValue::Set(String::new()),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
        ..Default::default()
    };
    
    let result = new_note
        .insert(db)
        .await?;
    
    Ok(result.into())
}

/// Upsert a note's content
///
/// Creates a new note if it doesn't exist, or updates the existing one.
pub async fn upsert(
    db: &DatabaseConnection,
    entity_type: &str,
    entity_id: i64,
    note_type: Option<&str>,
    body_html: &str,
) -> AppResult<NoteDto> {
    let note_type = note_type.unwrap_or("main");
    
    // Validate entity type
    let entity_type_enum = parse_entity_type(entity_type)?;
    
    // Try to find existing note
    let existing = Notes::find()
        .filter(notes::Column::EntityType.eq(entity_type_enum.clone()))
        .filter(notes::Column::EntityId.eq(entity_id))
        .filter(notes::Column::NoteType.eq(note_type))
        .one(db)
        .await?;
    
    let now = Utc::now();
    
    let result = if let Some(existing_note) = existing {
        // Update existing note
        let mut active: notes::ActiveModel = existing_note.into();
        active.body_html = ActiveValue::Set(body_html.to_string());
        active.updated_at = ActiveValue::Set(now);
        
        active
            .update(db)
            .await?
    } else {
        // Create new note
        let new_note = notes::ActiveModel {
            entity_type: ActiveValue::Set(entity_type_enum),
            entity_id: ActiveValue::Set(entity_id),
            note_type: ActiveValue::Set(Some(note_type.to_string())),
            body_html: ActiveValue::Set(body_html.to_string()),
            created_at: ActiveValue::Set(now),
            updated_at: ActiveValue::Set(now),
            ..Default::default()
        };
        
        new_note
            .insert(db)
            .await?
    };
    
    Ok(result.into())
}

/// Append a snippet to a note with divider
///
/// If the note is empty, just adds the snippet.
/// If not empty, adds `<hr />` divider before the snippet.
/// Optionally includes source attribution.
pub async fn append_snippet(
    db: &DatabaseConnection,
    entity_type: &str,
    entity_id: i64,
    note_type: Option<&str>,
    snippet_text: &str,
    source_url: Option<&str>,
    source_title: Option<&str>,
) -> AppResult<NoteDto> {
    let note_type = note_type.unwrap_or("main");
    
    // Get or create the note
    let note = get_or_create(db, entity_type, entity_id, Some(note_type)).await?;
    
    // Build the snippet HTML
    let mut new_content = String::new();
    
    // Add divider if note already has content
    if !note.body_html.trim().is_empty() {
        new_content.push_str("<hr />\n");
    }
    
    // Add the snippet content
    new_content.push_str(&format!("<p>{}</p>\n", html_escape(snippet_text)));
    
    // Add source attribution if provided
    if let Some(url) = source_url {
        let title = source_title.unwrap_or(url);
        new_content.push_str(&format!(
            "<p><small>Source: <a href=\"{}\">{}</a></small></p>\n",
            html_escape(url),
            html_escape(title)
        ));
    }
    
    // Append to existing content
    let updated_html = format!("{}{}", note.body_html, new_content);
    
    // Save back
    upsert(db, entity_type, entity_id, Some(note_type), &updated_html).await
}

/// Parse entity type string to enum
fn parse_entity_type(entity_type: &str) -> AppResult<notes::EntityType> {
    use crate::writing::components::knowledge_graph::entities::notes::EntityType;
    
    match entity_type {
        "idea" => Ok(EntityType::Idea),
        "reference" => Ok(EntityType::Reference),
        "writing" => Ok(EntityType::Writing),
        _ => Err(AppError::validation(
            "entity_type",
            format!("Invalid value '{}'. Must be one of: idea, reference, writing", entity_type),
        )),
    }
}

/// Basic HTML escaping to prevent injection
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_html_escape() {
        assert_eq!(html_escape("<script>alert('xss')</script>"), 
                   "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
        assert_eq!(html_escape("normal text"), "normal text");
        assert_eq!(html_escape("a & b"), "a &amp; b");
    }

    #[test]
    fn test_parse_entity_type() {
        assert!(parse_entity_type("idea").is_ok());
        assert!(parse_entity_type("reference").is_ok());
        assert!(parse_entity_type("writing").is_ok());
        assert!(parse_entity_type("invalid").is_err());
    }
}
