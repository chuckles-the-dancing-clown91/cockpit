//! NewsData.io Feed Source Plugin
//!
//! Implements the FeedSource trait for NewsData.io API integration.
//! Supports latest news and archive endpoints with full filtering capabilities.

use crate::core::components::errors::{AppError, AppResult};
use crate::research::components::feed::plugin::{
    ConnectionTestResult, FeedArticle, FeedSource, FetchResult, SourceMetadata,
};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// NewsData.io API response structure
#[derive(Debug, Deserialize)]
struct NewsDataResponse {
    status: String,
    #[serde(default)]
    results: Vec<NewsDataArticle>,
    #[serde(rename = "nextPage")]
    next_page: Option<String>,
    #[serde(rename = "totalResults")]
    total_results: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct NewsDataArticle {
    article_id: String,
    title: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    content: Option<String>,
    link: String,
    #[serde(default)]
    image_url: Option<String>,
    #[serde(default)]
    source_name: Option<String>,
    #[serde(default)]
    source_url: Option<String>,
    #[serde(default)]
    source_id: Option<String>,
    #[serde(default)]
    keywords: Option<Vec<String>>,
    #[serde(default)]
    language: Option<String>,
    #[serde(default)]
    category: Option<Vec<String>>,
    #[serde(default)]
    country: Option<Vec<String>>,
    #[serde(default)]
    #[serde(rename = "pubDate")]
    pub_date: Option<String>,
}

/// NewsData.io plugin configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsDataConfig {
    /// Language filter (e.g., "en")
    pub language: Option<String>,
    
    /// Country filters (e.g., ["us", "gb"])
    #[serde(default)]
    pub countries: Vec<String>,
    
    /// Category filters (e.g., ["technology", "business"])
    #[serde(default)]
    pub categories: Vec<String>,
    
    /// Domain filters (e.g., ["techcrunch.com"])
    #[serde(default)]
    pub domains: Vec<String>,
    
    /// Exclude domains
    #[serde(default)]
    pub exclude_domains: Vec<String>,
    
    /// Search query
    pub query: Option<String>,
    
    /// Maximum pages to fetch per sync (rate limiting)
    #[serde(default = "default_max_pages")]
    pub max_pages: i32,
    
    /// Use archive endpoint (for historical data)
    #[serde(default)]
    pub use_archive: bool,
    
    /// From date (archive only, format: YYYY-MM-DD)
    pub from_date: Option<String>,
    
    /// To date (archive only, format: YYYY-MM-DD)
    pub to_date: Option<String>,
}

fn default_max_pages() -> i32 {
    3
}

impl Default for NewsDataConfig {
    fn default() -> Self {
        Self {
            language: Some("en".to_string()),
            countries: vec![],
            categories: vec![],
            domains: vec![],
            exclude_domains: vec![],
            query: None,
            max_pages: 3,
            use_archive: false,
            from_date: None,
            to_date: None,
        }
    }
}

/// NewsData.io feed source plugin
pub struct NewsDataPlugin {
    http_client: reqwest::Client,
    api_key: String,
}

impl NewsDataPlugin {
    /// Create a new NewsData plugin instance
    pub fn new(api_key: String, http_client: reqwest::Client) -> Self {
        Self {
            api_key,
            http_client,
        }
    }
    
    /// Extract domain from URL
    fn extract_domain(url: &str) -> Option<String> {
        // Simple domain extraction without url crate dependency
        url.strip_prefix("http://")
            .or_else(|| url.strip_prefix("https://"))
            .and_then(|s| s.split('/').next())
            .map(|s| s.to_string())
    }
    
    /// Retry request with exponential backoff
    async fn retry_request<F, Fut>(&self, mut f: F) -> Result<reqwest::Response, reqwest::Error>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<reqwest::Response, reqwest::Error>>,
    {
        let max_retries = 3;
        let mut attempt = 0;
        
        loop {
            match f().await {
                Ok(resp) => {
                    if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                        if attempt >= max_retries {
                            warn!("NewsData: Rate limited after {} retries", max_retries);
                            return Ok(resp);
                        }
                        
                        let delay = resp
                            .headers()
                            .get("retry-after")
                            .and_then(|h| h.to_str().ok())
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(1u64 << attempt);
                        
                        warn!("NewsData: Rate limited, retrying in {}s (attempt {}/{})", delay, attempt + 1, max_retries);
                        tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
                        attempt += 1;
                        continue;
                    }
                    
                    return Ok(resp);
                }
                Err(e) => {
                    if attempt >= max_retries || !e.is_timeout() && !e.is_connect() {
                        return Err(e);
                    }
                    
                    let delay = 1u64 << attempt;
                    warn!("NewsData: Request failed: {}, retrying in {}s", e, delay);
                    tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
                    attempt += 1;
                }
            }
        }
    }
}

