#![allow(dead_code)]
//! Notes Entity
//!
//! Polymorphic notes attached to ideas, references, or writings
//! entity_type + entity_id pattern for flexible associations

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Entity type enum - what this note is attached to
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum EntityType {
    #[sea_orm(string_value = "idea")]
    Idea,
    #[sea_orm(string_value = "reference")]
    Reference,
    #[sea_orm(string_value = "reader_reference")]
    ReaderReference,
    #[sea_orm(string_value = "writing")]
    Writing,
}

impl std::fmt::Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EntityType::Idea => write!(f, "idea"),
            EntityType::Reference => write!(f, "reference"),
            EntityType::ReaderReference => write!(f, "reader_reference"),
            EntityType::Writing => write!(f, "writing"),
        }
    }
}

/// Note type enum - categorize notes
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum NoteType {
    /// Main note document for an entity (one per entity)
    #[sea_orm(string_value = "main")]
    Main,
    #[sea_orm(string_value = "highlight")]
    Highlight,
    #[sea_orm(string_value = "annotation")]
    Annotation,
    #[sea_orm(string_value = "todo")]
    Todo,
    #[sea_orm(string_value = "draft_note")]
    DraftNote,
}

impl std::fmt::Display for NoteType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NoteType::Main => write!(f, "main"),
            NoteType::Highlight => write!(f, "highlight"),
            NoteType::Annotation => write!(f, "annotation"),
            NoteType::Todo => write!(f, "todo"),
            NoteType::DraftNote => write!(f, "draft_note"),
        }
    }
}

/// Notes database model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "notes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    pub entity_type: EntityType,
    pub entity_id: i64,
    
    pub note_type: Option<String>,
    
    /// HTML content (TipTap is HTML-native)
    /// Column name is body_markdown for historical reasons
    #[sea_orm(column_name = "body_markdown")]
    pub body_html: String,
    
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
