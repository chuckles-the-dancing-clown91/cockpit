//! Shared types for news feed module
//! 
//! Contains DTOs, API response structures, and utility functions
//! used across settings, articles, sources, and sync modules.

use super::entities::feed_sources::{SourceConfig, SourceType};

/// Feed source data transfer object
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedSourceDto {
    pub id: i64,
    pub name: String,
    pub source_type: String,
    pub enabled: bool,
    pub has_api_key: bool, // Don't expose actual key
    pub config: Option<SourceConfig>,
    pub task_id: Option<i64>,
    pub schedule: Option<String>, // Human-readable cron
    pub last_sync_at: Option<String>,
    pub last_error: Option<String>,
    pub article_count: i32,
    pub error_count: i32,
    pub api_calls_today: i32,
    pub api_quota_daily: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

/// Create feed source input
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFeedSourceInput {
    pub name: String,
    pub source_type: String,
    pub api_key: Option<String>, // Plain text, will be encrypted
    pub config: Option<SourceConfig>,
    pub schedule: Option<String>, // Cron expression
}

/// Update feed source input
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFeedSourceInput {
    pub name: Option<String>,
    pub enabled: Option<bool>,
    pub api_key: Option<String>, // Plain text, will be encrypted
    pub config: Option<SourceConfig>,
    pub schedule: Option<String>, // Cron expression
}

/// Sync result for a single feed source
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSourceResult {
    pub source_id: i64,
    pub source_name: String,
    pub success: bool,
    pub articles_added: i32,
    pub error: Option<String>,
}

/// Sync all sources result
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncAllResult {
    pub total_sources: i32,
    pub successful: i32,
    pub failed: i32,
    pub total_articles: i32,
    pub results: Vec<SyncSourceResult>,
}

/// News article data transfer object
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsArticleDto {
    pub id: i64,
    pub article_id: Option<String>,
    pub title: String,
    pub excerpt: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub source_name: Option<String>,
    pub source_domain: Option<String>,
    pub source_id: Option<String>,
    pub tags: Vec<String>,
    pub country: Vec<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub published_at: Option<String>,
    pub fetched_at: Option<String>,
    pub added_via: Option<String>,
    pub is_starred: bool,
    pub is_dismissed: bool,
    pub is_read: bool,
    pub added_to_ideas_at: Option<String>,
    pub dismissed_at: Option<String>,
}

/// News settings data transfer object
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsSettingsDto {
    pub user_id: i64,
    pub provider: String,
    pub has_api_key: bool,
    pub language: Option<String>,
    pub languages: Vec<String>,
    pub countries: Vec<String>,
    pub categories: Vec<String>,
    pub sources: Vec<String>,
    pub query: Option<String>,
    pub keywords_in_title: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub max_stored: i64,
    pub max_articles: i64,
    pub daily_call_limit: i64,
    pub calls_today: i64,
    pub last_reset_date: Option<String>,
    pub last_synced_at: Option<String>,
}

/// Input for saving news settings
#[derive(serde::Deserialize)]
pub struct SaveNewsSettingsInput {
    pub api_key: Option<String>,
    pub language: Option<String>,
    pub languages: Option<Vec<String>>,
    pub countries: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub sources: Option<Vec<String>>,
    pub query: Option<String>,
    pub keywords_in_title: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub max_stored: Option<i64>,
    pub max_articles: Option<i64>,
    pub daily_call_limit: Option<i64>,
}

/// News source data transfer object
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsSourceDto {
    pub id: i64,
    pub source_id: String,
    pub name: String,
    pub url: Option<String>,
    pub country: Option<String>,
    pub language: Option<String>,
    pub category: Vec<String>,
    pub is_active: bool,
    pub is_muted: bool,
}

/// NewsData API response structure
#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub(crate) struct NewsApiResponse {
    pub status: Option<String>,
    #[serde(rename = "totalResults")]
    pub total_results: Option<i64>,
    pub results: Option<Vec<NewsApiArticle>>,
    #[serde(rename = "nextPage")]
    pub next_page: Option<String>,
}

/// String or vector deserializer helper
#[derive(serde::Deserialize)]
#[serde(untagged)]
pub(crate) enum StringOrVec {
    String(String),
    Vec(Vec<String>),
}

// StringOrVec helper methods can be added here if needed

/// NewsData API article structure
#[derive(serde::Deserialize)]
pub(crate) struct NewsApiArticle {
    #[serde(rename = "article_id")]
    pub article_id: Option<String>,
    pub title: Option<String>,
    pub link: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "image_url")]
    pub image_url: Option<String>,
    #[serde(rename = "source_id")]
    pub source_id: Option<String>,
    pub country: Option<StringOrVec>,
    pub category: Option<StringOrVec>,
    pub language: Option<String>,
    #[serde(rename = "pubDate")]
    pub pub_date: Option<String>,
}

/// NewsData API sources response structure
#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub(crate) struct NewsSourceApiResponse {
    pub status: Option<String>,
    pub results: Option<Vec<NewsSourceApiItem>>,
    #[serde(rename = "nextPage")]
    pub next_page: Option<String>,
}

/// NewsData API source item structure
#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub(crate) struct NewsSourceApiItem {
    #[serde(alias = "source_id", alias = "id")]
    pub source_id: String,
    pub name: String,
    pub url: Option<String>,
    pub icon: Option<String>,
    pub country: Option<StringOrVec>,
    pub language: Option<StringOrVec>,
    pub category: Option<Vec<String>>,
    pub description: Option<String>,
}

/// Parse JSON string into vector
/// 
/// Helper to deserialize JSON array strings from database.
/// Returns empty vec on parse failure.
pub(crate) fn parse_vec(json: &Option<String>) -> Vec<String> {
    use tracing::warn;
    
    json.as_ref()
        .and_then(|s| match serde_json::from_str::<Vec<String>>(s) {
            Ok(vec) => Some(vec),
            Err(e) => {
                warn!(target: "news", "Failed to parse JSON vector: {}", e);
                None
            }
        })
        .unwrap_or_default()
}

/// Convert vector to JSON string
/// 
/// Helper to serialize vectors for database storage.
pub(crate) fn to_json_vec(v: &Option<Vec<String>>) -> Option<String> {
    v.as_ref()
        .map(|vec| serde_json::to_string(vec).unwrap_or_else(|_| "[]".into()))
}

/// Get NewsData API key from environment
/// 
/// Checks both NEWSDATA_API_KEY and NEWS_API_KEY env vars.
pub(crate) fn env_news_api_key() -> Option<String> {
    std::env::var("NEWSDATA_API_KEY")
        .or_else(|_| std::env::var("NEWS_API_KEY"))
        .ok()
}

/// Sanitize URL for logging by redacting API keys
/// 
/// Replaces apikey parameter values with [REDACTED] to prevent
/// API key exposure in logs.
pub(crate) fn sanitize_url_for_logging(url: &str) -> String {
    let re = regex::Regex::new(r"apikey=([^&\s]+)").unwrap();
    re.replace_all(url, "apikey=[REDACTED]").to_string()
}

/// Sanitize error message for logging by redacting API keys from URLs
pub(crate) fn sanitize_error_for_logging(error: &reqwest::Error) -> String {
    let error_str = error.to_string();
    sanitize_url_for_logging(&error_str)
}
