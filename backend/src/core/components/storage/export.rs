//! Data export and import module
//! 
//! Handles exporting all application data to JSON and importing it back.
//! Supports ideas, news articles, and app settings.

use std::fs;
use std::path::Path;
use chrono::Utc;
use serde_json::Value as JsonValue;
use tracing::{info, warn, error, instrument};

use crate::core::components::config::StorageConfig;
use crate::core::components::errors::AppError;

/// Export data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub ideas: Vec<JsonValue>,
    pub news_articles: Vec<JsonValue>,
    pub app_settings: Vec<JsonValue>,
}

/// Export information
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInfo {
    pub file_path: String,
    pub file_size: u64,
    pub timestamp: String,
    pub record_counts: ExportCounts,
}

/// Record counts in export
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportCounts {
    pub ideas: usize,
    pub news_articles: usize,
    pub app_settings: usize,
}

/// Import summary
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub records_added: usize,
    pub records_skipped: usize,
    pub errors: Vec<String>,
}

/// Export all data to JSON file
#[instrument(skip(db))]
pub async fn export_data(
    db: &sea_orm::DatabaseConnection,
    storage_config: &StorageConfig,
) -> Result<ExportInfo, AppError> {
    use sea_orm::{ConnectionTrait, Statement};
    
    info!("Starting data export");
    
    // Create exports directory if it doesn't exist
    let export_dir = &storage_config.export_dir;
    fs::create_dir_all(export_dir)
        .map_err(|e| AppError::file_operation("create directory", export_dir.to_string_lossy(), e))?;
    
    // Export ideas
    let ideas_sql = "SELECT * FROM ideas WHERE date_removed IS NULL";
    let ideas_result = db.query_all(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        ideas_sql.to_string(),
    )).await
        .map_err(|e| {
            error!(error = %e, "Failed to export ideas");
            AppError::database(format!("Failed to export ideas: {}", e))
        })?;
    
    let ideas_json: Vec<JsonValue> = ideas_result.iter()
        .map(|row| {
            serde_json::json!({
                "id": row.try_get::<i32>("", "id").ok(),
                "title": row.try_get::<String>("", "title").ok(),
                "status": row.try_get::<String>("", "status").ok(),
                "priority": row.try_get::<i32>("", "priority").ok(),
                "is_pinned": row.try_get::<bool>("", "is_pinned").ok(),
                "notes_markdown": row.try_get::<String>("", "notes_markdown").ok(),
                "article_title": row.try_get::<String>("", "article_title").ok(),
                "article_markdown": row.try_get::<String>("", "article_markdown").ok(),
                "source_url": row.try_get::<String>("", "source_url").ok(),
                "news_article_id": row.try_get::<i32>("", "news_article_id").ok(),
                "date_created": row.try_get::<String>("", "date_created").ok(),
                "date_updated": row.try_get::<String>("", "date_updated").ok(),
            })
        })
        .collect();
    
    // Export news articles (only non-dismissed)
    let news_sql = "SELECT * FROM news_articles WHERE is_dismissed = 0";
    let news_result = db.query_all(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        news_sql.to_string(),
    )).await
        .map_err(|e| {
            error!(error = %e, "Failed to export news articles");
            AppError::database(format!("Failed to export news articles: {}", e))
        })?;
    
    let news_json: Vec<JsonValue> = news_result.iter()
        .map(|row| {
            serde_json::json!({
                "article_id": row.try_get::<String>("", "article_id").ok(),
                "title": row.try_get::<String>("", "title").ok(),
                "description": row.try_get::<String>("", "description").ok(),
                "content": row.try_get::<String>("", "content").ok(),
                "url": row.try_get::<String>("", "url").ok(),
                "source_id": row.try_get::<String>("", "source_id").ok(),
                "source_name": row.try_get::<String>("", "source_name").ok(),
                "published_at": row.try_get::<String>("", "published_at").ok(),
                "fetched_at": row.try_get::<String>("", "fetched_at").ok(),
                "is_read": row.try_get::<bool>("", "is_read").ok(),
                "is_starred": row.try_get::<bool>("", "is_starred").ok(),
            })
        })
        .collect();
    
    // Export app settings
    let settings_sql = "SELECT * FROM app_settings";
    let settings_result = db.query_all(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        settings_sql.to_string(),
    )).await
        .map_err(|e| {
            error!(error = %e, "Failed to export settings");
            AppError::database(format!("Failed to export settings: {}", e))
        })?;
    
    let settings_json: Vec<JsonValue> = settings_result.iter()
        .map(|row| {
            serde_json::json!({
                "key": row.try_get::<String>("", "key").ok(),
                "value": row.try_get::<String>("", "value").ok(),
                "value_type": row.try_get::<String>("", "value_type").ok(),
                "category": row.try_get::<String>("", "category").ok(),
                "description": row.try_get::<String>("", "description").ok(),
            })
        })
        .collect();
    
    // Create export data structure
    let export_data = ExportData {
        version: "1.0".to_string(),
        exported_at: Utc::now().to_rfc3339(),
        ideas: ideas_json.clone(),
        news_articles: news_json.clone(),
        app_settings: settings_json.clone(),
    };
    
    // Generate export filename with timestamp
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let export_filename = format!("export_{}.json", timestamp);
    let export_path = export_dir.join(&export_filename);
    
    // Write to file
    let json_string = serde_json::to_string_pretty(&export_data)
        .map_err(|e| AppError::other(format!("Failed to serialize export data: {}", e)))?;
    
    fs::write(&export_path, json_string)
        .map_err(|e| AppError::file_operation("write", export_path.to_string_lossy(), e))?;
    
    // Get file size
    let metadata = fs::metadata(&export_path)
        .map_err(|e| AppError::file_operation("read metadata", export_path.to_string_lossy(), e))?;
    
    let export_info = ExportInfo {
        file_path: export_path.to_string_lossy().to_string(),
        file_size: metadata.len(),
        timestamp: Utc::now().to_rfc3339(),
        record_counts: ExportCounts {
            ideas: ideas_json.len(),
            news_articles: news_json.len(),
            app_settings: settings_json.len(),
        },
    };
    
    info!(
        file_path = %export_info.file_path,
        size_bytes = export_info.file_size,
        ideas = export_info.record_counts.ideas,
        news_articles = export_info.record_counts.news_articles,
        settings = export_info.record_counts.app_settings,
        "Data export completed successfully"
    );
    
    Ok(export_info)
}

