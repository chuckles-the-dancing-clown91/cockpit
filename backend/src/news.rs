//! NewsData.io integration for fetching and managing news articles
//!
//! This module handles:
//! - Fetching articles from NewsData API (latest and archive endpoints)
//! - Managing news settings (filters, API keys, quotas)
//! - Syncing news sources/providers
//! - Article CRUD operations

use crate::crypto;
use crate::errors::{AppError, AppResult};
use crate::logging;
use crate::news_articles::{self, Entity as EntityNewsArticles};
use crate::news_settings::{self, Entity as EntityNewsSettings};
use crate::news_sources::{self, Entity as EntityNewsSources};
use crate::scheduler::TaskRunResult;
use chrono::Datelike;
use reqwest::Client;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, Set,
};
use tracing::{error, info, warn};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsArticleDto {
    pub id: i64,
    pub article_id: Option<String>,
    pub title: String,
    pub excerpt: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub source_name: Option<String>,
    pub source_domain: Option<String>,
    pub source_id: Option<String>,
    pub tags: Vec<String>,
    pub country: Vec<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub published_at: Option<String>,
    pub fetched_at: Option<String>,
    pub added_via: Option<String>,
    pub is_starred: bool,
    pub is_dismissed: bool,
    pub is_read: bool,
    pub added_to_ideas_at: Option<String>,
    pub dismissed_at: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsSettingsDto {
    pub user_id: i64,
    pub provider: String,
    pub has_api_key: bool,
    pub language: Option<String>,
    pub languages: Vec<String>,
    pub countries: Vec<String>,
    pub categories: Vec<String>,
    pub sources: Vec<String>,
    pub query: Option<String>,
    pub keywords_in_title: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub max_stored: i64,
    pub max_articles: i64,
    pub daily_call_limit: i64,
    pub calls_today: i64,
    pub last_reset_date: Option<String>,
    pub last_synced_at: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct SaveNewsSettingsInput {
    pub api_key: Option<String>,
    pub language: Option<String>,
    pub languages: Option<Vec<String>>,
    pub countries: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub sources: Option<Vec<String>>,
    pub query: Option<String>,
    pub keywords_in_title: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub max_stored: Option<i64>,
    pub max_articles: Option<i64>,
    pub daily_call_limit: Option<i64>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsSourceDto {
    pub id: i64,
    pub source_id: String,
    pub name: String,
    pub url: Option<String>,
    pub country: Option<String>,
    pub language: Option<String>,
    pub category: Vec<String>,
    pub is_active: bool,
    pub is_muted: bool,
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct NewsApiResponse {
    status: Option<String>,
    #[serde(rename = "totalResults")]
    total_results: Option<i64>,
    results: Option<Vec<NewsApiArticle>>,
    #[serde(rename = "nextPage")]
    next_page: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(untagged)]
enum StringOrVec {
    String(String),
    Vec(Vec<String>),
}

#[derive(serde::Deserialize)]
struct NewsApiArticle {
    #[serde(rename = "article_id")]
    article_id: Option<String>,
    title: Option<String>,
    link: Option<String>,
    description: Option<String>,
    content: Option<String>,
    #[serde(rename = "image_url")]
    image_url: Option<String>,
    #[serde(rename = "source_id")]
    source_id: Option<String>,
    country: Option<StringOrVec>,
    category: Option<StringOrVec>,
    language: Option<String>,
    #[serde(rename = "pubDate")]
    pub_date: Option<String>,
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct NewsSourceApiResponse {
    status: Option<String>,
    results: Option<Vec<NewsSourceApiItem>>,
    #[serde(rename = "nextPage")]
    next_page: Option<String>,
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct NewsSourceApiItem {
    #[serde(alias = "source_id", alias = "id")]
    source_id: String,
    name: String,
    url: Option<String>,
    icon: Option<String>,
    country: Option<StringOrVec>,
    language: Option<StringOrVec>,
    category: Option<Vec<String>>,
    description: Option<String>,
}

pub(crate) fn parse_vec(json: &Option<String>) -> Vec<String> {
    json.as_ref()
        .and_then(|s| serde_json::from_str::<Vec<String>>(s).ok())
        .unwrap_or_default()
}

fn to_json_vec(v: &Option<Vec<String>>) -> Option<String> {
    v.as_ref()
        .map(|vec| serde_json::to_string(vec).unwrap_or_else(|_| "[]".into()))
}

fn env_news_api_key() -> Option<String> {
    std::env::var("NEWSDATA_API_KEY")
        .or_else(|_| std::env::var("NEWS_API_KEY"))
        .ok()
}

fn settings_to_dto(m: news_settings::Model) -> NewsSettingsDto {
    NewsSettingsDto {
        user_id: m.user_id,
        provider: m.provider,
        has_api_key: !m.api_key_encrypted.is_empty(),
        language: m.language.clone(),
        languages: parse_vec(&m.languages),
        countries: parse_vec(&m.countries),
        categories: parse_vec(&m.categories),
        sources: parse_vec(&m.sources),
        query: m.query,
        keywords_in_title: m.keywords_in_title,
        from_date: m.from_date,
        to_date: m.to_date,
        max_stored: m.max_stored.unwrap_or(m.max_articles),
        max_articles: m.max_articles,
        daily_call_limit: m.daily_call_limit,
        calls_today: m.calls_today,
        last_reset_date: m
            .last_reset_date
            .map(|d| chrono::NaiveDate::from_ymd_opt(d.year(), d.month(), d.day()).unwrap_or(d))
            .map(|d| d.to_string()),
        last_synced_at: m.last_synced_at.map(|d| d.to_rfc3339()),
    }
}

fn ensure_news_settings_defaults(
    model: Option<news_settings::Model>,
) -> news_settings::ActiveModel {
    if let Some(m) = model {
        m.into()
    } else {
        news_settings::ActiveModel {
            user_id: sea_orm::Set(1),
            provider: sea_orm::Set("newsdata".into()),
            api_key_encrypted: sea_orm::Set(Vec::new()),
            language: sea_orm::Set(Some("en".into())),
            languages: sea_orm::Set(Some(r#"[\"en\"]"#.into())),
            countries: sea_orm::Set(Some(r#"[\"us\"]"#.into())),
            categories: sea_orm::Set(Some("[]".into())),
            sources: sea_orm::Set(Some("[]".into())),
            query: sea_orm::Set(None),
            keywords_in_title: sea_orm::Set(None),
            from_date: sea_orm::Set(None),
            to_date: sea_orm::Set(None),
            max_stored: sea_orm::Set(Some(4000)),
            max_articles: sea_orm::Set(4000),
            daily_call_limit: sea_orm::Set(180),
            calls_today: sea_orm::Set(0),
            last_reset_date: sea_orm::Set(None),
            last_synced_at: sea_orm::Set(None),
            created_at: sea_orm::Set(chrono::Utc::now()),
            updated_at: sea_orm::Set(chrono::Utc::now()),
            ..Default::default()
        }
    }
}

pub async fn get_news_settings_handler(state: &crate::AppState) -> AppResult<NewsSettingsDto> {
    let model = EntityNewsSettings::find()
        .filter(news_settings::Column::UserId.eq(1))
        .filter(news_settings::Column::Provider.eq("newsdata"))
        .one(&state.db)
        .await?;
    let mut existing = if let Some(m) = model {
        m
    } else {
        let mut active = ensure_news_settings_defaults(None);
        if let Some(env_key) = env_news_api_key() {
            info!("news_settings: seeding from env NEWSDATA_API_KEY");
            let cipher = crypto::encrypt_api_key(&env_key)
                .map_err(|e| AppError::Crypto {
                    operation: "encrypt_api_key".to_string(),
                    reason: e.to_string(),
                })?;
            active.api_key_encrypted = sea_orm::Set(cipher);
        }
        active.insert(&state.db).await?
    };

    // If DB is empty but env provides a key, hydrate it once
    if existing.api_key_encrypted.is_empty() {
        if let Some(env_key) = env_news_api_key() {
            info!("news_settings: hydrating empty api_key from env");
            let cipher = crypto::encrypt_api_key(&env_key)
                .map_err(|e| AppError::Crypto {
                    operation: "encrypt_api_key".to_string(),
                    reason: e.to_string(),
                })?;
            let mut active: news_settings::ActiveModel = existing.clone().into();
            active.api_key_encrypted = sea_orm::Set(cipher);
            active.updated_at = sea_orm::Set(chrono::Utc::now());
            existing = active.update(&state.db).await?;
        }
    }

    Ok(settings_to_dto(existing))
}

pub async fn save_news_settings_handler(
    input: SaveNewsSettingsInput,
    state: &crate::AppState,
) -> AppResult<NewsSettingsDto> {
    let model = EntityNewsSettings::find()
        .filter(news_settings::Column::UserId.eq(1))
        .filter(news_settings::Column::Provider.eq("newsdata"))
        .one(&state.db)
        .await?;
    let mut active = ensure_news_settings_defaults(model);
    if let Some(api) = input.api_key {
        let cipher = crypto::encrypt_api_key(&api)
            .map_err(|e| AppError::Crypto {
                operation: "encrypt_api_key".to_string(),
                reason: e.to_string(),
            })?;
        active.api_key_encrypted = sea_orm::Set(cipher);
        active.calls_today = sea_orm::Set(0);
        active.last_reset_date = sea_orm::Set(Some(chrono::Utc::now().date_naive()));
    }
    if let Some(lang) = input.language {
        active.language = sea_orm::Set(Some(lang));
    }
    if let Some(v) = input.languages {
        active.languages = sea_orm::Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.countries {
        active.countries = sea_orm::Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.categories {
        active.categories = sea_orm::Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.sources {
        active.sources = sea_orm::Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(q) = input.query {
        active.query = sea_orm::Set(Some(q));
    }
    if let Some(qt) = input.keywords_in_title {
        active.keywords_in_title = sea_orm::Set(Some(qt));
    }
    if let Some(fd) = input.from_date {
        active.from_date = sea_orm::Set(Some(fd));
    }
    if let Some(td) = input.to_date {
        active.to_date = sea_orm::Set(Some(td));
    }
    if let Some(m) = input.max_stored {
        active.max_stored = sea_orm::Set(Some(m));
        active.max_articles = sea_orm::Set(m);
    }
    if let Some(m) = input.max_articles {
        active.max_articles = sea_orm::Set(m);
    }
    if let Some(d) = input.daily_call_limit {
        active.daily_call_limit = sea_orm::Set(d);
    }
    active.updated_at = sea_orm::Set(chrono::Utc::now());
    let saved = if active.id.is_set() {
        active.update(&state.db).await?
    } else {
        active.insert(&state.db).await?
    };
    Ok(settings_to_dto(saved))
}

fn article_to_dto(m: news_articles::Model) -> NewsArticleDto {
    NewsArticleDto {
        id: m.id,
        article_id: m.provider_article_id,
        title: m.title,
        excerpt: m.excerpt,
        url: m.url,
        image_url: m.image_url,
        source_name: m.source_name,
        source_domain: m.source_domain,
        source_id: m.source_id,
        tags: parse_vec(&m.tags),
        country: parse_vec(&m.country),
        language: m.language,
        category: m.category,
        fetched_at: Some(m.fetched_at.to_rfc3339()),
        added_via: Some(m.added_via),
        is_starred: m.is_starred == 1,
        is_dismissed: m.is_dismissed == 1,
        is_read: m.is_read == 1,
        published_at: m.published_at.map(|d| d.to_rfc3339()),
        added_to_ideas_at: m.added_to_ideas_at.map(|d| d.to_rfc3339()),
        dismissed_at: m.dismissed_at.map(|d| d.to_rfc3339()),
    }
}

pub async fn list_news_articles_handler(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    state: &crate::AppState,
) -> AppResult<Vec<NewsArticleDto>> {
    let mut query = EntityNewsArticles::find().filter(news_articles::Column::UserId.eq(1));
    match status.as_deref() {
        Some("unread") => {
            query = query
                .filter(news_articles::Column::DismissedAt.is_null())
                .filter(news_articles::Column::IsRead.eq(0))
                .filter(news_articles::Column::AddedToIdeasAt.is_null())
                .filter(news_articles::Column::IsDismissed.eq(0));
        }
        Some("dismissed") => query = query.filter(news_articles::Column::IsDismissed.eq(1)),
        Some("ideas") => query = query.filter(news_articles::Column::AddedToIdeasAt.is_not_null()),
        _ => {
            if include_dismissed != Some(true) {
                query = query.filter(news_articles::Column::IsDismissed.eq(0));
            }
        }
    }
    if let Some(term) = search {
        if !term.trim().is_empty() {
            let like = format!("%{}%", term.trim());
            query = query.filter(
                news_articles::Column::Title
                    .like(like.clone())
                    .or(news_articles::Column::Excerpt.like(like.clone()))
                    .or(news_articles::Column::Content.like(like)),
            );
        }
    }
    let items = query
        .order_by_desc(news_articles::Column::PublishedAt)
        .order_by_desc(news_articles::Column::FetchedAt)
        .limit(limit.unwrap_or(30))
        .offset(offset.unwrap_or(0))
        .all(&state.db)
        .await?;
    Ok(items.into_iter().map(article_to_dto).collect())
}

pub async fn get_news_article_handler(
    id: i64,
    state: &crate::AppState,
) -> AppResult<NewsArticleDto> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    Ok(article_to_dto(m))
}

pub async fn dismiss_news_article_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    let mut active: news_articles::ActiveModel = m.into();
    active.dismissed_at = sea_orm::Set(Some(chrono::Utc::now()));
    active.is_dismissed = sea_orm::Set(1);
    active.updated_at = sea_orm::Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

pub async fn toggle_star_news_article_handler(
    id: i64,
    starred: bool,
    state: &crate::AppState,
) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    let mut active: news_articles::ActiveModel = m.into();
    active.is_starred = sea_orm::Set(if starred { 1 } else { 0 });
    active.updated_at = sea_orm::Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

pub async fn mark_news_article_read_handler(id: i64, state: &crate::AppState) -> AppResult<()> {
    let model = EntityNewsArticles::find_by_id(id).one(&state.db).await?;
    let Some(m) = model else {
        return Err(AppError::other("Not found"));
    };
    if m.is_read == 1 {
        return Ok(());
    }
    let mut active: news_articles::ActiveModel = m.into();
    active.is_read = sea_orm::Set(1);
    active.updated_at = sea_orm::Set(chrono::Utc::now());
    active.update(&state.db).await?;
    Ok(())
}

pub async fn list_news_sources_handler(
    country: Option<String>,
    language: Option<String>,
    search: Option<String>,
    state: &crate::AppState,
) -> AppResult<Vec<NewsSourceDto>> {
    let mut query = EntityNewsSources::find();
    if let Some(c) = country {
        if !c.trim().is_empty() {
            query = query.filter(news_sources::Column::Country.eq(c.trim().to_string()));
        }
    }
    if let Some(l) = language {
        if !l.trim().is_empty() {
            query = query.filter(news_sources::Column::Language.eq(l.trim().to_string()));
        }
    }
    if let Some(s) = search {
        if !s.trim().is_empty() {
            let like = format!("%{}%", s.trim());
            query = query.filter(
                news_sources::Column::Name
                    .like(like.clone())
                    .or(news_sources::Column::SourceId.like(like.clone())),
            );
        }
    }
    let rows = query.all(&state.db).await?;
    Ok(rows
        .into_iter()
        .map(|m| NewsSourceDto {
            id: m.id,
            source_id: m.source_id,
            name: m.name,
            url: m.url,
            country: m.country,
            language: m.language,
            category: parse_vec(&m.category),
            is_active: m.is_active == 1,
            is_muted: m.is_muted == 1,
        })
        .collect())
}

pub async fn sync_news_now_handler(
    state: &crate::AppState,
) -> AppResult<crate::scheduler::RunTaskNowResult> {
    info!("news_sync: manual trigger invoked");
    let res = run_news_sync_task(state).await;
    let finished_at = chrono::Utc::now().to_rfc3339();
    match res.status {
        "success" => info!("news_sync: completed ok"),
        "skipped" => warn!("news_sync: skipped - {:?}", res.result_json),
        _ => error!("news_sync: error - {:?}", res.error_message),
    }
    Ok(crate::scheduler::RunTaskNowResult {
        status: res.status.to_string(),
        result: res.result_json,
        error_message: res.error_message,
        finished_at,
    })
}

pub async fn sync_news_sources_now_handler(
    state: &crate::AppState,
) -> AppResult<crate::scheduler::RunTaskNowResult> {
    info!("news_sources_sync: manual trigger invoked");
    let res = run_news_sources_sync_task(state).await;
    let finished_at = chrono::Utc::now().to_rfc3339();
    match res.status {
        "success" => info!("news_sources_sync: completed ok"),
        "skipped" => warn!("news_sources_sync: skipped - {:?}", res.result_json),
        _ => error!("news_sources_sync: error - {:?}", res.error_message),
    }
    Ok(crate::scheduler::RunTaskNowResult {
        status: res.status.to_string(),
        result: res.result_json,
        error_message: res.error_message,
        finished_at,
    })
}

pub async fn run_news_sync_task(state: &crate::AppState) -> TaskRunResult {
    let client = Client::new();
    let provider = "newsdata".to_string();
    let maybe_settings = EntityNewsSettings::find()
        .filter(news_settings::Column::UserId.eq(1))
        .filter(news_settings::Column::Provider.eq(provider.clone()))
        .one(&state.db)
        .await;

    let mut settings = match maybe_settings {
        Ok(Some(s)) => s,
        Ok(None) => {
            // seed from env if available
            if let Some(env_key) = env_news_api_key() {
                info!("news_sync: seeding settings from env NEWSDATA_API_KEY");
                let mut active = ensure_news_settings_defaults(None);
                let cipher = match crypto::encrypt_api_key(&env_key) {
                    Ok(c) => c,
                    Err(e) => {
                        return TaskRunResult {
                            status: "error",
                            result_json: None,
                            error_message: Some(e.to_string()),
                        }
                    }
                };
                active.api_key_encrypted = sea_orm::Set(cipher);
                match active.insert(&state.db).await {
                    Ok(m) => m,
                    Err(e) => {
                        return TaskRunResult {
                            status: "error",
                            result_json: None,
                            error_message: Some(e.to_string()),
                        }
                    }
                }
            } else {
                return TaskRunResult {
                    status: "skipped",
                    result_json: Some("{\"reason\":\"no settings\"}".into()),
                    error_message: None,
                };
            }
        }
        Err(e) => {
            return TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(e.to_string()),
            }
        }
    };

    if settings.api_key_encrypted.is_empty() {
        if let Some(env_key) = env_news_api_key() {
            info!("news_sync: hydrating empty api_key from env");
            let cipher = match crypto::encrypt_api_key(&env_key) {
                Ok(c) => c,
                Err(e) => {
                    return TaskRunResult {
                        status: "error",
                        result_json: None,
                        error_message: Some(e.to_string()),
                    }
                }
            };
            let mut active: news_settings::ActiveModel = settings.clone().into();
            active.api_key_encrypted = sea_orm::Set(cipher);
            active.updated_at = sea_orm::Set(chrono::Utc::now());
            settings = match active.update(&state.db).await {
                Ok(m) => m,
                Err(e) => {
                    return TaskRunResult {
                        status: "error",
                        result_json: None,
                        error_message: Some(e.to_string()),
                    }
                }
            };
        } else {
            return TaskRunResult {
                status: "skipped",
                result_json: Some("{\"reason\":\"no api key\"}".into()),
                error_message: None,
            };
        }
    }

    let endpoint = if settings.from_date.is_some() || settings.to_date.is_some() {
        "https://newsdata.io/api/1/archive"
    } else {
        "https://newsdata.io/api/1/latest"
    };

    let today = chrono::Utc::now().date_naive();
    let mut calls_today = settings.calls_today;
    let mut last_reset = settings.last_reset_date;
    if last_reset.map(|d| d < today).unwrap_or(true) {
        calls_today = 0;
        last_reset = Some(today);
    }

    let daily_limit = settings.daily_call_limit;
    let mut allowed = daily_limit - calls_today;
    if allowed <= 0 {
        return TaskRunResult {
            status: "skipped",
            result_json: Some("{\"reason\":\"daily limit reached\"}".into()),
            error_message: None,
        };
    }
    allowed = allowed.min(3);

    let languages = parse_vec(&settings.languages);
    let countries = parse_vec(&settings.countries);
    let categories = parse_vec(&settings.categories);

    let api_key = match crypto::decrypt_api_key(&settings.api_key_encrypted) {
        Ok(k) => k,
        Err(e) => {
            return TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(format!("decrypt api key failed: {e}")),
            }
        }
    };

    let mut inserted = 0;
    let mut updated = 0;
    let mut calls_used = 0;
    let mut next_page: Option<String> = None;

    for _ in 0..allowed {
        let mut req = client.get(endpoint).query(&[("apikey", api_key.as_str())]);
        if let Some(lang) = &settings.language {
            if !lang.trim().is_empty() {
                req = req.query(&[("language", lang.trim())]);
            }
        } else if !languages.is_empty() {
            req = req.query(&[("language", &languages.join(","))]);
        }
        if !countries.is_empty() {
            req = req.query(&[("country", &countries.join(","))]);
        }
        if let Some(srcs) = &settings.sources {
            if let Ok(list) = serde_json::from_str::<Vec<String>>(srcs) {
                if !list.is_empty() {
                    // NewsData uses `domain` to filter sources; values come from the sources endpoint ids
                    let joined = list.join(",");
                    req = req.query(&[("domain", joined.as_str())]);
                }
            }
        }
        if !categories.is_empty() {
            req = req.query(&[("category", &categories.join(","))]);
        }
        if let Some(q) = &settings.query {
            req = req.query(&[("q", q.as_str())]);
        }
        if let Some(qt) = &settings.keywords_in_title {
            req = req.query(&[("qInTitle", qt.as_str())]);
        }
        if let Some(fd) = &settings.from_date {
            req = req.query(&[("from_date", fd.as_str())]);
        }
        if let Some(td) = &settings.to_date {
            req = req.query(&[("to_date", td.as_str())]);
        }
        if let Some(page) = next_page.clone() {
            req = req.query(&[("page", page.as_str())]);
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(e.to_string()),
                }
            }
        };
        let status_code = resp.status();
        let text = match resp.text().await {
            Ok(t) => t,
            Err(e) => {
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(format!("http {} body read failed: {}", status_code, e)),
                }
            }
        };
        let body: NewsApiResponse = match serde_json::from_str(&text) {
            Ok(b) => b,
            Err(e) => {
                let preview = text.chars().take(320).collect::<String>();
                logging::log_api_call("news_sync", endpoint, status_code, &preview, &state.config.logging.api_log_path);
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(format!(
                        "parse failed (status {}): {}; body preview: {}",
                        status_code, e, preview
                    )),
                };
            }
        };
        logging::log_api_call(
            "news_sync",
            endpoint,
            status_code,
            &text.chars().take(512).collect::<String>(),
            &state.config.logging.api_log_path,
        );
        calls_used += 1;
        if let Some(res_list) = body.results {
            for art in res_list {
                let title = match art.title {
                    Some(t) if !t.trim().is_empty() => t,
                    _ => continue,
                };
                let url = art.link.clone();
                let existing = if let Some(u) = &url {
                    EntityNewsArticles::find()
                        .filter(news_articles::Column::UserId.eq(1))
                        .filter(news_articles::Column::Provider.eq(provider.clone()))
                        .filter(news_articles::Column::Url.eq(u.clone()))
                        .one(&state.db)
                        .await
                        .ok()
                        .flatten()
                } else {
                    None
                };
                let tags_vec = match art.category {
                    Some(StringOrVec::String(s)) => vec![s],
                    Some(StringOrVec::Vec(v)) => v,
                    None => vec![],
                };
                let tags = to_json_vec(&Some(tags_vec.clone()));
                let country_vec = match art.country {
                    Some(StringOrVec::String(s)) => vec![s],
                    Some(StringOrVec::Vec(v)) => v,
                    None => vec![],
                };
                let country_json = to_json_vec(&Some(country_vec.clone()));
                let published_at = art
                    .pub_date
                    .as_ref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));

                if let Some(existing) = existing {
                    let mut active: news_articles::ActiveModel = existing.into();
                    active.title = Set(title.clone());
                    active.excerpt = Set(art.description.clone());
                    active.content = Set(art.content.clone());
                    active.tags = Set(tags.clone());
                    active.image_url = Set(art.image_url.clone());
                    active.language = Set(art.language.clone());
                    active.category = Set(tags_vec.first().cloned());
                    active.country = Set(country_json.clone());
                    active.source_id = Set(art.source_id.clone());
                    active.published_at = Set(published_at);
                    active.updated_at = Set(chrono::Utc::now());
                    if let Err(e) = active.update(&state.db).await {
                        eprintln!("[news_sync] update failed: {e}");
                    } else {
                        updated += 1;
                    }
                } else {
                    let active = news_articles::ActiveModel {
                        user_id: Set(1),
                        provider: Set(provider.clone()),
                        provider_article_id: Set(art.article_id.clone()),
                        source_id: Set(art.source_id.clone()),
                        source_name: Set(art.source_id.clone()),
                        source_domain: Set(None),
                        title: Set(title.clone()),
                        excerpt: Set(art.description.clone()),
                        content: Set(art.content.clone()),
                        tags: Set(tags.clone()),
                        country: Set(country_json.clone()),
                        url: Set(url.clone()),
                        image_url: Set(art.image_url.clone()),
                        language: Set(art.language.clone()),
                        category: Set(tags_vec.first().cloned()),
                        published_at: Set(published_at),
                        fetched_at: Set(chrono::Utc::now()),
                        added_via: Set("sync".into()),
                        is_starred: Set(0),
                        is_dismissed: Set(0),
                        added_to_ideas_at: Set(None),
                        dismissed_at: Set(None),
                        is_pinned: Set(0),
                        created_at: Set(chrono::Utc::now()),
                        updated_at: Set(chrono::Utc::now()),
                        ..Default::default()
                    };
                    if let Err(e) = active.insert(&state.db).await {
                        eprintln!("[news_sync] insert failed: {e}");
                    } else {
                        inserted += 1;
                    }
                }
            }
        }

        if let Some(next) = body.next_page {
            next_page = Some(next);
        } else {
            break;
        }
    }

    let max_keep = settings.max_stored.unwrap_or(settings.max_articles);

    if let Ok(total) = EntityNewsArticles::find()
        .filter(news_articles::Column::UserId.eq(1))
        .count(&state.db)
        .await
    {
        if total as i64 > max_keep {
            let to_delete = total as i64 - max_keep;
            let ids = EntityNewsArticles::find()
                .filter(news_articles::Column::UserId.eq(1))
                .filter(news_articles::Column::IsPinned.eq(0))
                .filter(news_articles::Column::IsStarred.eq(0))
                .filter(news_articles::Column::IsDismissed.eq(0))
                .filter(news_articles::Column::AddedToIdeasAt.is_null())
                .filter(news_articles::Column::DismissedAt.is_null())
                .order_by_asc(news_articles::Column::PublishedAt)
                .order_by_asc(news_articles::Column::FetchedAt)
                .limit(to_delete as u64)
                .all(&state.db)
                .await
                .unwrap_or_default()
                .into_iter()
                .map(|m| m.id)
                .collect::<Vec<_>>();
            if !ids.is_empty() {
                let _ = EntityNewsArticles::delete_many()
                    .filter(news_articles::Column::Id.is_in(ids))
                    .exec(&state.db)
                    .await;
            }
        }
    }

    let mut active: news_settings::ActiveModel = settings.into();
    active.calls_today = Set(calls_today + calls_used);
    active.last_reset_date = Set(last_reset);
    active.last_synced_at = Set(Some(chrono::Utc::now()));
    active.updated_at = Set(chrono::Utc::now());
    let _ = active.update(&state.db).await;

    TaskRunResult {
        status: "success",
        result_json: Some(
            serde_json::json!({"inserted": inserted, "updated": updated, "callsUsed": calls_used})
                .to_string(),
        ),
        error_message: None,
    }
}

pub async fn run_news_sources_sync_task(state: &crate::AppState) -> TaskRunResult {
    let client = Client::new();
    let settings = EntityNewsSettings::find()
        .filter(news_settings::Column::UserId.eq(1))
        .filter(news_settings::Column::Provider.eq("newsdata"))
        .one(&state.db)
        .await;

    let settings = match settings {
        Ok(Some(s)) => s,
        _ => {
            return TaskRunResult {
                status: "skipped",
                result_json: Some("{\"reason\":\"no settings\"}".into()),
                error_message: None,
            }
        }
    };

    if settings.api_key_encrypted.is_empty() {
        return TaskRunResult {
            status: "skipped",
            result_json: Some("{\"reason\":\"no api key\"}".into()),
            error_message: None,
        };
    }

    let api_key = match crypto::decrypt_api_key(&settings.api_key_encrypted) {
        Ok(k) => k,
        Err(e) => {
            return TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(format!("decrypt api key failed: {e}")),
            }
        }
    };

    let mut next_page: Option<String> = None;
    let mut seen = 0;
    let mut updated = 0;
    let mut inserted = 0;

    loop {
        let mut req = client
            .get("https://newsdata.io/api/1/sources")
            .query(&[("apikey", api_key.as_str())]);
        if let Some(lang) = &settings.language {
            if !lang.trim().is_empty() {
                req = req.query(&[("language", lang.trim())]);
            }
        }
        if let Some(countries) = &settings.countries {
            if let Ok(list) = serde_json::from_str::<Vec<String>>(countries) {
                if !list.is_empty() {
                    req = req.query(&[("country", list.join(",").as_str())]);
                }
            }
        }
        if let Some(next) = &next_page {
            req = req.query(&[("page", next.as_str())]);
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(e.to_string()),
                }
            }
        };
        let status = resp.status();
        let text = match resp.text().await {
            Ok(t) => t,
            Err(e) => {
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(e.to_string()),
                }
            }
        };
        if !status.is_success() {
            let preview: String = text.chars().take(320).collect();
            logging::log_api_call(
                "news_sources_sync",
                "https://newsdata.io/api/1/sources",
                status,
                &preview,
                &state.config.logging.api_log_path,
            );
            return TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(format!("http {}: {}", status, preview)),
            };
        }
        let body: NewsSourceApiResponse = match serde_json::from_str(&text) {
            Ok(b) => b,
            Err(e) => {
                let preview: String = text.chars().take(320).collect();
                logging::log_api_call(
                    "news_sources_sync",
                    "https://newsdata.io/api/1/sources",
                    status,
                    &preview,
                    &state.config.logging.api_log_path,
                );
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(format!("parse: {}; body: {}", e, preview)),
                };
            }
        };
        logging::log_api_call(
            "news_sources_sync",
            "https://newsdata.io/api/1/sources",
            status,
            &text.chars().take(512).collect::<String>(),
            &state.config.logging.api_log_path,
        );

        if let Some(list) = body.results {
            for item in list {
                seen += 1;
                let category = to_json_vec(&item.category);
                let country = match item.country {
                    Some(StringOrVec::String(s)) => Some(s),
                    Some(StringOrVec::Vec(v)) => v.first().cloned(),
                    None => None,
                };
                let language = match item.language {
                    Some(StringOrVec::String(s)) => Some(s),
                    Some(StringOrVec::Vec(v)) => v.first().cloned(),
                    None => None,
                };
                let existing = EntityNewsSources::find()
                    .filter(news_sources::Column::SourceId.eq(item.source_id.clone()))
                    .one(&state.db)
                    .await
                    .ok()
                    .flatten();
                if let Some(existing) = existing {
                    let mut active: news_sources::ActiveModel = existing.into();
                    active.name = Set(item.name.clone());
                    active.url = Set(item.url.clone());
                    active.country = Set(country.clone());
                    active.language = Set(language.clone());
                    active.category = Set(category.clone());
                    active.updated_at = Set(chrono::Utc::now());
                    if let Ok(_) = active.update(&state.db).await {
                        updated += 1;
                    }
                } else {
                    let active = news_sources::ActiveModel {
                        source_id: Set(item.source_id.clone()),
                        name: Set(item.name.clone()),
                        url: Set(item.url.clone()),
                        country: Set(country.clone()),
                        language: Set(language.clone()),
                        category: Set(category.clone()),
                        is_active: Set(1),
                        is_muted: Set(0),
                        created_at: Set(chrono::Utc::now()),
                        updated_at: Set(chrono::Utc::now()),
                        ..Default::default()
                    };
                    if let Ok(_) = active.insert(&state.db).await {
                        inserted += 1;
                    }
                }
            }
        }

        if let Some(next) = body.next_page {
            next_page = Some(next);
        } else {
            break;
        }
    }

    TaskRunResult {
        status: "success",
        result_json: Some(
            serde_json::json!({"sourcesSeen": seen, "inserted": inserted, "updated": updated})
                .to_string(),
        ),
        error_message: None,
    }
}
