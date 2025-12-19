//! Feed Source Management Handlers
//!
//! CRUD operations for feed sources (NewsData, Reddit, RSS, etc.)
//! Each feed source is linked to a system_task for scheduled syncing.

use crate::core::components::crypto;
use crate::core::components::errors::{AppError, AppResult};
use crate::research::components::feed::entities::feed_sources::{
    self, ActiveModel as ActiveFeedSource, Entity as FeedSourceEntity,
};
use crate::research::components::feed::entities::articles::{
    ActiveModel as ActiveNewsArticle, Entity as NewsArticleEntity, Column as NewsArticleColumn,
};
use crate::research::components::feed::plugin::FeedSource;
use crate::research::components::feed::plugins::NewsDataPlugin;
use crate::research::components::feed::types::{
    CreateFeedSourceInput, FeedSourceDto, SyncAllResult, SyncSourceResult, UpdateFeedSourceInput,
};
use crate::system::components::scheduler::entities::{
    ActiveModel as ActiveTask, Entity as TaskEntity,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder, Set,
};
use tracing::{info, instrument};

/// List all feed sources with metadata
#[instrument(skip(db))]
pub async fn list_feed_sources_handler(db: &DatabaseConnection) -> AppResult<Vec<FeedSourceDto>> {
    info!("Listing all feed sources");

    let sources = FeedSourceEntity::find()
        .order_by_desc(feed_sources::Column::CreatedAt)
        .all(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: "list feed sources".to_string(),
            source: e,
        })?;

    let dtos: Vec<FeedSourceDto> = sources
        .into_iter()
        .map(|source| {
            let config = source
                .config
                .as_ref()
                .and_then(|c| serde_json::from_str(c).ok());

            FeedSourceDto {
                id: source.id,
                name: source.name,
                source_type: source.source_type,
                enabled: source.enabled == 1,
                has_api_key: source.api_key_encrypted.is_some(),
                config,
                task_id: source.task_id,
                schedule: None, // TODO: fetch from system_tasks if task_id exists
                last_sync_at: source.last_sync_at.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
                last_error: source.last_error,
                article_count: source.article_count,
                error_count: source.error_count,
                api_calls_today: source.api_calls_today,
                api_quota_daily: source.api_quota_daily,
                created_at: source.created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
                updated_at: source.updated_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
            }
        })
        .collect();

    info!("Found {} feed sources", dtos.len());
    Ok(dtos)
}

/// Get a single feed source by ID
#[instrument(skip(db), fields(source_id = source_id))]
pub async fn get_feed_source_handler(
    db: &DatabaseConnection,
    source_id: i64,
) -> AppResult<FeedSourceDto> {
    info!("Fetching feed source");

    let source = FeedSourceEntity::find_by_id(source_id)
        .one(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("get feed source {}", source_id),
            source: e,
        })?
        .ok_or_else(|| AppError::Validation {
            field: "source_id".to_string(),
            reason: "Feed source not found".to_string(),
            invalid_value: Some(source_id.to_string()),
        })?;

    let config = source
        .config
        .as_ref()
        .and_then(|c| serde_json::from_str(c).ok());

    Ok(FeedSourceDto {
        id: source.id,
        name: source.name,
        source_type: source.source_type,
        enabled: source.enabled == 1,
        has_api_key: source.api_key_encrypted.is_some(),
        config,
        task_id: source.task_id,
        schedule: None,
        last_sync_at: source.last_sync_at.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
        last_error: source.last_error,
        article_count: source.article_count,
        error_count: source.error_count,
        api_calls_today: source.api_calls_today,
        api_quota_daily: source.api_quota_daily,
        created_at: source.created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
        updated_at: source.updated_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
    })
}

