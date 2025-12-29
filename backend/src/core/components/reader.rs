//! Shared reader extraction helpers

use crate::core::components::errors::{AppError, AppResult};
use ammonia::Builder;
use html2md::parse_html;
use regex::Regex;
use reqwest::Url;
use scraper::{Html, Selector};

const MAX_HTML_BYTES: usize = 15 * 1024 * 1024;

pub struct ReaderExtracted {
    pub title: String,
    pub excerpt: Option<String>,
    pub final_url: String,
    pub content_html: String,
    pub content_text: String,
    pub content_md: String,
}

pub async fn extract_reader_content(
    http_client: &reqwest::Client,
    url: &str,
    title_override: Option<String>,
) -> AppResult<ReaderExtracted> {
    let normalized_url = normalize_reader_url(url)?;
    let raw_html = fetch_html(http_client, &normalized_url).await?;
    let title = title_override
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .or_else(|| extract_title(&raw_html))
        .unwrap_or_else(|| "Untitled reference".to_string());
    let excerpt = Some(extract_excerpt(&raw_html));
    let main_html = extract_main_html(&raw_html).unwrap_or(raw_html);
    let content_html = sanitize_html(&main_html);
    let content_text = html_to_text(&content_html);
    let content_md = parse_html(&content_html);
    Ok(ReaderExtracted {
        title,
        excerpt,
        final_url: normalized_url,
        content_html,
        content_text,
        content_md,
    })
}

pub fn normalize_reader_url(raw: &str) -> AppResult<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AppError::other("Reference URL is required for reader mode"));
    }
    let normalized = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else if trimmed.starts_with("//") {
        format!("https:{}", trimmed)
    } else {
        format!("https://{}", trimmed)
    };
    Url::parse(&normalized)
        .map(|url| url.to_string())
        .map_err(|e| AppError::other(format!("Reference URL is invalid: {}", e)))
}

async fn fetch_html(http_client: &reqwest::Client, url: &str) -> AppResult<String> {
    let response = http_client
        .get(url)
        .header(
            reqwest::header::USER_AGENT,
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) CockpitReader/1.0",
        )
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(AppError::other(format!(
            "Reader fetch failed with status {}",
            response.status()
        )));
    }

    if let Some(len) = response.content_length() {
        if len as usize > MAX_HTML_BYTES {
            return Err(AppError::other(format!(
                "Reader fetch exceeded max size ({} bytes)",
                len
            )));
        }
    }

    let bytes = response.bytes().await?;
    if bytes.len() > MAX_HTML_BYTES {
        return Err(AppError::other(format!(
            "Reader fetch exceeded max size ({} bytes)",
            bytes.len()
        )));
    }

    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn extract_title(html: &str) -> Option<String> {
    let document = Html::parse_document(html);
    let selector = Selector::parse("title").ok()?;
    document
        .select(&selector)
        .next()
        .map(|node| node.text().collect::<String>().trim().to_string())
        .filter(|title| !title.is_empty())
}

fn extract_main_html(html: &str) -> Option<String> {
    let document = Html::parse_document(html);
    let selectors = ["article", "main", "body"];
    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            if let Some(node) = document.select(&selector).next() {
                let content = node.inner_html();
                if !content.trim().is_empty() {
                    return Some(content);
                }
            }
        }
    }
    None
}

pub(crate) fn sanitize_html(html: &str) -> String {
    Builder::default().clean(html).to_string()
}

pub(crate) fn html_to_text(html: &str) -> String {
    let with_breaks = html
        .replace("</p>", "\n\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n");
    let re_tags = Regex::new(r"<[^>]+>").unwrap_or_else(|_| Regex::new(r"<.*?>").unwrap());
    let stripped = re_tags.replace_all(&with_breaks, " ");
    let re_space = Regex::new(r"\s+").unwrap_or_else(|_| Regex::new(r"\s+").unwrap());
    re_space.replace_all(stripped.trim(), " ").to_string()
}

fn extract_excerpt(html: &str) -> String {
    let text = html_to_text(html);
    if text.len() <= 220 {
        text
    } else {
        format!("{}...", &text[..220])
    }
}
