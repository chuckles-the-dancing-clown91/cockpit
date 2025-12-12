//! Storage management for Architect Cockpit
//!
//! Provides centralized storage operations:
//! - Path management using configuration
//! - Size calculation and monitoring
//! - Cleanup policies for logs, cache, old data
//! - Storage limit enforcement

use std::fs;
use std::path::Path;
use chrono::{Duration, Utc};
use tracing::{info, warn, error};

use super::config::StorageConfig;
use super::errors::AppError;

/// Storage statistics
#[derive(Debug, Clone)]
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
