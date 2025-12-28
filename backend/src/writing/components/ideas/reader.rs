//! Reader snapshot helpers for idea references

use crate::core::components::errors::{AppError, AppResult};
use crate::AppState;
use ammonia::Builder;
use reqwest::Url;
use regex::Regex;
use scraper::{Html, Selector};
use sea_orm::EntityTrait;

use super::entities::idea_references::Entity as References;
use super::types::ReferenceReaderSnapshotDto;
use crate::research::components::feed::entities::articles;

const MAX_HTML_BYTES: usize = 15 * 1024 * 1024;

pub async fn get_reference_reader_snapshot_handler(
    reference_id: i64,
    state: &AppState,
) -> AppResult<ReferenceReaderSnapshotDto> {
    let reference = References::find_by_id(reference_id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference {} not found", reference_id)))?;

    let mut title = reference.title.unwrap_or_default();
    let mut url = reference.url.unwrap_or_default();
    let mut excerpt = reference.description;
    let mut content_html = String::new();
    let mut content_text = String::new();

    if let Some(article_id) = reference.news_article_id {
        if let Some(article) = articles::Entity::find_by_id(article_id).one(&state.db).await? {
            if title.is_empty() {
                title = article.title;
            }
            if url.is_empty() {
                url = article.url.unwrap_or_default();
            }
            if excerpt.is_none() {
                excerpt = article.excerpt;
            }
            if let Some(content) = article.content {
                content_html = sanitize_html(&content);
                content_text = html_to_text(&content_html);
            }
        }
    }

    if content_html.is_empty() {
        let normalized_url = normalize_reference_url(&url)?;
        url = normalized_url.clone();
        let raw_html = fetch_html(state, &normalized_url).await?;
        if title.is_empty() {
            title = extract_title(&raw_html).unwrap_or_else(|| "Untitled reference".to_string());
        }
        if excerpt.is_none() {
            excerpt = Some(extract_excerpt(&raw_html));
        }
        let main_html = extract_main_html(&raw_html).unwrap_or(raw_html);
        content_html = sanitize_html(&main_html);
        content_text = html_to_text(&content_html);
    }

    Ok(ReferenceReaderSnapshotDto {
        reference_id,
        url,
        title,
        excerpt,
        content_html,
        content_text,
    })
}

async fn fetch_html(state: &AppState, url: &str) -> AppResult<String> {
    let response = state
        .http_client
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

fn normalize_reference_url(raw: &str) -> AppResult<String> {
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

fn sanitize_html(html: &str) -> String {
    Builder::default().clean(html).to_string()
}

fn html_to_text(html: &str) -> String {
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