#[async_trait]
impl FeedSource for NewsDataPlugin {
    fn get_metadata(&self) -> SourceMetadata {
        SourceMetadata {
            source_type: "newsdata".to_string(),
            display_name: "NewsData.io".to_string(),
            description: "Global news aggregator with 100k+ sources in 48 languages".to_string(),
            icon: "newspaper".to_string(),
            requires_api_key: true,
            config_schema: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "title": "Language",
                        "description": "Language code (e.g., en, es, fr)",
                        "default": "en"
                    },
                    "countries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "title": "Countries",
                        "description": "Country codes (e.g., us, gb, ca)"
                    },
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "title": "Categories",
                        "description": "Categories (e.g., technology, business, sports)"
                    },
                    "query": {
                        "type": "string",
                        "title": "Search Query",
                        "description": "Keywords to search for"
                    },
                    "max_pages": {
                        "type": "integer",
                        "title": "Max Pages",
                        "description": "Maximum pages to fetch per sync (1-10)",
                        "default": 3,
                        "minimum": 1,
                        "maximum": 10
                    }
                }
            })),
        }
    }
    
    async fn test_connection(&self) -> AppResult<ConnectionTestResult> {
        info!("NewsData: Testing connection...");
        
        let response = self.retry_request(|| {
            self.http_client
                .get("https://newsdata.io/api/1/latest")
                .query(&[("apikey", self.api_key.as_str()), ("language", "en")])
                .send()
        }).await;
        
        match response {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<NewsDataResponse>().await {
                    Ok(data) => {
                        info!("NewsData: Connection test successful, {} results", data.results.len());
                        Ok(ConnectionTestResult {
                            success: true,
                            message: "Connection successful".to_string(),
                            details: Some(serde_json::json!({
                                "total_results": data.total_results,
                                "status": data.status
                            })),
                        })
                    }
                    Err(e) => {
                        warn!("NewsData: Failed to parse response: {}", e);
                        Err(AppError::Other {
                            message: format!("Invalid response: {}", e),
                            source: Some(Box::new(e)),
                        })
                    }
                }
            }
            Ok(resp) => {
                let status = resp.status();
                let error_text = resp.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                warn!("NewsData: Connection test failed with status {}: {}", status, error_text);
                
                let message = if status == reqwest::StatusCode::UNAUTHORIZED {
                    "Invalid API key".to_string()
                } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                    "Rate limit exceeded".to_string()
                } else {
                    format!("HTTP {}: {}", status, error_text)
                };
                
                Ok(ConnectionTestResult {
                    success: false,
                    message,
                    details: Some(serde_json::json!({"status": status.as_u16(), "error": error_text})),
                })
            }
            Err(e) => {
                warn!("NewsData: Connection failed: {}", e);
                Err(AppError::Network {
                    message: "Connection error".to_string(),
                    source: e,
                })
            }
        }
    }
    
    async fn fetch_articles(
        &self,
        config: Option<serde_json::Value>,
        _last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> AppResult<FetchResult> {
        let config: NewsDataConfig = if let Some(cfg) = config {
            serde_json::from_value(cfg).unwrap_or_default()
        } else {
            NewsDataConfig::default()
        };
        
        let endpoint = if config.use_archive {
            "https://newsdata.io/api/1/archive"
        } else {
            "https://newsdata.io/api/1/latest"
        };
        
        info!("NewsData: Fetching articles from {} (max {} pages)", endpoint, config.max_pages);
        
        let mut all_articles = Vec::new();
        let mut api_calls = 0;
        let mut warnings = Vec::new();
        let mut next_page: Option<String> = None;
        
        for page_num in 0..config.max_pages {
            let mut req = self.http_client
                .get(endpoint)
                .query(&[("apikey", self.api_key.as_str())]);
            
            // Add filters
            if let Some(lang) = &config.language {
                req = req.query(&[("language", lang.as_str())]);
            }
            if !config.countries.is_empty() {
                req = req.query(&[("country", &config.countries.join(","))]);
            }
            if !config.categories.is_empty() {
                req = req.query(&[("category", &config.categories.join(","))]);
            }
            if !config.domains.is_empty() {
                req = req.query(&[("domain", &config.domains.join(","))]);
            }
            if !config.exclude_domains.is_empty() {
                req = req.query(&[("excludedomain", &config.exclude_domains.join(","))]);
            }
            if let Some(q) = &config.query {
                req = req.query(&[("q", q.as_str())]);
            }
            if let Some(from) = &config.from_date {
                req = req.query(&[("from_date", from.as_str())]);
            }
            if let Some(to) = &config.to_date {
                req = req.query(&[("to_date", to.as_str())]);
            }
            if let Some(page) = &next_page {
                req = req.query(&[("page", page.as_str())]);
            }
            
            let response = self.retry_request(|| req.try_clone().unwrap().send()).await
                .map_err(|e| AppError::Network {
                    message: "Request failed".to_string(),
                    source: e,
                })?;
            
            api_calls += 1;
            
            if !response.status().is_success() {
                let status = response.status();
                let _error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(AppError::ApiRequest {
                    endpoint: endpoint.to_string(),
                    status: status.as_u16(),
                    source: None,
                });
            }
            
            let data: NewsDataResponse = response.json().await
                .map_err(|e| AppError::Other {
                    message: format!("Failed to parse response: {}", e),
                    source: Some(Box::new(e)),
                })?;
            
            info!("NewsData: Page {} fetched {} articles", page_num + 1, data.results.len());
            
            // Convert NewsData articles to common format
            for article in data.results {
                let published_at = article
                    .pub_date
                    .and_then(|date_str| chrono::DateTime::parse_from_rfc3339(&date_str).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));
                
                all_articles.push(FeedArticle {
                    provider_article_id: Some(article.article_id),
                    title: article.title,
                    excerpt: article.description,
                    content: article.content,
                    url: Some(article.link.clone()),
                    image_url: article.image_url,
                    source_name: article.source_name.or_else(|| article.source_url.as_ref().and_then(|url| Self::extract_domain(url))),
                    source_domain: article.source_url.as_ref().and_then(|url| Self::extract_domain(url)),
                    source_id: article.source_id,
                    tags: article.keywords.unwrap_or_default(),
                    language: article.language,
                    category: article.category.and_then(|cats| cats.first().cloned()),
                    country: article.country.and_then(|countries| countries.first().cloned()),
                    published_at,
                });
            }
            
            // Check for next page
            if let Some(page) = data.next_page {
                next_page = Some(page);
            } else {
                info!("NewsData: No more pages available");
                break;
            }
        }
        
        if api_calls >= config.max_pages && next_page.is_some() {
            warnings.push(format!("Reached max pages limit ({}), more articles available", config.max_pages));
        }
        
        info!("NewsData: Fetch complete, {} articles from {} API calls", all_articles.len(), api_calls);
        
        Ok(FetchResult {
            articles: all_articles,
            api_calls_used: api_calls,
            warnings,
        })
    }
    
    fn parse_config(&self, config: serde_json::Value) -> AppResult<serde_json::Value> {
        let parsed: NewsDataConfig = serde_json::from_value(config)
            .map_err(|e| AppError::Validation {
                field: "config".to_string(),
                reason: format!("Invalid NewsData config: {}", e),
                invalid_value: None,
            })?;
        
        // Validate max_pages
        if parsed.max_pages < 1 || parsed.max_pages > 10 {
            return Err(AppError::Validation {
                field: "max_pages".to_string(),
                reason: "must be between 1 and 10".to_string(),
                invalid_value: Some(parsed.max_pages.to_string()),
            });
        }
        
        // Validate date format if archive mode
        if parsed.use_archive {
            if let Some(from) = &parsed.from_date {
                chrono::NaiveDate::parse_from_str(from, "%Y-%m-%d")
                    .map_err(|_| AppError::Validation {
                        field: "from_date".to_string(),
                        reason: "must be YYYY-MM-DD format".to_string(),
                        invalid_value: Some(from.clone()),
                    })?;
            }
            if let Some(to) = &parsed.to_date {
                chrono::NaiveDate::parse_from_str(to, "%Y-%m-%d")
                    .map_err(|_| AppError::Validation {
                        field: "to_date".to_string(),
                        reason: "must be YYYY-MM-DD format".to_string(),
                        invalid_value: Some(to.clone()),
                    })?;
            }
        }
        
        serde_json::to_value(parsed)
            .map_err(|e| AppError::Other {
                message: format!("Failed to serialize config: {}", e),
                source: Some(Box::new(e)),
            })
    }
    
    fn default_config(&self) -> Option<serde_json::Value> {
        serde_json::to_value(NewsDataConfig::default()).ok()
    }
    
    fn estimate_api_calls(&self, config: Option<&serde_json::Value>) -> i32 {
        if let Some(cfg) = config {
            if let Ok(parsed) = serde_json::from_value::<NewsDataConfig>(cfg.clone()) {
                return parsed.max_pages;
            }
        }
        3 // Default max_pages
    }
}
