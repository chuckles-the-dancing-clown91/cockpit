//! Writings Entity
//!
//! Your written content: articles, chapters, books
//! Status workflow: draft → in_progress → review → published → archived

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Writing type enum
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum WritingType {
    #[sea_orm(string_value = "article")]
    Article,
    #[sea_orm(string_value = "chapter")]
    Chapter,
    #[sea_orm(string_value = "book")]
    Book,
}

impl std::fmt::Display for WritingType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WritingType::Article => write!(f, "article"),
            WritingType::Chapter => write!(f, "chapter"),
            WritingType::Book => write!(f, "book"),
        }
    }
}

/// Writing status enum
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum WritingStatus {
    #[sea_orm(string_value = "draft")]
    Draft,
    #[sea_orm(string_value = "in_progress")]
    InProgress,
    #[sea_orm(string_value = "review")]
    Review,
    #[sea_orm(string_value = "published")]
    Published,
    #[sea_orm(string_value = "archived")]
    Archived,
}
impl std::fmt::Display for WritingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WritingStatus::Draft => write!(f, "draft"),
            WritingStatus::InProgress => write!(f, "in_progress"),
            WritingStatus::Review => write!(f, "review"),
            WritingStatus::Published => write!(f, "published"),
            WritingStatus::Archived => write!(f, "archived"),
        }
    }
}
/// Writings database model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "writings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    #[sea_orm(column_type = "String(StringLen::N(32))")]
    pub r#type: WritingType,
    
    pub title: String,
    pub slug: Option<String>,
    pub content_markdown: String,
    pub excerpt: Option<String>,
    
    pub status: WritingStatus,
    
    /// JSON array: ["war", "journalism"]
    pub tags: Option<String>,
    pub word_count: i32,
    
    /// Series support
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
    
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
    pub published_at: Option<DateTimeUtc>,
    
    pub is_pinned: i32,
    pub is_featured: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::writing_idea_links::Entity")]
    WritingIdeaLinks,
}

impl Related<super::writing_idea_links::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WritingIdeaLinks.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
