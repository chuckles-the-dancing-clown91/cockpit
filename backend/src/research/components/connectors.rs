//! Research connector handlers (accounts, streams, items)

use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QuerySelect, Set};
use serde_json::json;
use tracing::{info, warn};

use crate::AppState;
use crate::connectors::{get_connector, NormalizedItem};
use crate::research::dto::{
    CreateResearchAccountInput, ListResearchItemsQuery, ResearchAccountDto, ResearchCapability,
    ResearchItemDto, ResearchStreamDto, UpdateResearchAccountInput, UpsertResearchStreamInput,
};
use crate::research::entities::{accounts, items, streams};
use crate::research::helpers::format_naive;

// Capability guard placeholder (to be backed by DB/account lookups)
fn parse_caps(json_str: &str) -> Vec<ResearchCapability> {
    serde_json::from_str(json_str).unwrap_or_default()
}

fn redact_value(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut redacted = serde_json::Map::new();
            for (k, v) in map {
                if ["apikey", "apiKey", "token", "auth", "password", "secret"].contains(&k.as_str())
                {
                    redacted.insert(k.clone(), serde_json::Value::String("[redacted]".into()));
                } else {
                    redacted.insert(k.clone(), redact_value(v));
                }
            }
            serde_json::Value::Object(redacted)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(redact_value).collect())
        }
        _ => value.clone(),
    }
}