/// Import data from JSON file
#[instrument(skip(db))]
pub async fn import_data(
    db: &sea_orm::DatabaseConnection,
    import_path: &str,
) -> Result<ImportSummary, AppError> {
    use sea_orm::{ConnectionTrait, Statement, TransactionTrait};
    
    info!(import_path = %import_path, "Starting data import");
    
    let import_file = Path::new(import_path);
    
    // Validate import file exists
    if !import_file.exists() {
        error!(import_path = %import_path, "Import file not found");
        return Err(AppError::validation("import_path", "Import file not found"));
    }
    
    // Read and parse JSON file
    let json_string = fs::read_to_string(import_file)
        .map_err(|e| AppError::file_operation("read", import_path, e))?;
    
    let export_data: ExportData = serde_json::from_str(&json_string)
        .map_err(|e| AppError::validation("import_file", format!("Invalid JSON format: {}", e)))?;
    
    info!(
        version = %export_data.version,
        exported_at = %export_data.exported_at,
        ideas_count = export_data.ideas.len(),
        news_count = export_data.news_articles.len(),
        settings_count = export_data.app_settings.len(),
        "Import file parsed successfully"
    );
    
    let mut summary = ImportSummary {
        records_added: 0,
        records_skipped: 0,
        errors: Vec::new(),
    };
    
    // Use transaction for atomic import
    let txn = db.begin().await
        .map_err(|e| AppError::database(format!("Failed to start transaction: {}", e)))?;
    
    // Helper function to escape SQL strings
    let escape_sql = |s: &str| s.replace("'", "''");
    
    // Import ideas (skip if ID exists)
    info!("Importing ideas...");
    for idea in export_data.ideas {
        if let Some(id) = idea.get("id").and_then(|v| v.as_i64()) {
            // Check if idea already exists
            let check_sql = format!("SELECT COUNT(*) as count FROM ideas WHERE id = {}", id);
            let result = txn.query_one(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                check_sql,
            )).await;
            
            if let Ok(Some(row)) = result {
                if let Ok(count) = row.try_get::<i32>("", "count") {
                    if count > 0 {
                        summary.records_skipped += 1;
                        continue;
                    }
                }
            }
            
            // Build insert statement with proper escaping
            let title = idea.get("title").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let status = idea.get("status").and_then(|v| v.as_str()).map(|s| format!("'{}'", s)).unwrap_or("'in_progress'".to_string());
            let priority = idea.get("priority").and_then(|v| v.as_i64()).unwrap_or(0);
            let is_pinned = idea.get("is_pinned").and_then(|v| v.as_bool()).map(|b| if b { 1 } else { 0 }).unwrap_or(0);
            let notes = idea.get("notes_markdown").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let article_title = idea.get("article_title").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let article_md = idea.get("article_markdown").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let source_url = idea.get("source_url").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let news_id = idea.get("news_article_id").and_then(|v| v.as_i64()).map(|n| n.to_string()).unwrap_or("NULL".to_string());
            let created = idea.get("date_created").and_then(|v| v.as_str()).map(|s| format!("'{}'", s)).unwrap_or_else(|| format!("'{}'", Utc::now().to_rfc3339()));
            let updated = idea.get("date_updated").and_then(|v| v.as_str()).map(|s| format!("'{}'", s)).unwrap_or_else(|| format!("'{}'", Utc::now().to_rfc3339()));
            
            let insert_sql = format!(
                "INSERT INTO ideas (id, title, status, priority, is_pinned, notes_markdown, article_title, article_markdown, source_url, news_article_id, date_created, date_updated) VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})",
                id, title, status, priority, is_pinned, notes, article_title, article_md, source_url, news_id, created, updated
            );
            
            match txn.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, insert_sql)).await {
                Ok(_) => summary.records_added += 1,
                Err(e) => {
                    warn!(error = %e, id = id, "Failed to import idea");
                    summary.errors.push(format!("Idea {}: {}", id, e));
                }
            }
        }
    }
    
    // Import news articles (skip if article_id exists)
    info!("Importing news articles...");
    for article in export_data.news_articles {
        if let Some(article_id) = article.get("article_id").and_then(|v| v.as_str()) {
            // Check if article already exists
            let check_sql = format!("SELECT COUNT(*) as count FROM news_articles WHERE article_id = '{}'", escape_sql(article_id));
            let result = txn.query_one(Statement::from_string(
                sea_orm::DatabaseBackend::Sqlite,
                check_sql,
            )).await;
            
            if let Ok(Some(row)) = result {
                if let Ok(count) = row.try_get::<i32>("", "count") {
                    if count > 0 {
                        summary.records_skipped += 1;
                        continue;
                    }
                }
            }
            
            // Build insert statement
            let title = article.get("title").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let description = article.get("description").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let content = article.get("content").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let url = article.get("url").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let source_id = article.get("source_id").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let source_name = article.get("source_name").and_then(|v| v.as_str()).map(|s| format!("'{}'", escape_sql(s))).unwrap_or("NULL".to_string());
            let published = article.get("published_at").and_then(|v| v.as_str()).map(|s| format!("'{}'", s)).unwrap_or("NULL".to_string());
            let fetched = article.get("fetched_at").and_then(|v| v.as_str()).map(|s| format!("'{}'", s)).unwrap_or_else(|| format!("'{}'", Utc::now().to_rfc3339()));
            let is_read = article.get("is_read").and_then(|v| v.as_bool()).map(|b| if b { 1 } else { 0 }).unwrap_or(0);
            let is_starred = article.get("is_starred").and_then(|v| v.as_bool()).map(|b| if b { 1 } else { 0 }).unwrap_or(0);
            
            let insert_sql = format!(
                "INSERT INTO news_articles (article_id, title, description, content, url, source_id, source_name, published_at, fetched_at, is_read, is_starred, is_dismissed, dismissed_at) VALUES ('{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, 0, NULL)",
                escape_sql(article_id), title, description, content, url, source_id, source_name, published, fetched, is_read, is_starred
            );
            
            match txn.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, insert_sql)).await {
                Ok(_) => summary.records_added += 1,
                Err(e) => {
                    warn!(error = %e, article_id = article_id, "Failed to import news article");
                    summary.errors.push(format!("Article {}: {}", article_id, e));
                }
            }
        }
    }
    
    // Import app settings (update existing, insert new)
    info!("Importing app settings...");
    for setting in export_data.app_settings {
        if let Some(key) = setting.get("key").and_then(|v| v.as_str()) {
            let value = setting.get("value").and_then(|v| v.as_str()).map(|s| escape_sql(s)).unwrap_or_default();
            let value_type = setting.get("value_type").and_then(|v| v.as_str()).map(|s| escape_sql(s)).unwrap_or_else(|| "string".to_string());
            let category = setting.get("category").and_then(|v| v.as_str()).map(|s| escape_sql(s)).unwrap_or_default();
            let description = setting.get("description").and_then(|v| v.as_str()).map(|s| escape_sql(s)).unwrap_or_default();
            
            // Use INSERT OR REPLACE for settings (upsert)
            let upsert_sql = format!(
                "INSERT OR REPLACE INTO app_settings (key, value, value_type, category, description) VALUES ('{}', '{}', '{}', '{}', '{}')",
                escape_sql(key), value, value_type, category, description
            );
            
            match txn.execute(Statement::from_string(sea_orm::DatabaseBackend::Sqlite, upsert_sql)).await {
                Ok(_) => summary.records_added += 1,
                Err(e) => {
                    warn!(error = %e, key = key, "Failed to import setting");
                    summary.errors.push(format!("Setting {}: {}", key, e));
                }
            }
        }
    }
    
    // Commit transaction
    txn.commit().await
        .map_err(|e| {
            error!(error = %e, "Failed to commit import transaction");
            AppError::database(format!("Failed to commit transaction: {}", e))
        })?;
    
    info!(
        added = summary.records_added,
        skipped = summary.records_skipped,
        errors = summary.errors.len(),
        "Data import completed"
    );
    
    Ok(summary)
}
