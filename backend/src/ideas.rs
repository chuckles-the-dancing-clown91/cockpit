use crate::errors::{AppError, AppResult};
use crate::news_articles;
use sea_orm::entity::prelude::*;
use sea_orm::{ActiveValue::Set, QueryOrder};
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "ideas")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub status: String,
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
    pub priority: i64,
    pub is_pinned: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::news_articles::Entity",
        from = "Column::NewsArticleId",
        to = "crate::news_articles::Column::Id",
        on_update = "Cascade",
        on_delete = "SetNull"
    )]
    NewsArticle,
}

impl Related<crate::news_articles::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::NewsArticle.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Debug, Serialize)]
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
    pub date_added: String,
    pub date_updated: String,
    pub date_completed: Option<String>,
    pub date_removed: Option<String>,
    pub priority: i64,
    pub is_pinned: bool,
}

fn vec_to_json(vec: Option<Vec<String>>) -> Option<String> {
    let v = vec.unwrap_or_default();
    if v.is_empty() {
        None
    } else {
        serde_json::to_string(&v).ok()
    }
}

fn json_to_vec(value: &Option<String>) -> Vec<String> {
    value
        .as_ref()
        .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
        .unwrap_or_default()
}

fn normalize_status(status: Option<String>) -> Result<String, AppError> {
    match status.as_deref() {
        None => Ok("in_progress".into()),
        Some("in_progress") | Some("stalled") | Some("complete") => Ok(status.unwrap()),
        Some(other) => Err(AppError::Other(format!("Invalid status: {other}"))),
    }
}

fn idea_to_dto(model: Model) -> IdeaDto {
    IdeaDto {
        id: model.id,
        title: model.title,
        summary: model.summary,
        status: model.status,
        news_article_id: model.news_article_id,
        target: model.target,
        tags: json_to_vec(&model.tags),
        notes_markdown: model.notes_markdown,
        article_title: model.article_title,
        article_markdown: model.article_markdown,
        date_added: model.date_added.to_rfc3339(),
        date_updated: model.date_updated.to_rfc3339(),
        date_completed: model.date_completed.map(|d| d.to_rfc3339()),
        date_removed: model.date_removed.map(|d| d.to_rfc3339()),
        priority: model.priority,
        is_pinned: model.is_pinned == 1,
    }
}

pub async fn list_ideas_handler(
    status: Option<String>,
    include_removed: bool,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    state: &crate::AppState,
) -> AppResult<Vec<IdeaDto>> {
    let mut query = Entity::find();
    if !include_removed {
        query = query.filter(Column::DateRemoved.is_null());
    }
    if let Some(stat) = status {
        if !stat.is_empty() {
            query = query.filter(Column::Status.eq(stat));
        }
    }
    if let Some(search_term) = search {
        if !search_term.trim().is_empty() {
            let like = format!("%{}%", search_term.trim());
            query = query.filter(
                Column::Title
                    .like(like.clone())
                    .or(Column::Summary.like(like.clone()))
                    .or(Column::ArticleTitle.like(like)),
            );
        }
    }
    let models = query
        .order_by_desc(Column::IsPinned)
        .order_by_desc(Column::DateUpdated)
        .order_by_desc(Column::Id)
        .limit(limit.unwrap_or(50))
        .offset(offset.unwrap_or(0))
        .all(&state.db)
        .await?;
    Ok(models.into_iter().map(idea_to_dto).collect())
}

pub async fn get_idea_handler(id: i64, state: &crate::AppState) -> AppResult<IdeaDto> {
    let model = Entity::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::Other("Idea not found".into()));
    };
    Ok(idea_to_dto(m))
}

pub async fn create_idea_handler(
    title: String,
    summary: Option<String>,
    news_article_id: Option<i64>,
    target: Option<String>,
    initial_status: Option<String>,
    tags: Option<Vec<String>>,
    state: &crate::AppState,
) -> AppResult<IdeaDto> {
    let status = normalize_status(initial_status)?;
    let now = chrono::Utc::now();
    let active = ActiveModel {
        title: Set(title),
        summary: Set(summary),
        status: Set(status.clone()),
        news_article_id: Set(news_article_id),
        target: Set(target),
        tags: Set(vec_to_json(tags)),
        notes_markdown: Set(None),
        article_title: Set(None),
        article_markdown: Set(None),
        date_added: Set(now),
        date_updated: Set(now),
        date_completed: Set(if status == "complete" {
            Some(now)
        } else {
            None
        }),
        date_removed: Set(None),
        priority: Set(0),
        is_pinned: Set(0),
        ..Default::default()
    };
    let saved = active.insert(&state.db).await?;
    Ok(idea_to_dto(saved))
}