/// Create a new feed source with corresponding system task
#[instrument(skip(db, input), fields(name = %input.name, source_type = %input.source_type))]
pub async fn create_feed_source_handler(
    db: &DatabaseConnection,
    input: CreateFeedSourceInput,
) -> AppResult<FeedSourceDto> {
    info!("Creating new feed source");

    // Validate source type
    let valid_types = ["newsdata", "reddit", "rss", "twitter", "custom"];
    if !valid_types.contains(&input.source_type.as_str()) {
        return Err(AppError::Validation {
            field: "source_type".to_string(),
            reason: format!("must be one of: {}", valid_types.join(", ")),
            invalid_value: Some(input.source_type),
        });
    }

    // Encrypt API key if provided
    let api_key_encrypted = if let Some(api_key) = &input.api_key {
        Some(crypto::encrypt_api_key(api_key).map_err(|e| AppError::Crypto {
            operation: "encrypt API key".to_string(),
            reason: e.to_string(),
        })?)
    } else {
        None
    };

    // Serialize config
    let config_json = if let Some(cfg) = &input.config {
        Some(
            serde_json::to_string(cfg).map_err(|e| AppError::Other {
                message: format!("Failed to serialize config: {}", e),
                source: Some(Box::new(e)),
            })?,
        )
    } else {
        None
    };

    let schedule = input.schedule.unwrap_or_else(|| "0 0/45 * * * * *".to_string()); // Default: every 45 minutes

    // Step 1: Create feed source first (without task_id)
    let now = chrono::Utc::now().naive_utc();
    let source = ActiveFeedSource {
        name: Set(input.name.clone()),
        source_type: Set(input.source_type.clone()),
        enabled: Set(1),
        api_key_encrypted: Set(api_key_encrypted),
        config: Set(config_json),
        task_id: Set(None), // Will update after task creation
        last_sync_at: Set(None),
        last_error: Set(None),
        article_count: Set(0),
        error_count: Set(0),
        api_calls_today: Set(0),
        api_quota_daily: Set(Some(180)), // Default NewsData quota
        last_quota_reset: Set(Some(chrono::Utc::now().date_naive())),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let source_model = source.insert(db).await.map_err(|e| AppError::DatabaseQuery {
        operation: "create feed source".to_string(),
        source: e,
    })?;

    info!("Created feed source '{}' with ID {}", input.name, source_model.id);

    // Step 2: Create system task using source ID
    let task = ActiveTask {
        name: Set(format!("{} Sync", input.name)),
        task_type: Set(format!("feed_sync_{}", source_model.id)),
        component: Set("feed".to_string()),
        frequency_cron: Set(Some(schedule.clone())),
        enabled: Set(1),
        ..Default::default()
    };

    let task_model = task.insert(db).await.map_err(|e| AppError::DatabaseQuery {
        operation: "create system task".to_string(),
        source: e,
    })?;

    info!("Created system task '{}' with ID {} for feed source {}", task_model.name, task_model.id, source_model.id);

    // Step 3: Update feed source with task_id
    use sea_orm::prelude::Expr;
    FeedSourceEntity::update_many()
        .col_expr(feed_sources::Column::TaskId, Expr::value(Some(task_model.id)))
        .filter(feed_sources::Column::Id.eq(source_model.id))
        .exec(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: "link task to feed source".to_string(),
            source: e,
        })?;

    Ok(FeedSourceDto {
        id: source_model.id,
        name: source_model.name,
        source_type: source_model.source_type,
        enabled: true,
        has_api_key: source_model.api_key_encrypted.is_some(),
        config: input.config,
        task_id: Some(task_model.id),
        schedule: Some(schedule),
        last_sync_at: None,
        last_error: None,
        article_count: 0,
        error_count: 0,
        api_calls_today: 0,
        api_quota_daily: Some(180),
        created_at: source_model.created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
        updated_at: source_model.updated_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
    })
}

