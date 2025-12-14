//! News sources management module
//! 
//! Handles listing news sources and syncing sources from NewsData API.

use tracing::{error, info, instrument, warn};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};

use crate::core::components::crypto;
use crate::core::components::errors::AppResult;
use crate::core::components::logging;
use super::entities::settings::{self as news_settings, Entity as EntityNewsSettings};
use super::entities::sources::{self as news_sources, Entity as EntityNewsSources};
use crate::system::components::scheduler::TaskRunResult;

use super::types::{NewsSourceDto, NewsSourceApiResponse, StringOrVec, parse_vec, to_json_vec};
use super::sync::retry_request;

/// List news sources with optional filtering
/// 
/// Filters by country, language, and search terms.
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
                    .or(news_sources::Column::SourceId.like(like)),
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

/// Manual trigger for sources sync
pub async fn sync_news_sources_now_handler(
    state: &crate::AppState,
) -> AppResult<crate::system::scheduler::RunTaskNowResult> {
    info!("news_sources_sync: manual trigger invoked");
    let res = run_news_sources_sync_task(state).await;
    let finished_at = chrono::Utc::now().to_rfc3339();
    match res.status {
        "success" => info!("news_sources_sync: completed ok"),
        "skipped" => warn!("news_sources_sync: skipped - {:?}", res.result_json),
        _ => error!("news_sources_sync: error - {:?}", res.error_message),
    }
    Ok(crate::system::scheduler::RunTaskNowResult {
        status: res.status.to_string(),
        result: res.result_json,
        error_message: res.error_message,
        finished_at,
    })
}

/// Scheduled task: Sync news sources from NewsData API
/// 
/// Fetches available news sources and updates local database.
#[instrument(skip(state))]
pub async fn run_news_sources_sync_task(state: &crate::AppState) -> TaskRunResult {
    let client = &state.http_client;
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

        // Use retry logic for transient errors and rate limits
        let resp = match retry_request(|| req.try_clone().unwrap().send()).await {
            Ok(r) => r,
            Err(e) => {
                use super::types::sanitize_error_for_logging;
                let sanitized_error = sanitize_error_for_logging(&e);
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(format!("HTTP request failed after retries: {}", sanitized_error)),
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
                    let mut active = existing.into_active_model();
                    active.name = Set(item.name.clone());
                    active.url = Set(item.url.clone());
                    active.country = Set(country.clone());
                    active.language = Set(language.clone());
                    active.category = Set(category.clone());
                    active.updated_at = Set(chrono::Utc::now());
                    if active.update(&state.db).await.is_ok() {
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
                    if active.insert(&state.db).await.is_ok() {
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
