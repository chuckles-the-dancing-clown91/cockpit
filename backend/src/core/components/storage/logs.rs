//! Log management module
//! 
//! Handles log reading, statistics, export, and clearing operations.
//! Supports both JSON and plain text log formats.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use chrono::{Duration, Utc};
use serde_json::Value as JsonValue;
use tracing::{info, warn, instrument};

use crate::core::components::config::StorageConfig;
use crate::core::components::errors::AppError;

use super::cleanup::CleanupSummary;

/// Log entry structure
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub target: String,
    pub message: String,
    pub fields: Option<serde_json::Map<String, JsonValue>>,
}

/// Log statistics
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStats {
    pub total_count: usize,
    pub info_count: usize,
    pub warn_count: usize,
    pub error_count: usize,
    pub last_24h_count: usize,
    pub last_7d_count: usize,
    pub last_30d_count: usize,
}

/// Get logs with optional filters
#[instrument(skip(config))]
pub fn get_logs(
    config: &StorageConfig,
    level_filter: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<LogEntry>, AppError> {
    info!("Reading logs with filters");
    
    if !config.logs_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut all_entries = Vec::new();
    
    // Read all log files in the directory
    let entries = fs::read_dir(&config.logs_dir)
        .map_err(|e| AppError::file_operation("read logs directory", config.logs_dir.to_string_lossy(), e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        // Only process .log files, exclude api_calls.log
        if !path.is_file() || path.extension().and_then(|s| s.to_str()) != Some("log") {
            continue;
        }
        
        // Skip API call logs - they're too verbose and should be viewed separately
        if path.file_name().and_then(|n| n.to_str()) == Some("api_calls.log") {
            continue;
        }
        
        // Read and parse log file
        let file = fs::File::open(&path)
            .map_err(|e| AppError::file_operation("open log file", path.to_string_lossy(), e))?;
        
        let reader = BufReader::new(file);
        
        for line in reader.lines().flatten() {
            // Try to parse as JSON first
            if let Ok(json) = serde_json::from_str::<JsonValue>(&line) {
                // Extract fields from JSON
                let timestamp = json.get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                
                let level = json.get("level")
                    .and_then(|v| v.as_str())
                    .unwrap_or("INFO")
                    .to_string();
                
                // Apply level filter
                if let Some(ref filter) = level_filter {
                    if !level.eq_ignore_ascii_case(filter) {
                        continue;
                    }
                }
                
                let target = json.get("target")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                
                // Handle message in both formats:
                // - Top-level: {"message": "text"}
                // - Nested: {"fields": {"message": "text"}}
                let message = json.get("message")
                    .or_else(|| json.get("msg"))
                    .or_else(|| json.get("fields").and_then(|f| f.get("message")))
                    .or_else(|| json.get("fields").and_then(|f| f.get("msg")))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                
                let mut fields = serde_json::Map::new();
                if let Some(obj) = json.as_object() {
                    for (k, v) in obj {
                        if !["timestamp", "level", "target", "message", "msg"].contains(&k.as_str()) {
                            fields.insert(k.clone(), v.clone());
                        }
                    }
                }
                
                all_entries.push(LogEntry {
                    timestamp,
                    level,
                    target,
                    message,
                    fields: if fields.is_empty() { None } else { Some(fields) },
                });
            } else {
                // Parse plain text format: "2025-12-12T19:15:18.764156Z  INFO backend::target: message"
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 4 {
                    let timestamp = parts[0].trim().to_string();
                    let level = parts[1].trim().to_string();
                    let target = parts[2].trim().trim_end_matches(':').to_string();
                    let message = parts[3].trim().to_string();
                    
                    // Apply level filter
                    if let Some(ref filter) = level_filter {
                        if !level.eq_ignore_ascii_case(filter) {
                            continue;
                        }
                    }
                    
                    all_entries.push(LogEntry {
                        timestamp,
                        level,
                        target,
                        message,
                        fields: None,
                    });
                }
            }
        }
    }
    
    // Sort by timestamp descending (newest first)
    all_entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    // Apply pagination
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(100);
    
    let paginated: Vec<LogEntry> = all_entries.into_iter()
        .skip(offset)
        .take(limit)
        .collect();
    
    info!(count = paginated.len(), "Logs retrieved");
    Ok(paginated)
}

/// Get log statistics
#[instrument(skip(config))]
pub fn get_log_stats(config: &StorageConfig) -> Result<LogStats, AppError> {
    info!("Calculating log statistics");
    
    if !config.logs_dir.exists() {
        return Ok(LogStats {
            total_count: 0,
            info_count: 0,
            warn_count: 0,
            error_count: 0,
            last_24h_count: 0,
            last_7d_count: 0,
            last_30d_count: 0,
        });
    }
    
    let now = Utc::now();
    let cutoff_24h = now - Duration::hours(24);
    let cutoff_7d = now - Duration::days(7);
    let cutoff_30d = now - Duration::days(30);
    
    let mut stats = LogStats {
        total_count: 0,
        info_count: 0,
        warn_count: 0,
        error_count: 0,
        last_24h_count: 0,
        last_7d_count: 0,
        last_30d_count: 0,
    };
    
    let entries = fs::read_dir(&config.logs_dir)
        .map_err(|e| AppError::file_operation("read logs directory", config.logs_dir.to_string_lossy(), e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        if !path.is_file() || path.extension().and_then(|s| s.to_str()) != Some("log") {
            continue;
        }
        
        // Skip API call logs
        if path.file_name().and_then(|n| n.to_str()) == Some("api_calls.log") {
            continue;
        }
        
        let file = fs::File::open(&path)
            .map_err(|e| AppError::file_operation("open log file", path.to_string_lossy(), e))?;
        
        let reader = BufReader::new(file);
        
        for line in reader.lines().flatten() {
            let (level, timestamp_str) = if let Ok(json) = serde_json::from_str::<JsonValue>(&line) {
                // JSON format
                let level = json.get("level")
                    .and_then(|v| v.as_str())
                    .unwrap_or("INFO")
                    .to_uppercase();
                let ts = json.get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                (level, ts)
            } else {
                // Plain text format: "2025-12-12T19:15:18.764156Z  INFO backend::target: message"
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 4 {
                    let ts = parts[0].trim().to_string();
                    let level = parts[1].trim().to_uppercase();
                    (level, ts)
                } else {
                    continue;
                }
            };
            
            stats.total_count += 1;
            
            // Count by level
            match level.as_str() {
                "INFO" => stats.info_count += 1,
                "WARN" => stats.warn_count += 1,
                "ERROR" => stats.error_count += 1,
                _ => {}
            }
            
            // Count by time period
            if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&timestamp_str) {
                let ts_utc = ts.with_timezone(&Utc);
                if ts_utc > cutoff_24h {
                    stats.last_24h_count += 1;
                }
                if ts_utc > cutoff_7d {
                    stats.last_7d_count += 1;
                }
                if ts_utc > cutoff_30d {
                    stats.last_30d_count += 1;
                }
            }
        }
    }
    
    info!(total = stats.total_count, "Log statistics calculated");
    Ok(stats)
}

/// Export filtered logs to a file
#[instrument(skip(config))]
pub fn export_logs(
    config: &StorageConfig,
    level_filter: Option<String>,
) -> Result<String, AppError> {
    info!("Exporting logs");
    
    // Create exports directory if it doesn't exist
    fs::create_dir_all(&config.export_dir)
        .map_err(|e| AppError::file_operation("create exports directory", config.export_dir.to_string_lossy(), e))?;
    
    // Generate filename with timestamp
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let filter_suffix = level_filter.as_ref().map(|f| format!("_{}", f.to_lowercase())).unwrap_or_default();
    let filename = format!("logs{}_{}. txt", filter_suffix, timestamp);
    let export_path = config.export_dir.join(&filename);
    
    // Get logs with filter
    let logs = get_logs(config, level_filter, None, None)?;
    let log_count = logs.len();
    
    // Write to file
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&export_path)
        .map_err(|e| AppError::file_operation("create export file", export_path.to_string_lossy(), e))?;
    
    for log in logs {
        writeln!(file, "[{}] {} {} - {}", 
            log.timestamp, 
            log.level, 
            log.target, 
            log.message
        ).map_err(|e| AppError::file_operation("write to export file", export_path.to_string_lossy(), e))?;
        
        if let Some(fields) = log.fields {
            for (key, value) in fields {
                writeln!(file, "  {}: {}", key, value)
                    .map_err(|e| AppError::file_operation("write to export file", export_path.to_string_lossy(), e))?;
            }
        }
    }
    
    let export_path_str = export_path.to_string_lossy().to_string();
    info!(path = %export_path_str, count = log_count, "Logs exported");
    Ok(export_path_str)
}

/// Clear log files
#[instrument(skip(config))]
pub fn clear_logs(config: &StorageConfig, level_filter: Option<String>) -> Result<CleanupSummary, AppError> {
    info!("Clearing logs");
    
    if !config.logs_dir.exists() {
        return Ok(CleanupSummary {
            files_deleted: 0,
            space_freed_bytes: 0,
            retention_days: 0,
        });
    }
    
    let mut files_deleted = 0;
    let mut space_freed = 0u64;
    
    if level_filter.is_none() {
        // Delete all log files
        let entries = fs::read_dir(&config.logs_dir)
            .map_err(|e| AppError::file_operation("read logs directory", config.logs_dir.to_string_lossy(), e))?;
        
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                if let Ok(metadata) = entry.metadata() {
                    space_freed += metadata.len();
                }
                
                match fs::remove_file(&path) {
                    Ok(_) => {
                        info!("Removed log file: {}", path.display());
                        files_deleted += 1;
                    }
                    Err(e) => {
                        warn!(error = %e, path = %path.display(), "Failed to remove log file");
                    }
                }
            }
        }
    } else {
        warn!("Level-based filtering for clear_logs not yet implemented, clearing all logs");
        // For simplicity, just clear all logs if filter is specified
        // In practice, you might want to read and rewrite files without the filtered level
        return Err(AppError::validation("level_filter", "Filtered log clearing not implemented"));
    }
    
    info!(files_deleted = files_deleted, space_freed_mb = space_freed / (1024 * 1024), "Logs cleared");
    
    Ok(CleanupSummary {
        files_deleted,
        space_freed_bytes: space_freed,
        retention_days: 0,
    })
}