/// Update an existing feed source
#[instrument(skip(db, input), fields(source_id = source_id))]
pub async fn update_feed_source_handler(
    db: &DatabaseConnection,
    source_id: i64,
    input: UpdateFeedSourceInput,
) -> AppResult<FeedSourceDto> {
    info!("Updating feed source");

    // Fetch existing source
    let source = FeedSourceEntity::find_by_id(source_id)
        .one(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("get feed source {}", source_id),
            source: e,
        })?
        .ok_or_else(|| AppError::Validation {
            field: "source_id".to_string(),
            reason: "Feed source not found".to_string(),
            invalid_value: Some(source_id.to_string()),
        })?;

    let mut active: ActiveFeedSource = source.into_active_model();

    // Update fields if provided
    if let Some(name) = input.name {
        active.name = Set(name);
    }

    if let Some(enabled) = input.enabled {
        active.enabled = Set(if enabled { 1 } else { 0 });

        // Also update the linked task
        if let Some(task_id) = active.task_id.clone().unwrap() {
            let mut task_active = TaskEntity::find_by_id(task_id)
                .one(db)
                .await
                .map_err(|e| AppError::DatabaseQuery {
                    operation: format!("get task {}", task_id),
                    source: e,
                })?
                .ok_or_else(|| AppError::Other {
                    message: format!("Task {} not found", task_id),
                    source: None,
                })?
                .into_active_model();

            task_active.enabled = Set(if enabled { 1 } else { 0 });
            task_active.updated_at = Set(chrono::Utc::now());
            task_active.update(db).await.map_err(|e| AppError::DatabaseQuery {
                operation: "update task enabled status".to_string(),
                source: e,
            })?;
            info!("Updated task {} enabled status to {}", task_id, enabled);
        }
    }

    if let Some(api_key) = input.api_key {
        let encrypted = crypto::encrypt_api_key(&api_key).map_err(|e| AppError::Crypto {
            operation: "encrypt API key".to_string(),
            reason: e.to_string(),
        })?;
        active.api_key_encrypted = Set(Some(encrypted));
    }

    if let Some(config) = input.config {
        let config_json =
            serde_json::to_string(&config).map_err(|e| AppError::Other {
                message: format!("Failed to serialize config: {}", e),
                source: Some(Box::new(e)),
            })?;
        active.config = Set(Some(config_json));
    }

    if let Some(schedule) = input.schedule {
        // Update the linked task's schedule
        if let Some(task_id) = active.task_id.clone().unwrap() {
            let mut task_active = TaskEntity::find_by_id(task_id)
                .one(db)
                .await
                .map_err(|e| AppError::DatabaseQuery {
                    operation: format!("get task {}", task_id),
                    source: e,
                })?
                .ok_or_else(|| AppError::Other {
                    message: format!("Task {} not found", task_id),
                    source: None,
                })?
                .into_active_model();

            task_active.frequency_cron = Set(Some(schedule));
            task_active.updated_at = Set(chrono::Utc::now());
            task_active.update(db).await.map_err(|e| AppError::DatabaseQuery {
                operation: "update task schedule".to_string(),
                source: e,
            })?;
            info!("Updated task {} schedule", task_id);
        }
    }

    active.updated_at = Set(chrono::Utc::now().naive_utc());

    let updated = active.update(db).await.map_err(|e| AppError::DatabaseQuery {
        operation: "update feed source".to_string(),
        source: e,
    })?;

    info!("Updated feed source {}", source_id);

    get_feed_source_handler(db, updated.id).await
}

/// Delete a feed source and its associated task
#[instrument(skip(db), fields(source_id = source_id))]
pub async fn delete_feed_source_handler(
    db: &DatabaseConnection,
    source_id: i64,
) -> AppResult<()> {
    info!("Deleting feed source");

    // Fetch source to get task_id
    let source = FeedSourceEntity::find_by_id(source_id)
        .one(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("get feed source {}", source_id),
            source: e,
        })?
        .ok_or_else(|| AppError::Validation {
            field: "source_id".to_string(),
            reason: "Feed source not found".to_string(),
            invalid_value: Some(source_id.to_string()),
        })?;

    // Delete the associated task if exists
    if let Some(task_id) = source.task_id {
        TaskEntity::delete_by_id(task_id)
            .exec(db)
            .await
            .map_err(|e| AppError::DatabaseQuery {
                operation: format!("delete task {}", task_id),
                source: e,
            })?;
        info!("Deleted associated task {}", task_id);
    }

    // Delete the feed source
    FeedSourceEntity::delete_by_id(source_id)
        .exec(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("delete feed source {}", source_id),
            source: e,
        })?;

    info!("Deleted feed source {}", source_id);
    Ok(())
}

/// Toggle feed source enabled status
#[instrument(skip(db), fields(source_id = source_id, enabled = enabled))]
pub async fn toggle_feed_source_handler(
    db: &DatabaseConnection,
    source_id: i64,
    enabled: bool,
) -> AppResult<FeedSourceDto> {
    info!("Toggling feed source enabled status");

    update_feed_source_handler(
        db,
        source_id,
        UpdateFeedSourceInput {
            name: None,
            enabled: Some(enabled),
            api_key: None,
            config: None,
            schedule: None,
        },
    )
    .await
}

/// Test feed source connection
#[instrument(skip(db, http_client), fields(source_id = source_id))]
pub async fn test_feed_source_connection_handler(
    db: &DatabaseConnection,
    http_client: &reqwest::Client,
    source_id: i64,
) -> AppResult<serde_json::Value> {
    info!("Testing feed source connection");

    let source = FeedSourceEntity::find_by_id(source_id)
        .one(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("get feed source {}", source_id),
            source: e,
        })?
        .ok_or_else(|| AppError::Validation {
            field: "source_id".to_string(),
            reason: "Feed source not found".to_string(),
            invalid_value: Some(source_id.to_string()),
        })?;

    // Get API key
    let api_key = if let Some(encrypted) = &source.api_key_encrypted {
        crypto::decrypt_api_key(encrypted).map_err(|e| AppError::Crypto {
            operation: "decrypt API key".to_string(),
            reason: e.to_string(),
        })?
    } else {
        return Err(AppError::Validation {
            field: "api_key".to_string(),
            reason: "No API key configured for this source".to_string(),
            invalid_value: None,
        });
    };

    // Instantiate appropriate plugin and test
    match source.source_type.as_str() {
        "newsdata" => {
            let plugin = NewsDataPlugin::new(api_key, http_client.clone());
            let result = plugin.test_connection().await?;
            Ok(serde_json::to_value(result).unwrap())
        }
        _ => Err(AppError::Validation {
            field: "source_type".to_string(),
            reason: format!("Plugin not implemented for type: {}", source.source_type),
            invalid_value: Some(source.source_type),
        }),
    }
}

