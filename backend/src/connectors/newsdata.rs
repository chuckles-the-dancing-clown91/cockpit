use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::warn;

use crate::connectors::{Connector, NormalizedItem};
use crate::research::dto::ResearchCapability;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NewsDataConfig {
    pub language: Option<String>,
    #[serde(default)]
    pub countries: Vec<String>,
    #[serde(default)]
    pub categories: Vec<String>,
    pub query: Option<String>,
    #[serde(default)]
    pub max_pages: i32,
}

#[derive(Debug, Deserialize)]
struct NewsDataResponse {
    status: String,
    #[serde(default)]
    results: Vec<NewsDataArticle>,
    #[serde(rename = "nextPage")]
    next_page: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct NewsDataArticle {
    #[serde(rename = "article_id")]
    article_id: String,
    title: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    content: Option<String>,
    link: String,
    #[serde(default)]
    source_name: Option<String>,
    #[serde(default)]
    #[serde(rename = "pubDate")]
    pub_date: Option<String>,
    #[serde(default)]
    keywords: Option<Vec<String>>,
}

pub struct NewsDataConnector;

#[async_trait]
impl Connector for NewsDataConnector {
    fn kind(&self) -> &'static str {
        "newsdata"
    }

    fn supported_capabilities(&self) -> Vec<ResearchCapability> {
        vec![ResearchCapability::ReadStream, ResearchCapability::Search]
    }

    fn validate_config(
        &self,
        _config: &serde_json::Value,
        _allowed_caps: &[ResearchCapability],
    ) -> Result<(), String> {
        Ok(())
    }

    async fn sync_stream(
        &self,
        account: &serde_json::Value,
        stream: &serde_json::Value,
        client: &reqwest::Client,
    ) -> Result<Vec<NormalizedItem>, String> {
        let api_key = account
            .get("apiKey")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "NewsData connector: missing apiKey in account.auth".to_string())?;

        let cfg: NewsDataConfig = serde_json::from_value(stream.clone()).unwrap_or_default();

        let mut page = None::<String>;
        let max_pages = if cfg.max_pages > 0 { cfg.max_pages } else { 1 };
        let mut collected = Vec::new();

        for _ in 0..max_pages {
            let mut req = client
                .get("https://newsdata.io/api/1/latest")
                .query(&[("apikey", api_key)]);

            if let Some(q) = cfg.query.as_ref() {
                req = req.query(&[("q", q)]);
            }
            if let Some(lang) = cfg.language.as_ref() {
                req = req.query(&[("language", lang)]);
            }
            if !cfg.countries.is_empty() {
                req = req.query(&[("country", &cfg.countries.join(","))]);
            }
            if !cfg.categories.is_empty() {
                req = req.query(&[("category", &cfg.categories.join(","))]);
            }
            if let Some(p) = page.as_ref() {
                req = req.query(&[("page", p)]);
            }

            let resp = req
                .send()
                .await
                .map_err(|e| format!("NewsData request failed: {e}"))?;
            let status = resp.status();
            let body = resp
                .text()
                .await
                .map_err(|e| format!("NewsData read body failed: {e}"))?;

            if !status.is_success() {
                return Err(format!("NewsData HTTP {}: {}", status, body));
            }

            let parsed: NewsDataResponse =
                serde_json::from_str(&body).map_err(|e| format!("NewsData parse error: {e}"))?;
            if parsed.status != "success" {
                return Err(format!("NewsData returned status {}", parsed.status));
            }

            for art in parsed.results {
                let url = Some(art.link.clone());
                let excerpt = art.description.clone().or(art.content.clone());
                collected.push(NormalizedItem {
                    source_type: "newsdata".to_string(),
                    external_id: art.article_id.clone(),
                    url,
                    title: art.title.clone(),
                    excerpt,
                    author: art.source_name.clone(),
                    published_at: art.pub_date.clone(),
                    tags: art.keywords.clone(),
                    payload: json!(art),
                });
            }

            if let Some(next) = parsed.next_page {
                page = Some(next);
            } else {
                break;
            }
        }

        if collected.is_empty() {
            warn!("NewsData sync: no articles collected");
        }
        Ok(collected)
    }
}
