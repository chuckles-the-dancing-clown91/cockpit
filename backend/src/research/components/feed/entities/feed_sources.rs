#![allow(dead_code)]
//! Feed Sources entity model
//!
//! Represents feed source plugins (NewsData.io, Reddit, RSS, etc.)
//! Each feed source has its own system_task for scheduled syncing

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "feed_sources")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    /// Display name (e.g., "NewsData.io Tech News")
    pub name: String,
    
    /// Source type: NewsData, Reddit, RSS, Twitter, Custom
    pub source_type: String,
    
    /// Enabled status (0 = disabled, 1 = enabled)
    pub enabled: i32,
    
    /// Encrypted API key (if required by source)
    #[serde(skip_serializing)]
    pub api_key_encrypted: Option<Vec<u8>>,
    
    /// JSON configuration (categories, filters, subreddits, etc.)
    pub config: Option<String>,
    
    /// Foreign key to system_tasks (for scheduled syncing)
    pub task_id: Option<i64>,
    
    /// Last successful sync timestamp
    pub last_sync_at: Option<DateTime>,
    
    /// Last error message (if any)
    pub last_error: Option<String>,
    
    /// Cached article count
    pub article_count: i32,
    
    /// Consecutive error count (for health scoring)
    pub error_count: i32,
    
    /// API calls today (for rate limiting)
    pub api_calls_today: i32,
    
    /// Daily API quota limit (if applicable)
    pub api_quota_daily: Option<i32>,
    
    /// Date of last quota reset
    pub last_quota_reset: Option<Date>,
    
    /// Creation timestamp
    pub created_at: DateTime,
    
    /// Last update timestamp
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

// Note: Relation to system_tasks is handled via task_id foreign key
// SeaORM relations across different domain modules can be complex, 
// so we handle the join manually in queries when needed

impl ActiveModelBehavior for ActiveModel {}

/// Source type enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    NewsData,
    Reddit,
    RSS,
    Twitter,
    Custom,
}

impl SourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceType::NewsData => "newsdata",
            SourceType::Reddit => "reddit",
            SourceType::RSS => "rss",
            SourceType::Twitter => "twitter",
            SourceType::Custom => "custom",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "newsdata" => Some(SourceType::NewsData),
            "reddit" => Some(SourceType::Reddit),
            "rss" => Some(SourceType::RSS),
            "twitter" => Some(SourceType::Twitter),
            "custom" => Some(SourceType::Custom),
            _ => None,
        }
    }
}

/// Source configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceConfig {
    /// Sync schedule (cron expression)
    pub schedule: Option<String>,
    
    /// NewsData-specific config
    #[serde(skip_serializing_if = "Option::is_none")]
    pub newsdata: Option<NewsDataConfig>,
    
    /// Reddit-specific config
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reddit: Option<RedditConfig>,
    
    /// RSS-specific config
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rss: Option<RssConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsDataConfig {
    pub language: Option<String>,
    pub countries: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub domains: Option<Vec<String>>,
    pub exclude_domains: Option<Vec<String>>,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedditConfig {
    pub subreddits: Vec<String>,
    pub sort: Option<String>, // hot, new, top, rising
    pub time_filter: Option<String>, // hour, day, week, month, year, all
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RssConfig {
    pub feed_url: String,
    pub update_interval_minutes: Option<u32>,
}
