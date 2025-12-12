//! Ideas management system for writing and content creation
//!
//! This module handles CRUD operations for ideas/articles:
//! - Creating ideas from scratch or from news articles
//! - Managing idea metadata (status, priority, tags)
//! - Editing article content and notes
//! - Archiving completed ideas

use crate::core::components::errors::{AppError, AppResult};
use crate::research::components::articles as news_articles;
use crate::AppState;
use chrono::Utc;
use sea_orm::entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder, QuerySelect, Set, TransactionTrait, ConnectionTrait,
};
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{instrument, info};

#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum IdeaStatus {
    #[sea_orm(string_value = "in_progress")]
    InProgress,
    #[sea_orm(string_value = "stalled")]
    Stalled,
    #[sea_orm(string_value = "complete")]
    Complete,
}

impl IdeaStatus {
    pub fn as_str(&self) -> &str {
        match self {
            IdeaStatus::InProgress => "in_progress",
            IdeaStatus::Stalled => "stalled",
            IdeaStatus::Complete => "complete",
        }
    }

    pub fn from_str(value: &str) -> AppResult<Self> {
        match value {
            "in_progress" => Ok(IdeaStatus::InProgress),
            "stalled" => Ok(IdeaStatus::Stalled),
            "complete" => Ok(IdeaStatus::Complete),
            _ => Err(AppError::other(format!("Invalid idea status: {value}"))),
        }
    }
}

impl std::fmt::Display for IdeaStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "ideas")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub status: IdeaStatus,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Option<String>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub date_added: DateTimeUtc,
    pub date_updated: DateTimeUtc,
    pub date_completed: Option<DateTimeUtc>,
    pub date_removed: Option<DateTimeUtc>,
    pub priority: i32,
    pub is_pinned: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "news_articles::Entity",
        from = "Column::NewsArticleId",
        to = "news_articles::Column::Id",
        on_delete = "SetNull"
    )]
    NewsArticle,
}

