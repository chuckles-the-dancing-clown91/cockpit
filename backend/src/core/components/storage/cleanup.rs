//! Storage cleanup operations
//!
//! Handles cleanup of old logs and dismissed news articles
//! based on configurable retention policies.

use std::fs;
use chrono::{Duration, Utc};
use tracing::{info, warn, instrument};
use sea_orm::{ConnectionTrait, Statement};

use crate::core::components::config::StorageConfig;
use crate::core::components::errors::AppError;

/// Summary of cleanup operation
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupSummary {
    pub files_deleted: usize,
    pub space_freed_bytes: u64,
    pub retention_days: i64,
}

/// Clean up old log files based on retention period
#[instrument(skip(config))]
pub fn cleanup_old_logs(config: &StorageConfig, retention_days: Option<i64>) -> Result<CleanupSummary, AppError> {
    let retention = retention_days.unwrap_or(30);
    info!(retention_days = retention, "Starting log cleanup");
    
    if !config.logs_dir.exists() {
        return Ok(CleanupSummary {
            files_deleted: 0,
            space_freed_bytes: 0,
            retention_days: retention,
        });
    }
    
    let cutoff = Utc::now() - Duration::days(retention);
    let mut files_deleted = 0;
    let mut space_freed = 0u64;
    
    let entries = fs::read_dir(&config.logs_dir)
        .map_err(|e| AppError::file_operation("read logs directory", config.logs_dir.to_string_lossy(), e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        // Skip directories
        if path.is_dir() {
            continue;
        }
        
        // Check file age
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                let modified_time = chrono::DateTime::<Utc>::from(modified);
                if modified_time < cutoff {
                    // Record size before deleting
                    space_freed += metadata.len();
                    
                    match fs::remove_file(&path) {
                        Ok(_) => {
                            info!("Removed old log file: {}", path.display());
                            files_deleted += 1;
                        }
                        Err(e) => {
                            warn!(error = %e, path = %path.display(), "Failed to remove log file");
                        }
                    }
                }
            }
        }
    }
    
    info!(
        files_deleted = files_deleted,
        space_freed_mb = space_freed / (1024 * 1024),
        "Log cleanup completed"
    );
    
    Ok(CleanupSummary {
        files_deleted,
        space_freed_bytes: space_freed,
        retention_days: retention,
    })
}

/// Clean up old dismissed news articles from database
#[instrument(skip(db))]
pub async fn cleanup_old_news(
    db: &sea_orm::DatabaseConnection,
    retention_days: Option<i64>,
) -> Result<CleanupSummary, AppError> {
    let retention = retention_days.unwrap_or(90); // Default 90 days for dismissed articles
    info!(retention_days = retention, "Starting dismissed news cleanup");
    
    let cutoff_date = Utc::now() - Duration::days(retention);
    let cutoff_str = cutoff_date.to_rfc3339();
    
    // First, count how many will be deleted
    let count_sql = format!(
        "SELECT COUNT(*) as count FROM news_articles WHERE is_dismissed = 1 AND dismissed_at < '{}'",
        cutoff_str
    );
    
    let count_result = db.query_one(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        count_sql
    ))
    .await
    .map_err(|e| AppError::database(format!("Failed to count old dismissed articles: {}", e)))?;
    
    let files_deleted = if let Some(row) = count_result {
        row.try_get::<i64>("", "count").unwrap_or(0) as usize
    } else {
        0
    };
    
    if files_deleted == 0 {
        info!("No old dismissed articles to clean up");
        return Ok(CleanupSummary {
            files_deleted: 0,
            space_freed_bytes: 0,
            retention_days: retention,
        });
    }
    
    // Delete old dismissed articles
    let delete_sql = format!(
        "DELETE FROM news_articles WHERE is_dismissed = 1 AND dismissed_at < '{}'",
        cutoff_str
    );
    
    db.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        delete_sql
    ))
    .await
    .map_err(|e| AppError::database(format!("Failed to delete old dismissed articles: {}", e)))?;
    
    // Run VACUUM to reclaim space
    db.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "VACUUM".to_string()
    ))
    .await
    .map_err(|e| AppError::database(format!("Failed to vacuum after cleanup: {}", e)))?;
    
    info!(
        articles_deleted = files_deleted,
        "Dismissed news cleanup completed"
    );
    
    Ok(CleanupSummary {
        files_deleted,
        space_freed_bytes: 0, // Hard to calculate without before/after db size
        retention_days: retention,
    })
}
