//! Reference Items Entity
//!
//! Unified sources: news articles, URLs, tweets, papers, books, PDFs, manuals

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Reference type enum
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum ReferenceType {
    #[sea_orm(string_value = "news_article")]
    NewsArticle,
    #[sea_orm(string_value = "url")]
    Url,
    #[sea_orm(string_value = "tweet")]
    Tweet,
    #[sea_orm(string_value = "paper")]
    Paper,
    #[sea_orm(string_value = "book")]
    Book,
    #[sea_orm(string_value = "pdf")]
    Pdf,
    #[sea_orm(string_value = "manual")]
    Manual,
}

impl std::fmt::Display for ReferenceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReferenceType::NewsArticle => write!(f, "news_article"),
            ReferenceType::Url => write!(f, "url"),
            ReferenceType::Tweet => write!(f, "tweet"),
            ReferenceType::Paper => write!(f, "paper"),
            ReferenceType::Book => write!(f, "book"),
            ReferenceType::Pdf => write!(f, "pdf"),
            ReferenceType::Manual => write!(f, "manual"),
        }
    }
}

/// Reference Items database model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "reference_items")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    #[sea_orm(column_type = "String(StringLen::N(32))")]
    pub reference_type: ReferenceType,
    
    /// Foreign key to news_articles table (nullable, only for news_article type)
    pub news_article_id: Option<i64>,
    
    pub title: String,
    pub url: Option<String>,
    pub author: Option<String>,
    pub published_date: Option<DateTimeUtc>,
    pub summary: Option<String>,
    
    /// JSON object for type-specific metadata
    pub metadata: Option<String>,
    
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::research::components::feed::entities::articles::Entity",
        from = "Column::NewsArticleId",
        to = "crate::research::components::feed::entities::articles::Column::Id"
    )]
    NewsArticle,
    
    #[sea_orm(has_many = "super::idea_reference_links::Entity")]
    IdeaReferenceLinks,
}

impl Related<crate::research::components::feed::entities::articles::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::NewsArticle.def()
    }
}

impl Related<super::idea_reference_links::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::IdeaReferenceLinks.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
