//! Storage statistics and monitoring
//!
//! Calculates disk usage across different storage directories,
//! monitors storage limits, and provides reporting.

use std::fs;
use std::path::Path;
use tracing::{info, warn, instrument};

use crate::core::components::config::StorageConfig;
use crate::core::components::errors::AppError;

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
#[instrument(skip(config))]
pub fn get_storage_stats(config: &StorageConfig) -> Result<StorageStats, AppError> {
    // For data directory, count the active database files (db.sql + WAL files)
    // SQLite in WAL mode creates db.sql, db.sql-wal, and db.sql-shm
    // Exclude backup copies like db.sql.corrupted, db.sql.restore_backup
    let mut data_bytes = 0u64;
    
    // Count main database file
    let db_file = config.data_dir.join("db.sql");
    if db_file.exists() {
        data_bytes += fs::metadata(&db_file)?.len();
    }
    
    // Count WAL file (Write-Ahead Log)
    let wal_file = config.data_dir.join("db.sql-wal");
    if wal_file.exists() {
        data_bytes += fs::metadata(&wal_file)?.len();
    }
    
    // Count SHM file (Shared Memory)
    let shm_file = config.data_dir.join("db.sql-shm");
    if shm_file.exists() {
        data_bytes += fs::metadata(&shm_file)?.len();
    }
    
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

/// Initialize storage directories
pub fn initialize_storage(config: &super::super::config::AppConfig) -> Result<(), AppError> {
    // Ensure all storage directories exist
    fs::create_dir_all(&config.storage.root)?;
    fs::create_dir_all(&config.storage.data_dir)?;
    fs::create_dir_all(&config.storage.logs_dir)?;
    fs::create_dir_all(&config.storage.cache_dir)?;
    fs::create_dir_all(&config.storage.backup_dir)?;
    fs::create_dir_all(&config.storage.export_dir)?;
    
    // Log storage stats on initialization
    log_storage_stats(&config.storage)?;
    
    Ok(())
}
