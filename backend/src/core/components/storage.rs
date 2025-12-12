//! Storage management for Architect Cockpit
//!
//! Provides centralized storage operations:
//! - Path management using configuration
//! - Size calculation and monitoring
//! - Cleanup policies for logs, cache, old data
//! - Storage limit enforcement

use std::fs;
use std::path::{Path, PathBuf};
use chrono::{Duration, Utc};
use tracing::{info, warn, error, instrument};

use super::config::StorageConfig;
use super::errors::AppError;

/// Storage statistics
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub total_bytes: u64,
    pub data_bytes: u64,
    pub logs_bytes: u64,
    pub cache_bytes: u64,
    pub backup_bytes: u64,
    pub export_bytes: u64,
}

impl StorageStats {
    /// Convert to GB for display
    pub fn total_gb(&self) -> f64 {
        self.total_bytes as f64 / 1_073_741_824.0
    }
    
    pub fn data_gb(&self) -> f64 {
        self.data_bytes as f64 / 1_073_741_824.0
    }
    
    pub fn logs_gb(&self) -> f64 {
        self.logs_bytes as f64 / 1_073_741_824.0
    }
}

/// Cleanup policies and thresholds
pub struct CleanupPolicy {
    /// Remove log files older than this many days
    pub log_retention_days: i64,
    /// Remove cache files older than this many days
    pub cache_retention_days: i64,
    /// Remove backup files older than this many days
    pub backup_retention_days: i64,
    /// Remove export files older than this many days
    pub export_retention_days: i64,
    /// Maximum number of rotated log files to keep (per log type)
    pub max_rotated_logs: usize,
}

impl Default for CleanupPolicy {
    fn default() -> Self {
        Self {
            log_retention_days: 30,
            cache_retention_days: 7,
            backup_retention_days: 90,
            export_retention_days: 30,
            max_rotated_logs: 10,
        }
    }
}