pub async fn list_accounts(state: &AppState) -> Result<Vec<ResearchAccountDto>, String> {
    let rows = accounts::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let dtos = rows
        .into_iter()
        .map(|m| ResearchAccountDto {
            id: m.id,
            provider: m.provider,
            display_name: m.display_name,
            enabled: m.enabled,
            allowed_caps: parse_caps(&m.allowed_caps_json),
            permissions: m.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

pub async fn upsert_account(
    input: CreateResearchAccountInput,
    state: &AppState,
) -> Result<ResearchAccountDto, String> {
    info!(
        provider = %input.provider,
        display_name = %input.display_name,
        allowed_caps = ?input.allowed_caps,
        auth = ?input.auth.as_ref().map(redact_value),
        "research_upsert_account start"
    );
    let now = Utc::now().naive_utc();
    let caps_json = serde_json::to_string(&input.allowed_caps).map_err(|e| e.to_string())?;
    let permissions_json = input
        .permissions
        .as_ref()
        .map(|p| serde_json::to_string(p).map_err(|e| e.to_string()))
        .transpose()?;
    let auth_encrypted = input
        .auth
        .as_ref()
        .map(|a| serde_json::to_vec(a).map_err(|e| e.to_string()))
        .transpose()?;

    let model = accounts::ActiveModel {
        provider: Set(input.provider),
        display_name: Set(input.display_name),
        enabled: Set(input.enabled.unwrap_or(true)),
        allowed_caps_json: Set(caps_json),
        permissions_json: Set(permissions_json),
        auth_encrypted: Set(auth_encrypted),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let saved = model.insert(&state.db).await.map_err(|e| e.to_string())?;

    info!(
        account_id = saved.id,
        provider = %saved.provider,
        "research_upsert_account ok"
    );
    Ok(ResearchAccountDto {
        id: saved.id,
        provider: saved.provider,
        display_name: saved.display_name,
        enabled: saved.enabled,
        allowed_caps: parse_caps(&saved.allowed_caps_json),
        permissions: saved.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
        created_at: format_naive(saved.created_at),
        updated_at: format_naive(saved.updated_at),
    })
}

pub async fn update_account(
    input: UpdateResearchAccountInput,
    state: &AppState,
) -> Result<ResearchAccountDto, String> {
    let mut model: accounts::ActiveModel = accounts::Entity::find_by_id(input.id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found".to_string())?
        .into();

    if let Some(p) = input.provider {
        model.provider = Set(p);
    }
    if let Some(n) = input.display_name {
        model.display_name = Set(n);
    }
    if let Some(enabled) = input.enabled {
        model.enabled = Set(enabled);
    }
    if let Some(caps) = input.allowed_caps {
        model.allowed_caps_json = Set(serde_json::to_string(&caps).map_err(|e| e.to_string())?);
    }
    if let Some(perms) = input.permissions {
        model.permissions_json = Set(Some(serde_json::to_string(&perms).map_err(|e| e.to_string())?));
    }
    if let Some(auth) = input.auth {
        model.auth_encrypted = Set(Some(serde_json::to_vec(&auth).map_err(|e| e.to_string())?));
    }
    model.updated_at = Set(Utc::now().naive_utc());

    let saved = model.update(&state.db).await.map_err(|e| e.to_string())?;

    Ok(ResearchAccountDto {
        id: saved.id,
        provider: saved.provider,
        display_name: saved.display_name,
        enabled: saved.enabled,
        allowed_caps: parse_caps(&saved.allowed_caps_json),
        permissions: saved.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
        created_at: format_naive(saved.created_at),
        updated_at: format_naive(saved.updated_at),
    })
}

pub async fn delete_account(id: i64, state: &AppState) -> Result<(), String> {
    info!(account_id = id, "research_delete_account start");
    accounts::Entity::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    info!(account_id = id, "research_delete_account ok");
    Ok(())
}

pub async fn test_account(_id: i64, _state: &AppState) -> Result<(), String> {
    warn!(
        "research_test_account is disabled until connector validation is implemented"
    );
    Err("research_test_account is not available yet".into())
}

pub async fn list_streams(
    account_id: Option<i64>,
    state: &AppState,
) -> Result<Vec<ResearchStreamDto>, String> {
    let mut query = streams::Entity::find();
    if let Some(id) = account_id {
        query = query.filter(streams::Column::AccountId.eq(id));
    }
    let rows = query.all(&state.db).await.map_err(|e| e.to_string())?;
    let dtos = rows
        .into_iter()
        .map(|m| ResearchStreamDto {
            id: m.id,
            account_id: m.account_id,
            name: m.name,
            provider: m.provider,
            enabled: m.enabled,
            config: m.config_json.and_then(|c| serde_json::from_str(&c).ok()),
            schedule: m.schedule_json.and_then(|s| serde_json::from_str(&s).ok()),
            last_sync_at: m.last_sync_at.map(format_naive),
            last_error: m.last_error,
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

pub async fn upsert_stream(
    input: UpsertResearchStreamInput,
    state: &AppState,
) -> Result<ResearchStreamDto, String> {
    info!(
        stream_id = input.id,
        account_id = input.account_id,
        provider = %input.provider,
        name = %input.name,
        "research_upsert_stream start"
    );
    let now = Utc::now().naive_utc();
    let config_json = input
        .config
        .as_ref()
        .map(|c| serde_json::to_string(c).map_err(|e| e.to_string()))
        .transpose()?;
    let schedule_json = input
        .schedule
        .as_ref()
        .map(|s| serde_json::to_string(s).map_err(|e| e.to_string()))
        .transpose()?;

    let model = if let Some(id) = input.id {
        let mut model: streams::ActiveModel = streams::Entity::find_by_id(id)
            .one(&state.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Stream not found".to_string())?
            .into();
        model.account_id = Set(input.account_id);
        model.name = Set(input.name);
        model.provider = Set(input.provider);
        if let Some(enabled) = input.enabled {
            model.enabled = Set(enabled);
        }
        model.config_json = Set(config_json);
        model.schedule_json = Set(schedule_json);
        model.updated_at = Set(now);
        model
    } else {
        streams::ActiveModel {
            account_id: Set(input.account_id),
            name: Set(input.name),
            provider: Set(input.provider),
            enabled: Set(input.enabled.unwrap_or(true)),
            config_json: Set(config_json),
            schedule_json: Set(schedule_json),
            last_sync_at: Set(None),
            last_error: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            ..Default::default()
        }
    };

    let saved = if input.id.is_some() {
        model.update(&state.db).await
    } else {
        model.insert(&state.db).await
    }
    .map_err(|e| e.to_string())?;

    info!(
        stream_id = saved.id,
        account_id = saved.account_id,
        "research_upsert_stream ok"
    );
    Ok(ResearchStreamDto {
        id: saved.id,
        account_id: saved.account_id,
        name: saved.name,
        provider: saved.provider,
        enabled: saved.enabled,
        config: saved.config_json.and_then(|c| serde_json::from_str(&c).ok()),
        schedule: saved.schedule_json.and_then(|s| serde_json::from_str(&s).ok()),
        last_sync_at: saved.last_sync_at.map(format_naive),
        last_error: saved.last_error,
        created_at: format_naive(saved.created_at),
        updated_at: format_naive(saved.updated_at),
    })
}

pub async fn delete_stream(id: i64, state: &AppState) -> Result<(), String> {
    streams::Entity::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn sync_stream_now(stream_id: i64, state: &AppState) -> Result<(), String> {
    let stream = streams::Entity::find_by_id(stream_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Stream not found".to_string())?;
    let stream_id_val = stream.id;
    let account_id_val = stream.account_id;

    let account = accounts::Entity::find_by_id(stream.account_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found".to_string())?;

    if !account.enabled || !stream.enabled {
        return Err("Account or stream disabled".into());
    }
    let allowed_caps = parse_caps(&account.allowed_caps_json);
    if !allowed_caps.contains(&ResearchCapability::ReadStream) {
        return Err("ReadStream not allowed for this account".into());
    }

    let connector = get_connector(&stream.provider)
        .ok_or_else(|| format!("Connector not found for provider {}", stream.provider))?;

    info!(
        stream_id = stream_id_val,
        account_id = account_id_val,
        provider = %stream.provider,
        "research_sync_stream_now start"
    );

    if !connector
        .supported_capabilities()
        .contains(&ResearchCapability::ReadStream)
    {
        return Err("Connector does not support ReadStream".into());
    }

    let account_auth: serde_json::Value = account
        .auth_encrypted
        .as_ref()
        .and_then(|b| serde_json::from_slice(b).ok())
        .unwrap_or_else(|| json!({}));
    let stream_cfg: serde_json::Value = stream
        .config_json
        .as_ref()
        .and_then(|c| serde_json::from_str(c).ok())
        .unwrap_or_else(|| json!({}));

    let items = connector
        .sync_stream(&account_auth, &stream_cfg, &state.http_client)
        .await?;

    let count = items.len();
    for it in items {
        upsert_research_item(state, &account, &stream, it).await?;
    }

    let mut active: streams::ActiveModel = stream.into();
    active.last_sync_at = Set(Some(Utc::now().naive_utc()));
    active.last_error = Set(None);
    active.updated_at = Set(Utc::now().naive_utc());
    active.update(&state.db).await.map_err(|e| e.to_string())?;

    info!(
        stream_id = stream_id_val,
        account_id = account_id_val,
        items = count,
        "research_sync_stream_now ok"
    );
    Ok(())
}

pub async fn list_items(
    query: ListResearchItemsQuery,
    state: &AppState,
) -> Result<Vec<ResearchItemDto>, String> {
    use sea_orm::QueryOrder;
    let mut q = items::Entity::find();
    if let Some(provider) = query.provider {
        q = q.filter(items::Column::SourceType.eq(provider));
    }
    if let Some(account_id) = query.account_id {
        q = q.filter(items::Column::AccountId.eq(account_id));
    }
    if let Some(stream_id) = query.stream_id {
        q = q.filter(items::Column::StreamId.eq(stream_id));
    }
    if let Some(status) = query.status {
        q = q.filter(items::Column::Status.eq(status));
    }
    if let Some(search) = query.search {
        let like = format!("%{}%", search);
        q = q.filter(
            items::Column::Title
                .like(&like)
                .or(items::Column::Excerpt.like(&like)),
        );
    }
    if let Some(limit) = query.limit {
        q = q.limit(limit);
    }
    if let Some(offset) = query.offset {
        q = q.offset(offset);
    }
    let rows = q
        .order_by_desc(items::Column::PublishedAt)
        .order_by_desc(items::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let dtos = rows
        .into_iter()
        .map(|m| ResearchItemDto {
            id: m.id,
            account_id: m.account_id,
            stream_id: m.stream_id,
            source_type: m.source_type,
            external_id: m.external_id,
            url: m.url,
            title: m.title,
            excerpt: m.excerpt,
            author: m.author,
            published_at: m.published_at.map(format_naive),
            status: m.status,
            tags: m.tags_json.and_then(|t| serde_json::from_str(&t).ok()),
            payload: m.payload_json.and_then(|p| serde_json::from_str(&p).ok()),
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

pub async fn set_item_status(
    item_id: i64,
    status: String,
    state: &AppState,
) -> Result<(), String> {
    let mut model: items::ActiveModel = items::Entity::find_by_id(item_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?
        .into();
    model.status = Set(status);
    model.updated_at = Set(Utc::now().naive_utc());
    model.update(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn convert_to_reference(
    _item_id: i64,
    _idea_id: Option<i64>,
    _state: &AppState,
) -> Result<(), String> {
    Err("research_convert_to_reference is not available yet".into())
}

pub async fn publish(
    _account_id: i64,
    _payload: serde_json::Value,
    _state: &AppState,
) -> Result<serde_json::Value, String> {
    // Capabilities guard will be added when publish is implemented
    Err("research_publish is not available yet".into())
}

async fn upsert_research_item(
    state: &AppState,
    account: &accounts::Model,
    stream: &streams::Model,
    item: NormalizedItem,
) -> Result<(), String> {
    let existing = items::Entity::find()
        .filter(items::Column::SourceType.eq(item.source_type.clone()))
        .filter(items::Column::ExternalId.eq(item.external_id.clone()))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc();
    let payload_json = serde_json::to_string(&item.payload).map_err(|e| e.to_string())?;
    let tags_json = item
        .tags
        .as_ref()
        .map(|t| serde_json::to_string(t).map_err(|e| e.to_string()))
        .transpose()?;

    if let Some(existing) = existing {
        let mut model: items::ActiveModel = existing.into();
        model.url = Set(item.url);
        model.title = Set(item.title);
        model.excerpt = Set(item.excerpt);
        model.author = Set(item.author);
        model.published_at = Set(
            item.published_at
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.naive_utc()),
        );
        model.tags_json = Set(tags_json);
        model.payload_json = Set(Some(payload_json));
        model.updated_at = Set(now);
        model.update(&state.db).await.map_err(|e| e.to_string())?;
    } else {
        let model = items::ActiveModel {
            account_id: Set(Some(account.id)),
            stream_id: Set(Some(stream.id)),
            source_type: Set(item.source_type),
            external_id: Set(item.external_id),
            url: Set(item.url),
            title: Set(item.title),
            excerpt: Set(item.excerpt),
            author: Set(item.author),
            published_at: Set(
                item.published_at
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok())
                    .map(|d| d.naive_utc()),
            ),
            status: Set("new".to_string()),
            tags_json: Set(tags_json),
            payload_json: Set(Some(payload_json)),
            created_at: Set(now),
            updated_at: Set(now),
            ..Default::default()
        };
        model.insert(&state.db).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}