impl Related<news_articles::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::NewsArticle.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaDto {
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub status: String,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Vec<String>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub date_added: Option<String>,
    pub date_updated: Option<String>,
    pub date_completed: Option<String>,
    pub date_removed: Option<String>,
    pub priority: i32,
    pub is_pinned: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIdeaInput {
    pub title: String,
    pub summary: Option<String>,
    pub status: Option<String>,
    pub news_article_id: Option<i64>,
    pub target: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub priority: Option<i32>,
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIdeaForArticleInput {
    pub article_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaMetadataInput {
    pub title: Option<String>,
    pub summary: Option<String>,
    pub status: Option<String>,
    pub target: Option<String>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<i32>,
    pub is_pinned: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaNotesInput {
    pub notes_markdown: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIdeaArticleInput {
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
}

pub fn parse_tags(raw: &Option<String>) -> Vec<String> {
    raw.as_ref()
        .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
        .unwrap_or_default()
}

pub fn tags_to_json(tags: &[String]) -> Option<String> {
    if tags.is_empty() {
        None
    } else {
        Some(serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()))
    }
}

pub fn validate_status(status: &str) -> AppResult<IdeaStatus> {
    IdeaStatus::from_str(status)
}

fn idea_to_dto(model: Model) -> IdeaDto {
    IdeaDto {
        id: model.id,
        title: model.title,
        summary: model.summary,
        status: model.status.as_str().to_string(),
        news_article_id: model.news_article_id,
        target: model.target,
        tags: parse_tags(&model.tags),
        notes_markdown: model.notes_markdown,
        article_title: model.article_title,
        article_markdown: model.article_markdown,
        date_added: Some(model.date_added.to_rfc3339()),
        date_updated: Some(model.date_updated.to_rfc3339()),
        date_completed: model.date_completed.map(|d| d.to_rfc3339()),
        date_removed: model.date_removed.map(|d| d.to_rfc3339()),
        priority: model.priority,
        is_pinned: model.is_pinned != 0,
    }
}

fn status_or_default(status: &Option<String>) -> AppResult<IdeaStatus> {
    match status {
        Some(status) => validate_status(status),
        None => Ok(IdeaStatus::InProgress),
    }
}

fn bool_to_int(value: Option<bool>) -> i32 {
    if value.unwrap_or(false) {
        1
    } else {
        0
    }
}

/// List writing ideas with filtering, search, and pagination
/// 
/// Supports filtering by status, text search, and archived status.
/// Returns ideas sorted by last updated (newest first).
#[instrument(skip(state), fields(limit = ?limit, offset = ?offset))]
pub async fn list_ideas_handler(
    status: Option<String>,
    search: Option<String>,
    include_removed: Option<bool>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: &State<'_, AppState>,
) -> AppResult<Vec<IdeaDto>> {
    let mut query = Entity::find();

    if let Some(status) = status {
        let status = validate_status(&status)?;
        query = query.filter(Column::Status.eq(status));
    }

    if include_removed != Some(true) {
        query = query.filter(Column::DateRemoved.is_null());
    }

    if let Some(search) = search {
        let pattern = format!("%{search}%");
        query = query.filter(
            Condition::any()
                .add(Column::Title.like(pattern.clone()))
                .add(Column::Summary.like(pattern.clone()))
                .add(Column::Target.like(pattern)),
        );
    }

    // Optimize by excluding heavy markdown columns in list view
    // Only fetch them when viewing individual ideas
    let results = query
        .select_only()
        .columns([
            Column::Id,
            Column::Title,
            Column::Summary,
            Column::Status,
            Column::NewsArticleId,
            Column::Target,
            Column::Tags,
            Column::Priority,
            Column::IsPinned,
            Column::DateAdded,
            Column::DateUpdated,
            Column::DateCompleted,
            Column::DateRemoved,
        ])
        // Exclude: NotesMarkdown, ArticleTitle, ArticleMarkdown
        .order_by_desc(Column::DateUpdated)
        .order_by_desc(Column::DateAdded)
        .limit(limit.unwrap_or(50))
        .offset(offset.unwrap_or(0))
        .into_model::<Model>()
        .all(&state.db)
        .await?;

    Ok(results.into_iter().map(idea_to_dto).collect())
}

pub async fn get_idea_handler(id: i64, state: &State<'_, AppState>) -> AppResult<IdeaDto> {
    let model = Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea not found: {id}")))?;

    Ok(idea_to_dto(model))
}

/// Create a new writing idea
/// 
/// Creates idea with initial metadata and content.
/// Uses default status if not provided.
#[instrument(skip(state, input), fields(title = %input.title))]
pub async fn create_idea_handler(
    input: CreateIdeaInput,
    state: &State<'_, AppState>,
) -> AppResult<IdeaDto> {
    info!("Creating new idea");
    create_idea_with_conn(input, &state.db).await
}

/// Internal helper that accepts any database connection (for transactions)
async fn create_idea_with_conn<C>(input: CreateIdeaInput, db: &C) -> AppResult<IdeaDto>
where
    C: ConnectionTrait,
{
    let now = Utc::now();
    let status = status_or_default(&input.status)?;
    let is_complete = status == IdeaStatus::Complete;

    let model = ActiveModel {
        title: Set(input.title),
        summary: Set(input.summary),
        status: Set(status),
        news_article_id: Set(input.news_article_id),
        target: Set(input.target),
        tags: Set(input.tags.and_then(|tags| tags_to_json(&tags))),
        notes_markdown: Set(input.notes_markdown),
        article_title: Set(input.article_title),
        article_markdown: Set(input.article_markdown),
        date_added: Set(now),
        date_updated: Set(now),
        date_completed: Set(if is_complete { Some(now) } else { None }),
        date_removed: Set(None),
        priority: Set(input.priority.unwrap_or(0)),
        is_pinned: Set(bool_to_int(input.is_pinned)),
        ..Default::default()
    };

    let result = model.insert(db).await?;

    Ok(idea_to_dto(result))
}

/// Create a writing idea from a news article
/// 
/// Converts a news article into an idea, linking them together.
/// Uses a transaction to ensure atomicity.
#[instrument(skip(state), fields(article_id = input.article_id))]
pub async fn create_idea_for_article_handler(
    input: CreateIdeaForArticleInput,
    state: &State<'_, AppState>,
) -> AppResult<IdeaDto> {
    info!("Creating idea from news article");
    // Use transaction to ensure both operations succeed or both fail
    let txn = state.db.begin().await?;

    let article = news_articles::Entity::find_by_id(input.article_id)
        .one(&txn)
        .await?
        .ok_or_else(|| AppError::other(format!("Article not found: {}", input.article_id)))?;

    let tags = parse_tags(&article.tags);

    // Create idea within transaction
    let idea = create_idea_with_conn(
        CreateIdeaInput {
            title: article.title.clone(),
            summary: article.excerpt.clone().or(article.content.clone()),
            status: Some(IdeaStatus::InProgress.as_str().to_string()),
            news_article_id: Some(article.id),
            target: None,
            tags: Some(tags),
            notes_markdown: None,
            article_title: Some(article.title.clone()),
            article_markdown: article.content.clone(),
            priority: Some(0),
            is_pinned: Some(article.is_pinned != 0),
        },
        &txn,
    )
    .await?;

    // Update article within same transaction
    let mut article_model = article.into_active_model();
    article_model.added_to_ideas_at = Set(Some(Utc::now()));
    article_model.update(&txn).await?;

    // Commit transaction - both operations succeed together
    txn.commit().await?;

    Ok(idea)
}

pub async fn update_idea_metadata_handler(
    id: i64,
    input: UpdateIdeaMetadataInput,
    state: &State<'_, AppState>,
) -> AppResult<IdeaDto> {
    let mut model: ActiveModel = Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea not found: {id}")))?
        .into();

    if let Some(title) = input.title {
        model.title = Set(title);
    }
    if let Some(summary) = input.summary {
        model.summary = Set(Some(summary));
    }
    if let Some(status) = input.status {
        let status = validate_status(&status)?;
        let is_complete = matches!(status, IdeaStatus::Complete);
        model.status = Set(status);
        model.date_completed = Set(if is_complete { Some(Utc::now()) } else { None });
    }
    if let Some(target) = input.target {
        model.target = Set(Some(target));
    }
    if let Some(tags) = input.tags {
        model.tags = Set(tags_to_json(&tags));
    }
    if let Some(priority) = input.priority {
        model.priority = Set(priority);
    }
    if let Some(is_pinned) = input.is_pinned {
        model.is_pinned = Set(bool_to_int(Some(is_pinned)));
    }

    model.date_updated = Set(Utc::now());

    let updated = model.update(&state.db).await?;
    Ok(idea_to_dto(updated))
}

pub async fn update_idea_notes_handler(
    id: i64,
    input: UpdateIdeaNotesInput,
    state: &State<'_, AppState>,
) -> AppResult<IdeaDto> {
    let mut model: ActiveModel = Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea not found: {id}")))?
        .into();

    model.notes_markdown = Set(input.notes_markdown);
    model.date_updated = Set(Utc::now());

    let updated = model.update(&state.db).await?;
    Ok(idea_to_dto(updated))
}

pub async fn update_idea_article_handler(
    id: i64,
    input: UpdateIdeaArticleInput,
    state: &State<'_, AppState>,
) -> AppResult<IdeaDto> {
    let mut model: ActiveModel = Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea not found: {id}")))?
        .into();

    model.article_title = Set(input.article_title);
    model.article_markdown = Set(input.article_markdown);
    model.date_updated = Set(Utc::now());

    let updated = model.update(&state.db).await?;
    Ok(idea_to_dto(updated))
}

pub async fn archive_idea_handler(id: i64, state: &State<'_, AppState>) -> AppResult<IdeaDto> {
    let mut model: ActiveModel = Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea not found: {id}")))?
        .into();

    let now = Utc::now();
    model.date_removed = Set(Some(now));
    model.date_updated = Set(now);

    let updated = model.update(&state.db).await?;
    Ok(idea_to_dto(updated))
}