/// Sync a single feed source now (manual trigger)
#[instrument(skip(db, http_client), fields(source_id = source_id))]
pub async fn sync_feed_source_now_handler(
    db: &DatabaseConnection,
    http_client: &reqwest::Client,
    source_id: i64,
) -> AppResult<SyncSourceResult> {
    info!("Manual sync triggered for feed source");

    let source = FeedSourceEntity::find_by_id(source_id)
        .one(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: format!("get feed source {}", source_id),
            source: e,
        })?
        .ok_or_else(|| AppError::Validation {
            field: "source_id".to_string(),
            reason: "Feed source not found".to_string(),
            invalid_value: Some(source_id.to_string()),
        })?;

    if source.enabled == 0 {
        return Ok(SyncSourceResult {
            source_id: source.id,
            source_name: source.name,
            success: false,
            articles_added: 0,
            error: Some("Source is disabled".to_string()),
        });
    }

    // Get API key
    let api_key = if let Some(encrypted) = &source.api_key_encrypted {
        crypto::decrypt_api_key(encrypted).map_err(|e| AppError::Crypto {
            operation: "decrypt API key".to_string(),
            reason: e.to_string(),
        })?
    } else {
        return Ok(SyncSourceResult {
            source_id: source.id,
            source_name: source.name.clone(),
            success: false,
            articles_added: 0,
            error: Some("No API key configured".to_string()),
        });
    };

    // Parse config
    let config = if let Some(cfg_str) = &source.config {
        serde_json::from_str(cfg_str).ok()
    } else {
        None
    };

    info!("Syncing feed source: {} (type: {})", source.name, source.source_type);

    // Instantiate plugin and fetch articles
    let last_sync = source.last_sync_at.map(|naive| chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(naive, chrono::Utc));
    let articles = match source.source_type.as_str() {
        "newsdata" => {
            let plugin = NewsDataPlugin::new(api_key, http_client.clone());
            plugin.fetch_articles(config, last_sync).await?
        }
        _ => {
            return Ok(SyncSourceResult {
                source_id: source.id,
                source_name: source.name,
                success: false,
                articles_added: 0,
                error: Some(format!("Plugin not implemented for type: {}", source.source_type)),
            });
        }
    };

    info!("Fetched {} articles from {}", articles.articles.len(), source.name);

    // Store articles in database
    let mut added_count = 0;
    for article in articles.articles {
        // Use provider_article_id for uniqueness check
        let provider_id = article.provider_article_id.clone().unwrap_or_else(|| format!("{}_{}", article.url.clone().unwrap_or_default(), article.title));
        
        let existing = NewsArticleEntity::find()
            .filter(NewsArticleColumn::ProviderArticleId.eq(Some(provider_id.clone())))
            .filter(NewsArticleColumn::Provider.eq(&source.source_type))
            .one(db)
            .await
            .map_err(|e| AppError::DatabaseQuery {
                operation: "check existing article".to_string(),
                source: e,
            })?;

        if existing.is_none() {
            let now = chrono::Utc::now();
            let tags_json = if !article.tags.is_empty() {
                Some(serde_json::to_string(&article.tags).unwrap_or_default())
            } else {
                None
            };
            
            let new_article = ActiveNewsArticle {
                user_id: Set(1), // TODO: Get from context
                provider: Set(source.source_type.clone()),
                provider_article_id: Set(Some(provider_id)),
                title: Set(article.title),
                excerpt: Set(article.excerpt),
                content: Set(article.content),
                url: Set(article.url),
                image_url: Set(article.image_url),
                source_name: Set(article.source_name),
                source_domain: Set(article.source_domain),
                source_id: Set(article.source_id),
                tags: Set(tags_json),
                category: Set(article.category),
                language: Set(article.language),
                country: Set(article.country),
                published_at: Set(article.published_at),
                fetched_at: Set(now),
                added_via: Set("feed_source".to_string()),
                is_starred: Set(0),
                is_dismissed: Set(0),
                is_read: Set(0),
                is_pinned: Set(0),
                added_to_ideas_at: Set(None),
                dismissed_at: Set(None),
                created_at: Set(now),
                updated_at: Set(now),
                ..Default::default()
            };

            new_article.insert(db).await.map_err(|e| AppError::DatabaseQuery {
                operation: "insert article".to_string(),
                source: e,
            })?;

            added_count += 1;
        }
    }

    // Update feed source stats
    use sea_orm::prelude::Expr;
    FeedSourceEntity::update_many()
        .col_expr(feed_sources::Column::ArticleCount, Expr::value(source.article_count + added_count))
        .col_expr(feed_sources::Column::LastSyncAt, Expr::value(chrono::Utc::now()))
        .col_expr(feed_sources::Column::ErrorCount, Expr::value(0))
        .col_expr(feed_sources::Column::LastError, Expr::value(Option::<String>::None))
        .filter(feed_sources::Column::Id.eq(source.id))
        .exec(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: "update feed source stats".to_string(),
            source: e,
        })?;

    info!("Sync complete: added {} new articles from {}", added_count, source.name);

    Ok(SyncSourceResult {
        source_id: source.id,
        source_name: source.name,
        success: true,
        articles_added: added_count,
        error: None,
    })
}

