//! News settings management module
//! 
//! Handles fetching and updating news settings including
//! API keys, filters, quotas, and sync configuration.

use chrono::Datelike;
use tracing::{info, instrument};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};

use crate::core::components::crypto;
use crate::core::components::errors::{AppError, AppResult};
use super::entities::settings::{self as news_settings, Entity as EntityNewsSettings};

use super::types::{NewsSettingsDto, SaveNewsSettingsInput, env_news_api_key, parse_vec};

/// Convert settings model to DTO
pub(crate) fn settings_to_dto(m: news_settings::Model) -> NewsSettingsDto {
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

/// Ensure news settings exist with defaults
pub(crate) fn ensure_news_settings_defaults(
    model: Option<news_settings::Model>,
) -> news_settings::ActiveModel {
    if let Some(m) = model {
        m.into()
    } else {
        news_settings::ActiveModel {
            user_id: Set(1),
            provider: Set("newsdata".into()),
            api_key_encrypted: Set(Vec::new()),
            language: Set(Some("en".into())),
            languages: Set(Some(r#"["en"]"#.into())),
            countries: Set(Some(r#"["us"]"#.into())),
            categories: Set(Some("[]".into())),
            sources: Set(Some("[]".into())),
            query: Set(None),
            keywords_in_title: Set(None),
            from_date: Set(None),
            to_date: Set(None),
            max_stored: Set(Some(4000)),
            max_articles: Set(4000),
            daily_call_limit: Set(180),
            calls_today: Set(0),
            last_reset_date: Set(None),
            last_synced_at: Set(None),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        }
    }
}

/// Get news settings for the current user
/// 
/// Fetches settings with decrypted API key status.
/// Creates default settings if none exist.
#[instrument(skip(state))]
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
            active.api_key_encrypted = Set(cipher);
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
            let mut active = existing.clone().into_active_model();
            active.api_key_encrypted = Set(cipher);
            active.updated_at = Set(chrono::Utc::now());
            existing = active.update(&state.db).await?;
        }
    }

    Ok(settings_to_dto(existing))
}

/// Save news settings
/// 
/// Updates settings based on provided input.
/// Encrypts API key if provided.
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
        active.api_key_encrypted = Set(cipher);
        active.calls_today = Set(0);
        active.last_reset_date = Set(Some(chrono::Utc::now().date_naive()));
    }
    if let Some(lang) = input.language {
        active.language = Set(Some(lang));
    }
    if let Some(v) = input.languages {
        active.languages = Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.countries {
        active.countries = Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.categories {
        active.categories = Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(v) = input.sources {
        active.sources = Set(Some(
            serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()),
        ));
    }
    if let Some(q) = input.query {
        active.query = Set(Some(q));
    }
    if let Some(qt) = input.keywords_in_title {
        active.keywords_in_title = Set(Some(qt));
    }
    if let Some(fd) = input.from_date {
        active.from_date = Set(Some(fd));
    }
    if let Some(td) = input.to_date {
        active.to_date = Set(Some(td));
    }
    if let Some(m) = input.max_stored {
        active.max_stored = Set(Some(m));
        active.max_articles = Set(m);
    }
    if let Some(m) = input.max_articles {
        active.max_articles = Set(m);
    }
    if let Some(d) = input.daily_call_limit {
        active.daily_call_limit = Set(d);
    }
    active.updated_at = Set(chrono::Utc::now());
    let saved = if active.id.is_set() {
        active.update(&state.db).await?
    } else {
        active.insert(&state.db).await?
    };
    Ok(settings_to_dto(saved))
}
