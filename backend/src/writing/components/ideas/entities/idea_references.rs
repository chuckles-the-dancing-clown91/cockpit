//! Idea References Entity
//! Represents resources attached to ideas (articles, URLs, etc.)

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "idea_references")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub idea_id: i64,
    pub reference_type: String, // 'article' | 'manual' | 'url'
    
    // Article reference fields
    pub news_article_id: Option<i64>,
    
    // Manual/URL reference fields
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    
    // Shared fields
    pub notes_markdown: Option<String>,
    pub source_id: Option<i64>,
    
    // Metadata
    pub added_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
