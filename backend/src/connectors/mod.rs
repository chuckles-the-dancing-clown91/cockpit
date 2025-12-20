use crate::research::dto::ResearchCapability;
use async_trait::async_trait;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct NormalizedItem {
    pub source_type: String,
    pub external_id: String,
    pub url: Option<String>,
    pub title: String,
    pub excerpt: Option<String>,
    pub author: Option<String>,
    pub published_at: Option<String>,
    pub tags: Option<Vec<String>>,
    pub payload: Value,
}

/// Connector trait for external providers (RSS, Reddit, X, etc.)
/// Normalizes capabilities and data flow.
// TODO: remove allow(dead_code) when more connectors consume all trait methods
#[allow(dead_code)]
#[async_trait]
pub trait Connector: Send + Sync {
    /// Provider identifier (e.g., "rss", "reddit", "x").
    fn kind(&self) -> &'static str;

    /// Capabilities supported by this connector (read/search/publish/etc.).
    fn supported_capabilities(&self) -> Vec<ResearchCapability>;

    /// Validate config/auth against enabled capabilities.
    fn validate_config(
        &self,
        config: &Value,
        allowed_caps: &[ResearchCapability],
    ) -> Result<(), String>;

    /// Sync a stream (downstream ingest). Returns normalized items.
    async fn sync_stream(
        &self,
        account: &Value,
        stream: &Value,
        client: &reqwest::Client,
    ) -> Result<Vec<NormalizedItem>, String>;

    /// Publish upstream (optional). Default: not supported.
    async fn publish(&self, _account: &Value, _payload: &Value, _client: &reqwest::Client) -> Result<Value, String> {
        Err("Publish not supported for this connector".into())
    }
}

pub mod newsdata;

pub fn get_connector(kind: &str) -> Option<Box<dyn Connector>> {
    match kind {
        "newsdata" => Some(Box::new(newsdata::NewsDataConnector)),
        _ => None,
    }
}
