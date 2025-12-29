//! Reader snapshot helpers for idea references

use crate::core::components::errors::{AppError, AppResult};
use crate::core::components::reader::{extract_reader_content, html_to_text, sanitize_html};
use crate::AppState;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use std::collections::HashSet;

use super::entities::idea_references::Column as ReferenceColumn;
use super::entities::idea_references::Entity as References;
use super::types::{ReaderSnapshotInput, ReferenceReaderSnapshotDto};
use crate::research::components::feed::entities::articles;

struct SnapshotParts {
    title: String,
    url: String,
    excerpt: Option<String>,
    content_html: String,
    content_text: String,
}

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
        let snapshot = snapshot_from_url(state, &url, None).await?;
        if title.is_empty() {
            title = snapshot.title;
        }
        if excerpt.is_none() {
            excerpt = snapshot.excerpt;
        }
        url = snapshot.url;
        content_html = snapshot.content_html;
        content_text = snapshot.content_text;
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

pub async fn get_reader_snapshot_for_url_handler(
    input: ReaderSnapshotInput,
    state: &AppState,
) -> AppResult<ReferenceReaderSnapshotDto> {
    let snapshot = snapshot_from_url(state, &input.url, input.title).await?;
    let reference_id = find_reference_id_for_url(state, &snapshot.url, &input.url).await?;
    Ok(ReferenceReaderSnapshotDto {
        reference_id: reference_id.unwrap_or(0),
        url: snapshot.url,
        title: snapshot.title,
        excerpt: snapshot.excerpt,
        content_html: snapshot.content_html,
        content_text: snapshot.content_text,
    })
}

async fn snapshot_from_url(
    state: &AppState,
    url: &str,
    title_override: Option<String>,
) -> AppResult<SnapshotParts> {
    let extracted = extract_reader_content(&state.http_client, url, title_override).await?;
    Ok(SnapshotParts {
        title: extracted.title,
        url: extracted.final_url,
        excerpt: extracted.excerpt,
        content_html: extracted.content_html,
        content_text: extracted.content_text,
    })
}

async fn find_reference_id_for_url(
    state: &AppState,
    normalized_url: &str,
    raw_url: &str,
) -> AppResult<Option<i64>> {
    let mut candidates = HashSet::new();
    let trimmed = raw_url.trim();
    if !trimmed.is_empty() {
        candidates.insert(trimmed.to_string());
    }
    if !normalized_url.is_empty() {
        candidates.insert(normalized_url.to_string());
        if let Some(stripped) = normalized_url
            .strip_prefix("https://")
            .or_else(|| normalized_url.strip_prefix("http://"))
        {
            if !stripped.is_empty() {
                candidates.insert(stripped.to_string());
            }
        }
    }

    if candidates.is_empty() {
        return Ok(None);
    }

    let candidate_list: Vec<String> = candidates.into_iter().collect();
    let found = References::find()
        .filter(ReferenceColumn::Url.is_in(candidate_list))
        .order_by_desc(ReferenceColumn::UpdatedAt)
        .one(&state.db)
        .await?;

    Ok(found.map(|reference| reference.id))
}