impl CleanupPolicy {
    /// Load cleanup policy from environment variables with defaults
    pub fn from_env() -> Self {
        let log_retention_days = std::env::var("STORAGE_LOG_RETENTION_DAYS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(30);
        
        let cache_retention_days = std::env::var("STORAGE_CACHE_RETENTION_DAYS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(7);
        
        let backup_retention_days = std::env::var("STORAGE_BACKUP_RETENTION_DAYS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(90);
        
        let export_retention_days = std::env::var("STORAGE_EXPORT_RETENTION_DAYS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(30);
        
        let max_rotated_logs = std::env::var("LOG_MAX_FILES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);
        
        Self {
            log_retention_days,
            cache_retention_days,
            backup_retention_days,
            export_retention_days,
            max_rotated_logs,
        }
    }
}

/// Calculate size of a directory recursively
pub fn calculate_dir_size(path: &Path) -> Result<u64, AppError> {
    let mut total = 0u64;
    
    if !path.exists() {
        return Ok(0);
    }
    
    if path.is_file() {
        return Ok(fs::metadata(path)?.len());
    }
    
    let entries = fs::read_dir(path)?;
    for entry in entries.flatten() {
        let metadata = entry.metadata()?;
        if metadata.is_file() {
            total += metadata.len();
        } else if metadata.is_dir() {
            total += calculate_dir_size(&entry.path())?;
        }
    }
    
    Ok(total)
}

/// Get comprehensive storage statistics
pub fn get_storage_stats(config: &StorageConfig) -> Result<StorageStats, AppError> {
    let data_bytes = calculate_dir_size(&config.data_dir)?;
    let logs_bytes = calculate_dir_size(&config.logs_dir)?;
    let cache_bytes = calculate_dir_size(&config.cache_dir)?;
    let backup_bytes = calculate_dir_size(&config.backup_dir)?;
    let export_bytes = calculate_dir_size(&config.export_dir)?;
    
    let total_bytes = data_bytes + logs_bytes + cache_bytes + backup_bytes + export_bytes;
    
    Ok(StorageStats {
        total_bytes,
        data_bytes,
        logs_bytes,
        cache_bytes,
        backup_bytes,
        export_bytes,
    })
}

/// Check if storage exceeds configured limits
pub fn check_storage_limits(config: &StorageConfig) -> Result<bool, AppError> {
    if let Some(max_gb) = config.max_total_size_gb {
        let stats = get_storage_stats(config)?;
        let max_bytes = max_gb * 1_073_741_824; // GB to bytes
        
        if stats.total_bytes > max_bytes {
            warn!(
                "Storage limit exceeded: {:.2} GB / {} GB",
                stats.total_gb(),
                max_gb
            );
            return Ok(true);
        }
    }
    Ok(false)
}

/// Remove files older than specified days
fn cleanup_old_files(dir: &Path, max_age_days: i64, pattern: Option<&str>) -> Result<usize, AppError> {
    if !dir.exists() {
        return Ok(0);
    }
    
    let cutoff = Utc::now() - Duration::days(max_age_days);
    let mut removed = 0;
    
    let entries = fs::read_dir(dir)?;
    for entry in entries.flatten() {
        let path = entry.path();
        
        // Check pattern if specified
        if let Some(pat) = pattern {
            let filename = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            if !filename.contains(pat) {
                continue;
            }
        }
        
        // Check file age
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                let modified_time = chrono::DateTime::<Utc>::from(modified);
                if modified_time < cutoff {
                    match fs::remove_file(&path) {
                        Ok(_) => {
                            info!("Removed old file: {}", path.display());
                            removed += 1;
                        }
                        Err(e) => {
                            error!("Failed to remove {}: {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }
    
    Ok(removed)
}

/// Cleanup old rotated log files
fn cleanup_rotated_logs(logs_dir: &Path, max_files: usize) -> Result<usize, AppError> {
    if !logs_dir.exists() {
        return Ok(0);
    }
    
    let log_types = ["app", "api_calls", "errors"];
    let mut total_removed = 0;
    
    for log_type in &log_types {
        let mut rotated_files: Vec<_> = fs::read_dir(logs_dir)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name();
                let name_str = name.to_string_lossy();
                // Match rotated files like "app.20251211_153144"
                name_str.starts_with(log_type) 
                    && name_str.contains('.')
                    && name_str != format!("{}.log", log_type)
            })
            .collect();
        
        // Sort by modified time, oldest first
        rotated_files.sort_by_key(|e| {
            e.metadata()
                .and_then(|m| m.modified())
                .ok()
        });
        
        // Remove oldest if exceeding max_files
        if rotated_files.len() > max_files {
            for entry in rotated_files.iter().take(rotated_files.len() - max_files) {
                match fs::remove_file(entry.path()) {
                    Ok(_) => {
                        info!("Removed old rotated log: {}", entry.path().display());
                        total_removed += 1;
                    }
                    Err(e) => {
                        error!("Failed to remove {}: {}", entry.path().display(), e);
                    }
                }
            }
        }
    }
    
    Ok(total_removed)
}

/// Run comprehensive storage cleanup
pub fn cleanup_storage(config: &StorageConfig, policy: &CleanupPolicy) -> Result<(), AppError> {
    info!("Starting storage cleanup...");
    
    // Cleanup old rotated logs
    let rotated_removed = cleanup_rotated_logs(&config.logs_dir, policy.max_rotated_logs)?;
    if rotated_removed > 0 {
        info!("Removed {} old rotated log files", rotated_removed);
    }
    
    // Cleanup old log files (retention policy)
    let logs_removed = cleanup_old_files(&config.logs_dir, policy.log_retention_days, None)?;
    if logs_removed > 0 {
        info!("Removed {} expired log files (>{}d)", logs_removed, policy.log_retention_days);
    }
    
    // Cleanup old cache files
    let cache_removed = cleanup_old_files(&config.cache_dir, policy.cache_retention_days, None)?;
    if cache_removed > 0 {
        info!("Removed {} expired cache files (>{}d)", cache_removed, policy.cache_retention_days);
    }
    
    // Cleanup old backup files
    let backup_removed = cleanup_old_files(&config.backup_dir, policy.backup_retention_days, None)?;
    if backup_removed > 0 {
        info!("Removed {} expired backup files (>{}d)", backup_removed, policy.backup_retention_days);
    }
    
    // Cleanup old export files
    let export_removed = cleanup_old_files(&config.export_dir, policy.export_retention_days, None)?;
    if export_removed > 0 {
        info!("Removed {} expired export files (>{}d)", export_removed, policy.export_retention_days);
    }
    
    let total_removed = rotated_removed + logs_removed + cache_removed + backup_removed + export_removed;
    
    if total_removed > 0 {
        info!("Storage cleanup complete: removed {} files", total_removed);
    } else {
        info!("Storage cleanup complete: no files to remove");
    }
    
    // Check storage limits after cleanup
    if check_storage_limits(config)? {
        warn!("Storage still exceeds limits after cleanup");
    }
    
    Ok(())
}

/// Log current storage statistics
pub fn log_storage_stats(config: &StorageConfig) -> Result<(), AppError> {
    let stats = get_storage_stats(config)?;
    
    info!("Storage Statistics:");
    info!("  Total: {:.2} GB", stats.total_gb());
    info!("  Data: {:.2} GB", stats.data_gb());
    info!("  Logs: {:.2} GB", stats.logs_gb());
    info!("  Cache: {:.2} MB", stats.cache_bytes as f64 / 1_048_576.0);
    info!("  Backups: {:.2} MB", stats.backup_bytes as f64 / 1_048_576.0);
    info!("  Exports: {:.2} MB", stats.export_bytes as f64 / 1_048_576.0);
    
    if let Some(max_gb) = config.max_total_size_gb {
        let usage_percent = (stats.total_gb() / max_gb as f64) * 100.0;
        info!("  Usage: {:.1}% of {} GB limit", usage_percent, max_gb);
        
        if usage_percent > 90.0 {
            warn!("Storage usage above 90%!");
        } else if usage_percent > 75.0 {
            warn!("Storage usage above 75%");
        }
    }
    
    Ok(())
}

/// Cleanup temp files and ensure directories exist
pub fn initialize_storage(config: &super::config::AppConfig) -> Result<(), AppError> {
    let storage_config = &config.storage;
    
    // Log initial storage state
    log_storage_stats(storage_config)?;
    
    // Check if cleanup needed
    if check_storage_limits(storage_config)? {
        warn!("Storage limit exceeded on startup, running cleanup...");
        let policy = CleanupPolicy::from_env();
        cleanup_storage(storage_config, &policy)?;
    }
    
    Ok(())
}

/// Backup result information
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub file_path: String,
    pub file_size: u64,
    pub timestamp: String,
}

/// Create a database backup using SQLite VACUUM INTO
/// 
/// This ensures a consistent backup by using SQLite's built-in backup mechanism.
/// The backup is stored in storage/backups/ with a timestamp.
#[tracing::instrument(skip(db))]
pub async fn backup_database(
    db: &sea_orm::DatabaseConnection,
    storage_config: &StorageConfig,
) -> Result<BackupInfo, AppError> {
    use sea_orm::ConnectionTrait;
    
    info!("Starting database backup");
    
    // Create backups directory if it doesn't exist
    let backup_dir = &storage_config.backup_dir;
    fs::create_dir_all(backup_dir)
        .map_err(|e| AppError::file_operation("create directory", backup_dir.to_string_lossy(), e))?;
    
    // Generate backup filename with timestamp
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    // Use VACUUM INTO for consistent backup
    let backup_path_str = backup_path.to_str()
        .ok_or_else(|| AppError::storage_operation("backup", "Invalid backup path"))?;
    
    let sql = format!("VACUUM INTO '{}'", backup_path_str);
    
    db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        sql,
    ))
    .await
    .map_err(|e| {
        error!(error = %e, "Database backup failed");
        AppError::database(format!("Failed to create database backup: {}", e))
    })?;
    
    // Get backup file size
    let metadata = fs::metadata(&backup_path)
        .map_err(|e| AppError::file_operation("read metadata", backup_path.to_string_lossy(), e))?;
    
    let backup_info = BackupInfo {
        file_path: backup_path.to_string_lossy().to_string(),
        file_size: metadata.len(),
        timestamp: Utc::now().to_rfc3339(),
    };
    
    info!(
        file_path = %backup_info.file_path,
        size_bytes = backup_info.file_size,
        "Database backup completed successfully"
    );
    
    Ok(backup_info)
}

/// Restore database from a backup file
/// 
/// IMPORTANT: This requires closing all database connections and restarting the application.
/// The backup file is validated before restore.
#[tracing::instrument(skip(db))]
pub async fn restore_database(
    db: &sea_orm::DatabaseConnection,
    backup_path: &str,
    storage_config: &StorageConfig,
) -> Result<(), AppError> {
    use sea_orm::ConnectionTrait;
    
    info!(backup_path = %backup_path, "Starting database restore");
    
    let backup_file = Path::new(backup_path);
    
    // Validate backup file exists
    if !backup_file.exists() {
        error!(backup_path = %backup_path, "Backup file not found");
        return Err(AppError::validation("backup_path", "Backup file not found"));
    }
    
    // Validate backup file is readable
    let backup_metadata = fs::metadata(backup_file)
        .map_err(|e| AppError::file_operation("read metadata", backup_path, e))?;
    
    if backup_metadata.len() == 0 {
        error!(backup_path = %backup_path, "Backup file is empty");
        return Err(AppError::validation("backup_file", "Backup file is empty"));
    }
    
    // Validate backup is a valid SQLite database by trying to open it
    let backup_url = format!("sqlite://{}?mode=ro", backup_file.to_string_lossy());
    let test_db = sea_orm::Database::connect(&backup_url).await
        .map_err(|_| {
            AppError::validation("backup_file", "Invalid SQLite database file")
        })?;
    
    // Test a simple query to ensure it's valid
    test_db.execute(sea_orm::Statement::from_string(
        sea_orm::DatabaseBackend::Sqlite,
        "SELECT 1".to_string(),
    ))
    .await
    .map_err(|_| AppError::validation("backup_file", "Backup file is corrupted"))?;
    
    drop(test_db);
    
    info!(backup_path = %backup_path, "Backup file validated successfully");
    
    // For restore, we need to:
    // 1. Close all connections (handled by caller)
    // 2. Copy backup to main database location
    // 3. Reconnect (handled by caller)
    
    let main_db_path = storage_config.data_dir.join("db.sql");
    
    // Create a temporary backup of current database
    let temp_backup = storage_config.data_dir.join("db.sql.restore_backup");
    if main_db_path.exists() {
        fs::copy(&main_db_path, &temp_backup)
            .map_err(|e| AppError::file_operation("copy", main_db_path.to_string_lossy(), e))?;
    }
    
    // Copy backup file to main database location
    match fs::copy(backup_file, &main_db_path) {
        Ok(_) => {
            info!("Database restored successfully");
            // Clean up temporary backup
            if temp_backup.exists() {
                let _ = fs::remove_file(&temp_backup);
            }
            Ok(())
        }
        Err(e) => {
            error!(error = %e, "Failed to restore database");
            // Try to restore the temporary backup
            if temp_backup.exists() {
                warn!("Attempting to restore previous database state");
                let _ = fs::copy(&temp_backup, &main_db_path);
                let _ = fs::remove_file(&temp_backup);
            }
            Err(AppError::file_operation("copy", main_db_path.to_string_lossy(), e))
        }
    }
}

/// List available database backups
#[tracing::instrument]
pub fn list_backups(storage_config: &StorageConfig) -> Result<Vec<BackupInfo>, AppError> {
    let backup_dir = &storage_config.backup_dir;
    
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut backups = Vec::new();
    
    let entries = fs::read_dir(backup_dir)
        .map_err(|e| AppError::file_operation("read directory", backup_dir.to_string_lossy(), e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| AppError::file_operation("read directory entry", backup_dir.to_string_lossy(), e))?;
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("db") {
            let metadata = fs::metadata(&path)
                .map_err(|e| AppError::file_operation("read metadata", path.to_string_lossy(), e))?;
            
            let modified = metadata.modified()
                .map_err(|e| AppError::file_operation("get modified time", path.to_string_lossy(), e))?;
            
            let timestamp = chrono::DateTime::<Utc>::from(modified).to_rfc3339();
            
            backups.push(BackupInfo {
                file_path: path.to_string_lossy().to_string(),
                file_size: metadata.len(),
                timestamp,
            });
        }
    }
    
    // Sort by timestamp descending (newest first)
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(backups)
}

/// Delete a specific backup file
#[instrument(skip(config))]
pub async fn delete_backup(config: &StorageConfig, backup_path: &str) -> Result<(), AppError> {
    info!(backup_path = backup_path, "Deleting backup file");
    
    // Validate the path is within backups directory to prevent path traversal
    let backup_file = PathBuf::from(backup_path);
    let absolute_backup = backup_file.canonicalize()
        .map_err(|e| AppError::file_operation("canonicalize path", backup_path, e))?;
    
    let absolute_backup_dir = config.backup_dir.canonicalize()
        .map_err(|e| AppError::file_operation("canonicalize backup dir", config.backup_dir.to_string_lossy(), e))?;
    
    if !absolute_backup.starts_with(&absolute_backup_dir) {
        return Err(AppError::validation(
            "backup_path",
            format!("Path '{}' is outside the backup directory", backup_path)
        ));
    }
    
    // Delete the backup file
    fs::remove_file(&backup_file)
        .map_err(|e| AppError::file_operation("delete backup", backup_path, e))?;
    
    info!(backup_path = backup_path, "Backup file deleted successfully");
    Ok(())
}

// ============================================================================
// Data Export/Import
// ============================================================================

use serde_json::Value as JsonValue;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub ideas: Vec<JsonValue>,
    pub news_articles: Vec<JsonValue>,
    pub app_settings: Vec<JsonValue>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInfo {
    pub file_path: String,
    pub file_size: u64,
    pub timestamp: String,
    pub record_counts: ExportCounts,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportCounts {
    pub ideas: usize,
    pub news_articles: usize,
    pub app_settings: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub records_added: usize,
    pub records_skipped: usize,
    pub errors: Vec<String>,
}

/// Export all data to JSON file
#[tracing::instrument(skip(db))]
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
#[tracing::instrument(skip(db))]
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
