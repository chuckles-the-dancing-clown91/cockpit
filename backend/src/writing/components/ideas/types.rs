#![allow(dead_code)]
//! Type definitions for ideas management
//!
//! Defines the database model, enums, DTOs, and utility functions
//! for the writing ideas feature.

use crate::core::components::errors::{AppError, AppResult};
use crate::research::components::feed::entities::articles as news_articles;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Status of a writing idea
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum IdeaStatus {
    #[sea_orm(string_value = "in_progress")]
    InProgress,
    #[sea_orm(string_value = "stalled")]
    Stalled,
    #[sea_orm(string_value = "complete")]
    Complete,
}

impl IdeaStatus {
    pub fn as_str(&self) -> &str {
        match self {
            IdeaStatus::InProgress => "in_progress",
            IdeaStatus::Stalled => "stalled",
            IdeaStatus::Complete => "complete",
        }
    }

    pub fn from_str(value: &str) -> AppResult<Self> {
        match value {
            "in_progress" => Ok(IdeaStatus::InProgress),
            "stalled" => Ok(IdeaStatus::Stalled),
            "complete" => Ok(IdeaStatus::Complete),
            _ => Err(AppError::other(format!("Invalid idea status: {value}"))),
        }
    }
}

impl std::fmt::Display for IdeaStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Database model for writing ideas
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "ideas")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub status: IdeaStatus,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Option<String>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub date_added: DateTimeUtc,
    pub date_updated: DateTimeUtc,
    pub date_completed: Option<DateTimeUtc>,
    pub date_removed: Option<DateTimeUtc>,
    pub priority: i32,
    pub is_pinned: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "news_articles::Entity",
        from = "Column::NewsArticleId",
        to = "news_articles::Column::Id",
        on_delete = "SetNull"
    )]
    NewsArticle,
}

impl Related<news_articles::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::NewsArticle.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// DTO for idea responses
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaDto {
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub status: String,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Vec<String>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub date_added: Option<String>,
    pub date_updated: Option<String>,
    pub date_completed: Option<String>,
    pub date_removed: Option<String>,
    pub priority: i32,
    pub is_pinned: bool,
}

/// Input for creating a new idea
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIdeaInput {
    pub title: String,
    pub summary: Option<String>,
    pub status: Option<String>,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub priority: Option<i32>,
    pub is_pinned: Option<bool>,
}

/// Input for creating an idea from an existing news article
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIdeaForArticleInput {
    pub article_id: i64,
}

/// Input for updating idea metadata
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaMetadataInput {
    pub title: Option<String>,
    pub summary: Option<String>,
    pub status: Option<String>,
    pub target: Option<String>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<i32>,
    pub is_pinned: Option<bool>,
}

/// Input for updating idea notes
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaNotesInput {
    pub notes_markdown: Option<String>,
}

/// Input for updating idea article content
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaArticleInput {
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
}

// Utility functions

/// Parse tags from JSON string stored in database
pub(crate) fn parse_tags(raw: &Option<String>) -> Vec<String> {
    raw.as_ref()
        .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
        .unwrap_or_default()
}

/// Convert tags vector to JSON string for database storage
pub(crate) fn tags_to_json(tags: &[String]) -> Option<String> {
    if tags.is_empty() {
        None
    } else {
        Some(serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()))
    }
}

/// Validate status string and convert to enum
pub(crate) fn validate_status(status: &str) -> AppResult<IdeaStatus> {
    IdeaStatus::from_str(status)
}

/// Convert status option to enum, using default if None
pub(crate) fn status_or_default(status: &Option<String>) -> AppResult<IdeaStatus> {
    match status {
        Some(status) => validate_status(status),
        None => Ok(IdeaStatus::InProgress),
    }
}

/// Convert boolean to integer for database storage
pub(crate) fn bool_to_int(value: Option<bool>) -> i32 {
    if value.unwrap_or(false) {
        1
    } else {
        0
    }
}

/// Convert database model to DTO for API response
pub(crate) fn idea_to_dto(model: Model) -> IdeaDto {
    IdeaDto {
        id: model.id,
        title: model.title,
        summary: model.summary,
        status: model.status.as_str().to_string(),
        news_article_id: model.news_article_id,
        target: model.target,
        tags: parse_tags(&model.tags),
        notes_markdown: model.notes_markdown,
        article_title: model.article_title,
        article_markdown: model.article_markdown,
        date_added: Some(model.date_added.to_rfc3339()),
        date_updated: Some(model.date_updated.to_rfc3339()),
        date_completed: model.date_completed.map(|d| d.to_rfc3339()),
        date_removed: model.date_removed.map(|d| d.to_rfc3339()),
        priority: model.priority,
        is_pinned: model.is_pinned != 0,
    }
}

// ============================================================================
// Idea References Types
// ============================================================================

/// Reference type enum
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferenceType {
    Article,
    Manual,
    Url,
}

impl ReferenceType {
    pub fn as_str(&self) -> &str {
        match self {
            ReferenceType::Article => "article",
            ReferenceType::Manual => "manual",
            ReferenceType::Url => "url",
        }
    }
}

/// DTO for idea reference (API response/request)
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaReferenceDto {
    pub id: i64,
    pub idea_id: i64,
    pub reference_type: String,
    pub news_article_id: Option<i64>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    pub notes_markdown: Option<String>,
    pub source_id: Option<i64>,
    pub added_at: String,
    pub updated_at: String,
}

/// Input for adding a reference to an idea
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddReferenceInput {
    pub idea_id: i64,
    pub reference_type: String,
    pub news_article_id: Option<i64>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    pub source_id: Option<i64>,
}

/// Input for updating reference notes
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReferenceNotesInput {
    pub reference_id: i64,
    pub notes_markdown: Option<String>,
}

/// Input for fetching a reader snapshot by URL
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderSnapshotInput {
    pub url: String,
    pub title: Option<String>,
}

/// DTO for a read-only reader snapshot of a reference
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceReaderSnapshotDto {
    pub reference_id: i64,
    pub url: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub content_html: String,
    pub content_text: String,
}
