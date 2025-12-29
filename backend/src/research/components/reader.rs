//! Reader cockpit services (references, snapshots, clips)

use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use crate::core::components::errors::{AppError, AppResult};
use crate::core::components::reader::{extract_reader_content, normalize_reader_url};
use crate::research::entities::{
    reader_clips, reader_references, reader_snapshots,
};
use crate::research::RESEARCH_LIVE_PAGE_WINDOW_LABEL;

const WORDS_PER_MINUTE: i32 = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderFetchInput {
    pub url: String,
    pub title: Option<String>,
    pub reference_id: Option<i64>,
    pub idea_id: Option<i64>,
    pub writing_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderRefreshInput {
    pub reference_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderResult {
    pub reference_id: i64,
    pub snapshot_id: i64,
    pub final_url: String,
    pub title: String,
    pub byline: Option<String>,
    pub excerpt: Option<String>,
    pub content_md: String,
    pub word_count: Option<i32>,
    pub reading_time_minutes: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderReferenceDto {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub byline: Option<String>,
    pub excerpt: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderSnapshotDto {
    pub id: i64,
    pub reference_id: i64,
    pub fetched_at: String,
    pub title: Option<String>,
    pub byline: Option<String>,
    pub excerpt: Option<String>,
    pub final_url: Option<String>,
    pub content_md: Option<String>,
    pub word_count: Option<i32>,
    pub reading_time_minutes: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderClipDto {
    pub id: i64,
    pub reference_id: i64,
    pub snapshot_id: i64,
    pub quote: String,
    pub anchor: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceUpdateInput {
    pub title: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipCreateInput {
    pub reference_id: i64,
    pub snapshot_id: i64,
    pub quote: String,
    pub anchor: Option<String>,
}

pub async fn reader_fetch(
    db: &sea_orm::DatabaseConnection,
    http_client: &reqwest::Client,
    input: ReaderFetchInput,
) -> AppResult<ReaderResult> {
    let normalized_url = normalize_reader_url(&input.url)?;
    let reference = if let Some(reference_id) = input.reference_id {
        reader_references::Entity::find_by_id(reference_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::other(format!("Reference {} not found", reference_id)))?
    } else {
        reader_references::Entity::find()
            .filter(reader_references::Column::Url.eq(&normalized_url))
            .one(db)
            .await?
            .unwrap_or_else(|| reader_references::Model {
                id: 0,
                url: normalized_url.clone(),
                title: input.title.clone().unwrap_or_else(|| "Untitled reference".to_string()),
                byline: None,
                excerpt: None,
                tags_json: None,
                created_at: Utc::now().naive_utc(),
                updated_at: Utc::now().naive_utc(),
            })
    };

    let reference = if reference.id == 0 {
        let now = Utc::now().naive_utc();
        let active = reader_references::ActiveModel {
            url: Set(normalized_url.clone()),
            title: Set(reference.title.clone()),
            byline: Set(None),
            excerpt: Set(None),
            tags_json: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            ..Default::default()
        };
        active.insert(db).await?
    } else {
        reference
    };

    let extracted = extract_reader_content(http_client, &reference.url, input.title.clone()).await?;
    let (word_count, reading_time_minutes) = compute_reading_stats(&extracted.content_text);

    let now = Utc::now().naive_utc();
    let snapshot = reader_snapshots::ActiveModel {
        reference_id: Set(reference.id),
        fetched_at: Set(now),
        title: Set(Some(extracted.title.clone())),
        byline: Set(None),
        excerpt: Set(extracted.excerpt.clone()),
        final_url: Set(Some(extracted.final_url.clone())),
        content_md: Set(extracted.content_md.clone()),
        word_count: Set(word_count),
        reading_time_minutes: Set(reading_time_minutes),
        ..Default::default()
    }
    .insert(db)
    .await?;

    let mut active_reference: reader_references::ActiveModel = reference.into_active_model();
    if let Some(title) = input.title.clone().filter(|t| !t.trim().is_empty()) {
        active_reference.title = Set(title);
    } else if active_reference.title.as_ref().trim().is_empty() {
        active_reference.title = Set(extracted.title.clone());
    }
    if let Some(excerpt) = extracted.excerpt.clone() {
        active_reference.excerpt = Set(Some(excerpt));
    }
    active_reference.url = Set(extracted.final_url.clone());
    active_reference.updated_at = Set(now);
    let updated_reference = active_reference.update(db).await?;

    Ok(ReaderResult {
        reference_id: updated_reference.id,
        snapshot_id: snapshot.id,
        final_url: extracted.final_url,
        title: extracted.title,
        byline: None,
        excerpt: extracted.excerpt,
        content_md: extracted.content_md,
        word_count,
        reading_time_minutes,
    })
}

pub async fn reader_refresh(
    db: &sea_orm::DatabaseConnection,
    http_client: &reqwest::Client,
    input: ReaderRefreshInput,
) -> AppResult<ReaderResult> {
    let reference = reader_references::Entity::find_by_id(input.reference_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference {} not found", input.reference_id)))?;

    reader_fetch(
        db,
        http_client,
        ReaderFetchInput {
            url: reference.url.clone(),
            title: Some(reference.title.clone()),
            reference_id: Some(reference.id),
            idea_id: None,
            writing_id: None,
        },
    )
    .await
}

pub async fn reference_get(
    db: &sea_orm::DatabaseConnection,
    reference_id: i64,
) -> AppResult<ReaderReferenceDto> {
    let reference = reader_references::Entity::find_by_id(reference_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference {} not found", reference_id)))?;
    Ok(reference_to_dto(reference))
}

pub async fn reference_update(
    db: &sea_orm::DatabaseConnection,
    reference_id: i64,
    input: ReferenceUpdateInput,
) -> AppResult<ReaderReferenceDto> {
    let reference = reader_references::Entity::find_by_id(reference_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Reference {} not found", reference_id)))?;

    let mut active: reader_references::ActiveModel = reference.into_active_model();
    if let Some(title) = input.title {
        active.title = Set(title.trim().to_string());
    }
    if let Some(tags) = input.tags {
        active.tags_json = Set(tags_to_json(&tags));
    }
    active.updated_at = Set(Utc::now().naive_utc());
    let updated = active.update(db).await?;
    Ok(reference_to_dto(updated))
}

pub async fn snapshots_list(
    db: &sea_orm::DatabaseConnection,
    reference_id: i64,
) -> AppResult<Vec<ReaderSnapshotDto>> {
    let snapshots = reader_snapshots::Entity::find()
        .filter(reader_snapshots::Column::ReferenceId.eq(reference_id))
        .order_by_desc(reader_snapshots::Column::FetchedAt)
        .all(db)
        .await?;

    Ok(snapshots.into_iter().map(snapshot_to_dto).collect())
}

pub async fn snapshot_get(
    db: &sea_orm::DatabaseConnection,
    snapshot_id: i64,
) -> AppResult<ReaderSnapshotDto> {
    let snapshot = reader_snapshots::Entity::find_by_id(snapshot_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::other(format!("Snapshot {} not found", snapshot_id)))?;
    Ok(snapshot_to_dto_with_content(snapshot))
}

pub async fn clips_list(
    db: &sea_orm::DatabaseConnection,
    reference_id: i64,
) -> AppResult<Vec<ReaderClipDto>> {
    let clips = reader_clips::Entity::find()
        .filter(reader_clips::Column::ReferenceId.eq(reference_id))
        .order_by_desc(reader_clips::Column::CreatedAt)
        .all(db)
        .await?;
    Ok(clips.into_iter().map(clip_to_dto).collect())
}

pub async fn clip_create(
    db: &sea_orm::DatabaseConnection,
    input: ClipCreateInput,
) -> AppResult<ReaderClipDto> {
    if input.quote.trim().is_empty() {
        return Err(AppError::other("Clip quote is required"));
    }
    let now = Utc::now().naive_utc();
    let clip = reader_clips::ActiveModel {
        reference_id: Set(input.reference_id),
        snapshot_id: Set(input.snapshot_id),
        quote: Set(input.quote.trim().to_string()),
        anchor: Set(input.anchor),
        created_at: Set(now),
        ..Default::default()
    }
    .insert(db)
    .await?;
    Ok(clip_to_dto(clip))
}

pub async fn clip_delete(
    db: &sea_orm::DatabaseConnection,
    clip_id: i64,
) -> AppResult<()> {
    let result = reader_clips::Entity::delete_by_id(clip_id).exec(db).await?;
    if result.rows_affected == 0 {
        return Err(AppError::other(format!("Clip {} not found", clip_id)));
    }
    Ok(())
}

pub fn open_live_page_window(app: &AppHandle, url: &str) -> Result<(), String> {
    let normalized = normalize_reader_url(url).map_err(|e| e.to_string())?;
    let parsed = Url::parse(&normalized).map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window(RESEARCH_LIVE_PAGE_WINDOW_LABEL) {
        window.navigate(parsed).map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        RESEARCH_LIVE_PAGE_WINDOW_LABEL,
        WebviewUrl::External(parsed),
    )
    .title("Live Page")
    .inner_size(1200.0, 900.0)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

fn reference_to_dto(model: reader_references::Model) -> ReaderReferenceDto {
    ReaderReferenceDto {
        id: model.id,
        url: model.url,
        title: model.title,
        byline: model.byline,
        excerpt: model.excerpt,
        tags: parse_tags(&model.tags_json),
        created_at: model.created_at.to_string(),
        updated_at: model.updated_at.to_string(),
    }
}

fn snapshot_to_dto(model: reader_snapshots::Model) -> ReaderSnapshotDto {
    ReaderSnapshotDto {
        id: model.id,
        reference_id: model.reference_id,
        fetched_at: model.fetched_at.to_string(),
        title: model.title,
        byline: model.byline,
        excerpt: model.excerpt,
        final_url: model.final_url,
        content_md: None,
        word_count: model.word_count,
        reading_time_minutes: model.reading_time_minutes,
    }
}

fn snapshot_to_dto_with_content(model: reader_snapshots::Model) -> ReaderSnapshotDto {
    ReaderSnapshotDto {
        content_md: Some(model.content_md.clone()),
        ..snapshot_to_dto(model)
    }
}

fn clip_to_dto(model: reader_clips::Model) -> ReaderClipDto {
    ReaderClipDto {
        id: model.id,
        reference_id: model.reference_id,
        snapshot_id: model.snapshot_id,
        quote: model.quote,
        anchor: model.anchor,
        created_at: model.created_at.to_string(),
    }
}

fn parse_tags(raw: &Option<String>) -> Vec<String> {
    raw.as_ref()
        .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
        .unwrap_or_default()
}

fn tags_to_json(tags: &[String]) -> Option<String> {
    if tags.is_empty() {
        None
    } else {
        Some(serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()))
    }
}

fn compute_reading_stats(content_text: &str) -> (Option<i32>, Option<i32>) {
    let count = content_text.split_whitespace().count() as i32;
    if count == 0 {
        return (Some(0), Some(0));
    }
    let minutes = ((count as f32) / (WORDS_PER_MINUTE as f32)).ceil() as i32;
    (Some(count), Some(minutes))
}