pub async fn create_idea_for_article_handler(
    article_id: i64,
    state: &crate::AppState,
) -> AppResult<IdeaDto> {
    let article = crate::news_articles::Entity::find_by_id(article_id)
        .one(&state.db)
        .await?;
    let Some(article) = article else {
        return Err(AppError::Other("Article not found".into()));
    };
    let title = format!("Review: {}", article.title);
    let summary = article.excerpt.clone().or_else(|| article.content.clone());
    let tags = {
        let mut out: Vec<String> = Vec::new();
        if let Some(src) = &article.source_id {
            out.push(src.clone());
        }
        let country = crate::news::parse_vec(&article.country);
        out.extend(country);
        let category = crate::news::parse_vec(&article.category);
        out.extend(category);
        out
    };
    let notes = format!(
        "Review for: {title}\nSource: {} ({})\nLink: {}\n\nInitial thoughts:\n- ",
        article
            .source_name
            .clone()
            .or(article.source_domain.clone())
            .unwrap_or_else(|| "Unknown source".into()),
        article.source_id.clone().unwrap_or_else(|| "n/a".into()),
        article.url.clone().unwrap_or_else(|| "n/a".into())
    );
    let now = chrono::Utc::now();
    let active = ActiveModel {
        title: Set(title),
        summary: Set(summary),
        status: Set("in_progress".into()),
        news_article_id: Set(Some(article.id)),
        target: Set(None),
        tags: Set(vec_to_json(Some(tags))),
        notes_markdown: Set(Some(notes)),
        article_title: Set(Some(article.title.clone())),
        article_markdown: Set(None),
        date_added: Set(now),
        date_updated: Set(now),
        date_completed: Set(None),
        date_removed: Set(None),
        priority: Set(0),
        is_pinned: Set(0),
        ..Default::default()
    };
    let saved = active.insert(&state.db).await?;

    let mut article_active: news_articles::ActiveModel = article.into();
    article_active.added_to_ideas_at = Set(Some(now));
    article_active.is_read = Set(1);
    article_active.updated_at = Set(now);
    article_active.update(&state.db).await?;

    Ok(idea_to_dto(saved))
}

pub async fn update_idea_metadata_handler(
    id: i64,
    title: Option<String>,
    summary: Option<String>,
    status: Option<String>,
    target: Option<String>,
    tags: Option<Vec<String>>,
    priority: Option<i64>,
    is_pinned: Option<bool>,
    state: &crate::AppState,
) -> AppResult<IdeaDto> {
    let model = Entity::find_by_id(id).one(&state.db).await?;
    let Some(model) = model else {
        return Err(AppError::Other("Idea not found".into()));
    };
    let mut active: ActiveModel = model.into();
    if let Some(t) = title {
        active.title = Set(t);
    }
    if let Some(s) = summary {
        active.summary = Set(Some(s));
    }
    if let Some(tar) = target {
        active.target = Set(Some(tar));
    }
    if let Some(tag_vec) = tags {
        active.tags = Set(vec_to_json(Some(tag_vec)));
    }
    if let Some(pin) = is_pinned {
        active.is_pinned = Set(if pin { 1 } else { 0 });
    }
    if let Some(p) = priority {
        active.priority = Set(p);
    }
    if let Some(st) = status {
        let normalized = normalize_status(Some(st.clone()))?;
        active.status = Set(normalized.clone());
        if normalized == "complete" && model.date_completed.is_none() {
            active.date_completed = Set(Some(chrono::Utc::now()));
        }
    }
    active.date_updated = Set(chrono::Utc::now());
    let saved = active.update(&state.db).await?;
    Ok(idea_to_dto(saved))
}

pub async fn update_idea_notes_handler(
    id: i64,
    notes_markdown: String,
    state: &crate::AppState,
) -> AppResult<()> {
    let model = Entity::find_by_id(id).one(&state.db).await?;
    let Some(model) = model else {
        return Err(AppError::Other("Idea not found".into()));
    };
    let mut active: ActiveModel = model.into();
    active.notes_markdown = Set(Some(notes_markdown));
    active.date_updated = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

pub async fn update_idea_article_handler(
    id: i64,
    article_title: Option<String>,
    article_markdown: String,
    state: &crate::AppState,
) -> AppResult<()> {
    let model = Entity::find_by_id(id).one(&state.db).await?;
    let Some(model) = model else {
        return Err(AppError::Other("Idea not found".into()));
    };
    let mut active: ActiveModel = model.into();
    if let Some(title) = article_title {
        active.article_title = Set(Some(title));
    }
    active.article_markdown = Set(Some(article_markdown));
    active.date_updated = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

pub async fn archive_idea_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    let model = Entity::find_by_id(id).one(&state.db).await?;
    let Some(model) = model else {
        return Err(AppError::Other("Idea not found".into()));
    };
    let mut active: ActiveModel = model.into();
    active.date_removed = Set(Some(chrono::Utc::now()));
    active.date_updated = Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}
