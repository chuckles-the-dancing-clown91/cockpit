//! DTOs for Writing system
//!
//! Data Transfer Objects for frontend consumption with camelCase serialization

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

/// Writing DTO for frontend consumption (TipTap JSON version)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingDraftDto {
    pub id: i64,
    pub title: String,
    pub slug: Option<String>,
    pub writing_type: String,
    pub status: String,
    
    /// TipTap JSON content (stored in content_markdown as JSON string)
    pub content_json: JsonValue,
    
    /// Plain text extract for search/preview
    pub content_text: String,
    
    pub excerpt: Option<String>,
    pub tags: Option<String>,
    pub word_count: i32,
    
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
    
    pub is_pinned: bool,
    pub is_featured: bool,
    
    pub created_at: String,
    pub updated_at: String,
    pub published_at: Option<String>,
}

/// Writing version DTO (for migration 007 when versioning is added)
#[derive(Debug, Serialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct WritingVersionDto {
    pub id: i64,
    pub writing_id: i64,
    pub version_number: i32,
    pub summary: Option<String>,
    pub content_json: JsonValue,
    pub word_count: i32,
    pub created_at: String,
}

/// Input for creating a new writing (TipTap JSON version)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWritingDraftInput {
    pub title: String,
    pub slug: Option<String>,
    pub writing_type: String, // "article" | "book" | "chapter"
    pub link_idea_ids: Vec<i64>,
    
    /// Initial TipTap JSON content
    pub initial_content_json: JsonValue,
    
    pub excerpt: Option<String>,
    pub tags: Option<String>,
}

/// Input for saving draft content
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDraftInput {
    pub writing_id: i64,
    
    /// TipTap JSON content
    pub content_json: JsonValue,
}

/// Input for updating writing metadata (TipTap JSON version)
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWritingDraftMetaInput {
    pub writing_id: i64,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub writing_type: Option<String>,
    pub status: Option<String>,
    pub excerpt: Option<String>,
    pub tags: Option<String>,
    pub series_name: Option<String>,
    pub series_part: Option<i32>,
    pub is_pinned: Option<bool>,
    pub is_featured: Option<bool>,
}

/// Input for publishing a writing
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishWritingInput {
    pub writing_id: i64,
}

/// Input for linking/unlinking idea to writing
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkIdeaInput {
    pub writing_id: i64,
    pub idea_id: i64,
}

/// Query filters for listing writings
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListWritingsQuery {
    pub status: Option<String>,
    pub writing_type: Option<String>,
    pub series_name: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_featured: Option<bool>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetWritingInput {
    pub writing_id: i64,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListLinkedIdeasInput {
    pub writing_id: i64,
}

// Future: Version management DTOs for migration 007
/*
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVersionFromDraftInput {
    pub writing_id: i64,
    pub summary: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreVersionToDraftInput {
    pub writing_id: i64,
    pub version_id: i64,
}
*/
