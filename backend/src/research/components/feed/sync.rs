//! News sync module
//! 
//! Handles fetching news articles from NewsData API with
//! retry logic, rate limiting, and quota management.

use tracing::{error, info, instrument, warn};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Set};

use crate::core::components::crypto;
use crate::core::components::logging;
use crate::research::components::articles::{self as news_articles, Entity as EntityNewsArticles};
use crate::research::components::settings::{self as news_settings, Entity as EntityNewsSettings};
use crate::system::components::scheduler::TaskRunResult;

use super::types::{NewsApiResponse, StringOrVec, env_news_api_key, parse_vec, sanitize_error_for_logging, to_json_vec};
use super::settings::ensure_news_settings_defaults;

/// Retry an HTTP request with exponential backoff
/// 
/// Retries up to 3 times with delays of 1s, 2s, 4s
/// Handles transient network errors and rate limits (429)
pub(crate) async fn retry_request<F, Fut>(mut f: F) -> Result<reqwest::Response, reqwest::Error>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<reqwest::Response, reqwest::Error>>,
{
    let max_retries = 3;
    let mut attempt = 0;
    
    loop {
        match f().await {
            Ok(resp) => {
                // Check for rate limiting
                if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                    if attempt >= max_retries {
                        warn!(target: "news", "Rate limited after {} retries", max_retries);
                        return Ok(resp);
                    }
                    
                    // Check Retry-After header
                    let delay = if let Some(retry_after) = resp.headers().get("retry-after") {
                        retry_after
                            .to_str()
                            .ok()
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(1u64 << attempt)
                    } else {
                        1u64 << attempt // Exponential backoff: 1s, 2s, 4s
                    };
                    
                    warn!(target: "news", "Rate limited, retrying in {}s (attempt {}/{})", delay, attempt + 1, max_retries);
                    tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
                    attempt += 1;
                    continue;
                }
                
                return Ok(resp);
            }
            Err(e) => {
                // Only retry on transient errors
                if attempt >= max_retries || !e.is_timeout() && !e.is_connect() {
                    return Err(e);
                }
                
                let delay = 1u64 << attempt; // Exponential backoff
                let sanitized_error = sanitize_error_for_logging(&e);
                warn!(target: "news", "Request failed: {}, retrying in {}s (attempt {}/{})", sanitized_error, delay, attempt + 1, max_retries);
                tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
                attempt += 1;
            }
        }
    }
}

/// Manual trigger for news sync
pub async fn sync_news_now_handler(
    state: &crate::AppState,
) -> crate::core::components::errors::AppResult<crate::system::scheduler::RunTaskNowResult> {
    info!("news_sync: manual trigger invoked");
    let res = run_news_sync_task(state).await;
    let finished_at = chrono::Utc::now().to_rfc3339();
    match res.status {
        "success" => info!("news_sync: completed ok"),
        "skipped" => warn!("news_sync: skipped - {:?}", res.result_json),
        _ => error!("news_sync: error - {:?}", res.error_message),
    }
    Ok(crate::system::scheduler::RunTaskNowResult {
        status: res.status.to_string(),
        result: res.result_json,
        error_message: res.error_message,
        finished_at,
    })
}

/// Scheduled task: Fetch latest news articles from NewsData.io API
/// 
/// Runs periodically to sync new articles based on user settings.
/// Respects daily API call quotas and handles rate limiting.
#[instrument(skip(state))]
pub async fn run_news_sync_task(state: &crate::AppState) -> TaskRunResult {
    let client = &state.http_client;
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
                active.api_key_encrypted = Set(cipher);
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
            let mut active = settings.clone().into_active_model();
            active.api_key_encrypted = Set(cipher);
            active.updated_at = Set(chrono::Utc::now());
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

        // Use retry logic for transient errors and rate limits
        let resp = match retry_request(|| req.try_clone().unwrap().send()).await {
            Ok(r) => r,
            Err(e) => {
                let sanitized_error = sanitize_error_for_logging(&e);
                return TaskRunResult {
                    status: "error",
                    result_json: None,
                    error_message: Some(format!("HTTP request failed after retries: {}", sanitized_error)),
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
            // Batch fetch existing articles to avoid N+1 queries
            let urls: Vec<String> = res_list
                .iter()
                .filter_map(|art| art.link.clone())
                .collect();
            
            let existing_articles = if !urls.is_empty() {
                match EntityNewsArticles::find()
                    .filter(news_articles::Column::UserId.eq(1))
                    .filter(news_articles::Column::Provider.eq(provider.clone()))
                    .filter(news_articles::Column::Url.is_in(urls))
                    .all(&state.db)
                    .await
                {
                    Ok(articles) => articles,
                    Err(e) => {
                        error!(target: "news_sync", "Failed to fetch existing articles: {}", e);
                        vec![]
                    }
                }
            } else {
                vec![]
            };
            
            // Create lookup map for O(1) access
            let existing_map: std::collections::HashMap<String, news_articles::Model> = 
                existing_articles
                    .into_iter()
                    .filter_map(|m| m.url.clone().map(|url| (url, m)))
                    .collect();
            
            for art in res_list {
                let title = match art.title {
                    Some(t) if !t.trim().is_empty() => t,
                    _ => continue,
                };
                let url = art.link.clone();
                let existing = url.as_ref().and_then(|u| existing_map.get(u));
                
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
                let country_json = to_json_vec(&Some(country_vec));
                let published_at = art
                    .pub_date
                    .as_ref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));

                if let Some(existing) = existing.cloned() {
                    let mut active = existing.into_active_model();
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
                        error!(target: "news_sync", "Article update failed: {}", e);
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
                        error!(target: "news_sync", "Article insert failed: {}", e);
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
            let ids: Vec<i32> = EntityNewsArticles::find()
                .filter(news_articles::Column::UserId.eq(1))
                .filter(news_articles::Column::IsPinned.eq(0))
                .filter(news_articles::Column::IsStarred.eq(0))
                .filter(news_articles::Column::IsDismissed.eq(0))
                .filter(news_articles::Column::AddedToIdeasAt.is_null())
                .filter(news_articles::Column::DismissedAt.is_null())
                .order_by_asc(news_articles::Column::PublishedAt)
                .order_by_asc(news_articles::Column::FetchedAt)
                .limit(to_delete as u64)
                .select_only()
                .column(news_articles::Column::Id)
                .into_tuple()
                .all(&state.db)
                .await
                .unwrap_or_default();
            if !ids.is_empty() {
                if let Err(e) = EntityNewsArticles::delete_many()
                    .filter(news_articles::Column::Id.is_in(ids))
                    .exec(&state.db)
                    .await
                {
                    error!(target: "news_sync", "Failed to delete old articles: {}", e);
                }
            }
        }
    }

    let mut active = settings.into_active_model();
    active.calls_today = Set(calls_today + calls_used);
    active.last_reset_date = Set(last_reset);
    active.last_synced_at = Set(Some(chrono::Utc::now()));
    active.updated_at = Set(chrono::Utc::now());
    if let Err(e) = active.update(&state.db).await {
        error!(target: "news_sync", "Failed to update news settings: {}", e);
    }

    TaskRunResult {
        status: "success",
        result_json: Some(
            serde_json::json!({"inserted": inserted, "updated": updated, "callsUsed": calls_used})
                .to_string(),
        ),
        error_message: None,
    }
}
