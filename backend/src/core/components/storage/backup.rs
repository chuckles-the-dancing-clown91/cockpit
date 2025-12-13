//! Database backup and restore operations
//!
//! Provides backup/restore functionality using SQLite's VACUUM INTO
//! for consistent, point-in-time backups.

use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use tracing::{info, warn, error, instrument};
use sea_orm::ConnectionTrait;

use crate::core::components::config::StorageConfig;
use crate::core::components::errors::AppError;

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
#[instrument(skip(db, storage_config))]
pub async fn backup_database(
    db: &sea_orm::DatabaseConnection,
    storage_config: &StorageConfig,
) -> Result<BackupInfo, AppError> {
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
#[instrument(skip(_db))]
pub async fn restore_database(
    _db: &sea_orm::DatabaseConnection,
    backup_path: &str,
    storage_config: &StorageConfig,
) -> Result<(), AppError> {
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
#[instrument]
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
