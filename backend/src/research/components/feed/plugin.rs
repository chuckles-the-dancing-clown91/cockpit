//! Feed Source Plugin System
//!
//! Defines the trait interface that all feed source plugins must implement.
//! This allows us to add new feed sources (Reddit, RSS, Twitter, etc.) without
//! modifying existing code - just implement the trait and register the plugin.

use crate::core::components::errors::AppResult;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Article data returned by feed plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedArticle {
    /// Original article ID from the source
    pub provider_article_id: Option<String>,
    
    /// Article title
    pub title: String,
    
    /// Article excerpt/summary
    pub excerpt: Option<String>,
    
    /// Full article content (if available)
    pub content: Option<String>,
    
    /// Article URL
    pub url: Option<String>,
    
    /// Image URL
    pub image_url: Option<String>,
    
    /// Source name (e.g., "TechCrunch", "r/programming")
    pub source_name: Option<String>,
    
    /// Source domain (e.g., "techcrunch.com")
    pub source_domain: Option<String>,
    
    /// Source ID from the provider
    pub source_id: Option<String>,
    
    /// Tags/keywords
    pub tags: Vec<String>,
    
    /// Language code (e.g., "en")
    pub language: Option<String>,
    
    /// Category
    pub category: Option<String>,
    
    /// Country code
    pub country: Option<String>,
    
    /// Publication timestamp
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Result of a fetch operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    /// Articles fetched
    pub articles: Vec<FeedArticle>,
    
    /// Number of API calls made
    pub api_calls_used: i32,
    
    /// Any warnings (rate limit approaching, etc.)
    pub warnings: Vec<String>,
}

/// Source metadata for UI display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceMetadata {
    /// Source type identifier
    pub source_type: String,
    
    /// Display name
    pub display_name: String,
    
    /// Description
    pub description: String,
    
    /// Icon name (for UI)
    pub icon: String,
    
    /// Whether this source requires an API key
    pub requires_api_key: bool,
    
    /// Configuration schema (JSON schema for UI forms)
    pub config_schema: Option<serde_json::Value>,
}

/// Connection test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    /// Whether connection was successful
    pub success: bool,
    
    /// Status message
    pub message: String,
    
    /// Additional details (quota remaining, account info, etc.)
    pub details: Option<serde_json::Value>,
}

/// Feed source plugin trait
/// 
/// All feed sources (NewsData, Reddit, RSS, etc.) must implement this trait.
/// The trait uses async_trait for async method support.
#[async_trait]
pub trait FeedSource: Send + Sync {
    /// Get source metadata (for UI display)
    fn get_metadata(&self) -> SourceMetadata;
    
    /// Test API connection and authentication
    /// 
    /// Verifies:
    /// - API key is valid (if required)
    /// - Service is reachable
    /// - Returns quota/rate limit info
    async fn test_connection(&self) -> AppResult<ConnectionTestResult>;
    
    /// Fetch articles from the source
    /// 
    /// # Arguments
    /// * `config` - JSON configuration (parsed from feed_sources.config)
    /// * `last_sync_at` - Last successful sync timestamp (for incremental fetching)
    /// 
    /// # Returns
    /// * `FetchResult` with articles and metadata
    async fn fetch_articles(
        &self,
        config: Option<serde_json::Value>,
        last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> AppResult<FetchResult>;
    
    /// Parse source-specific config into common format
    /// 
    /// Validates and normalizes configuration for this source type.
    fn parse_config(&self, config: serde_json::Value) -> AppResult<serde_json::Value> {
        // Default implementation: return as-is
        Ok(config)
    }
    
    /// Get default configuration for this source type
    fn default_config(&self) -> Option<serde_json::Value> {
        None
    }
    
    /// Estimate API calls required for a fetch operation
    /// 
    /// Used for rate limit checking before fetching.
    fn estimate_api_calls(&self, _config: Option<&serde_json::Value>) -> i32 {
        1 // Default: single API call
    }
}

/// Plugin registry for managing feed source implementations
pub struct PluginRegistry {
    plugins: std::collections::HashMap<String, Arc<dyn FeedSource>>,
}

impl PluginRegistry {
    /// Create a new plugin registry
    pub fn new() -> Self {
        Self {
            plugins: std::collections::HashMap::new(),
        }
    }
    
    /// Register a feed source plugin
    pub fn register(&mut self, source_type: String, plugin: Arc<dyn FeedSource>) {
        self.plugins.insert(source_type, plugin);
    }
    
    /// Get a plugin by source type
    pub fn get(&self, source_type: &str) -> Option<&Arc<dyn FeedSource>> {
        self.plugins.get(source_type)
    }
    
    /// List all registered plugins
    pub fn list(&self) -> Vec<SourceMetadata> {
        self.plugins
            .values()
            .map(|plugin| plugin.get_metadata())
            .collect()
    }
    
    /// Check if a source type is registered
    pub fn has(&self, source_type: &str) -> bool {
        self.plugins.contains_key(source_type)
    }
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize the plugin registry with all available plugins
/// 
/// Note: Plugins require runtime dependencies (API keys, HTTP client)
/// so they must be instantiated and registered when needed, not globally.
pub fn create_registry() -> PluginRegistry {
    PluginRegistry::new()
}
