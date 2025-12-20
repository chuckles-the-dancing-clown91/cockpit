//! DTOs for Research connectors (accounts, streams, items, capabilities)

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ResearchCapability {
    ReadStream,
    Search,
    PublishPost,
    PublishReply,
    ReactVote,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchAccountDto {
    pub id: i64,
    pub provider: String,
    pub display_name: String,
    pub enabled: bool,
    pub allowed_caps: Vec<ResearchCapability>,
    pub permissions: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchStreamDto {
    pub id: i64,
    pub account_id: i64,
    pub name: String,
    pub provider: String,
    pub enabled: bool,
    pub config: Option<Value>,
    pub schedule: Option<Value>,
    pub last_sync_at: Option<String>,
    pub last_error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchItemDto {
    pub id: i64,
    pub account_id: Option<i64>,
    pub stream_id: Option<i64>,
    pub source_type: String,
    pub external_id: String,
    pub url: Option<String>,
    pub title: String,
    pub excerpt: Option<String>,
    pub author: Option<String>,
    pub published_at: Option<String>,
    pub status: String,
    pub tags: Option<Value>,
    pub payload: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateResearchAccountInput {
    pub provider: String,
    pub display_name: String,
    pub enabled: Option<bool>,
    pub allowed_caps: Vec<ResearchCapability>,
    pub permissions: Option<Value>,
    pub auth: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResearchAccountInput {
    pub id: i64,
    pub provider: Option<String>,
    pub display_name: Option<String>,
    pub enabled: Option<bool>,
    pub allowed_caps: Option<Vec<ResearchCapability>>,
    pub permissions: Option<Value>,
    pub auth: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertResearchStreamInput {
    pub id: Option<i64>,
    pub account_id: i64,
    pub name: String,
    pub provider: String,
    pub enabled: Option<bool>,
    pub config: Option<Value>,
    pub schedule: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListResearchItemsQuery {
    pub provider: Option<String>,
    pub account_id: Option<i64>,
    pub stream_id: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}