/// Sync all enabled feed sources
#[instrument(skip(db, http_client))]
pub async fn sync_all_feed_sources_handler(
    db: &DatabaseConnection,
    http_client: &reqwest::Client,
) -> AppResult<SyncAllResult> {
    info!("Syncing all enabled feed sources");

    let sources = FeedSourceEntity::find()
        .filter(feed_sources::Column::Enabled.eq(1))
        .all(db)
        .await
        .map_err(|e| AppError::DatabaseQuery {
            operation: "list enabled feed sources".to_string(),
            source: e,
        })?;

    let total_sources = sources.len() as i32;
    let mut successful = 0;
    let mut failed = 0;
    let mut total_articles = 0;
    let mut results = Vec::new();

    for source in sources {
        let result = sync_feed_source_now_handler(db, http_client, source.id).await?;
        if result.success {
            successful += 1;
            total_articles += result.articles_added;
        } else {
            failed += 1;
        }
        results.push(result);
    }

    info!(
        "Sync all complete: {}/{} successful, {} articles",
        successful, total_sources, total_articles
    );

    Ok(SyncAllResult {
        total_sources,
        successful,
        failed,
        total_articles,
        results,
    })
}

// ============================================================================
// Scheduler Task Handlers
// ============================================================================

use crate::system::components::scheduler::types::TaskRunResult;

/// Scheduled task: Sync a specific feed source
/// 
/// Called by scheduler for individual feed source sync tasks.
/// Task type format: `feed_sync_{source_id}`
#[instrument(skip(state))]
pub async fn run_feed_source_sync_task(
    state: &crate::AppState,
    source_id: i64,
) -> TaskRunResult {
    use crate::system::components::scheduler::types::TaskRunResult;
    
    info!("Running scheduled sync for feed source {}", source_id);
    
    match sync_feed_source_now_handler(&state.db, &state.http_client, source_id).await {
        Ok(result) => {
            let result_json = serde_json::json!({
                "source_id": result.source_id,
                "source_name": result.source_name,
                "success": result.success,
                "articles_added": result.articles_added,
                "error": result.error,
            });
            
            let status = if result.success { "success" } else { "error" };
            
            TaskRunResult {
                status,
                result_json: Some(result_json.to_string()),
                error_message: result.error.clone(),
            }
        }
        Err(e) => {
            TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(e.to_string()),
            }
        }
    }
}

/// Scheduled task: Sync all enabled feed sources
/// 
/// Called by scheduler for batch sync of all sources.
/// Task type: `feed_sources_sync_all`
#[instrument(skip(state))]
pub async fn run_feed_sources_sync_all_task(state: &crate::AppState) -> TaskRunResult {
    info!("Running scheduled sync for all feed sources");
    
    match sync_all_feed_sources_handler(&state.db, &state.http_client).await {
        Ok(result) => {
            let result_json = serde_json::json!({
                "total_sources": result.total_sources,
                "successful": result.successful,
                "failed": result.failed,
                "total_articles": result.total_articles,
            });
            
            TaskRunResult {
                status: if result.failed == 0 { "success" } else { "partial" },
                result_json: Some(result_json.to_string()),
                error_message: None,
            }
        }
        Err(e) => {
            TaskRunResult {
                status: "error",
                result_json: None,
                error_message: Some(e.to_string()),
            }
        }
    }
}
