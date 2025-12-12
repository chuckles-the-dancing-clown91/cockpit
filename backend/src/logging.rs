//! Logging infrastructure for Architect Cockpit
//!
//! Provides structured logging with tracing, log file management with rotation,
//! separate log files by type, sanitization of sensitive data (API keys, tokens),
//! and distributed tracing with span support for request/operation tracking.
//!
//! # Features
//! - **Structured Logging**: JSON format support for machine parsing
//! - **Log Rotation**: Size-based and time-based rotation with configurable retention
//! - **Sensitive Data Redaction**: Automatic sanitization of API keys and tokens
//! - **Distributed Tracing**: Span-based request tracking across components
//! - **Multi-Level Logging**: Separate error logs for critical issues
//!
//! # Usage with Spans
//! ```ignore
//! use tracing::instrument;
//!
//! #[instrument(skip(db), fields(article_id = %article_id))]
//! async fn process_article(article_id: i64, db: &DatabaseConnection) -> Result<()> {
//!     info!("Processing article");
//!     // work happens here
//!     Ok(())
//! }
//! ```

use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};
use std::io::Write;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer, EnvFilter};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

use crate::config::LoggingConfig;

/// Sanitize URLs by redacting API keys in query parameters
fn sanitize_url(raw: &str) -> String {
    if let Some(idx) = raw.find('?') {
        let (base, query) = raw.split_at(idx + 1);
        let mut pairs = Vec::new();
        for part in query.split('&') {
            let mut split = part.splitn(2, '=');
            let key = split.next().unwrap_or_default();
            let val = split.next().unwrap_or_default();
            let redacted = matches!(key.to_ascii_lowercase().as_str(), "apikey" | "api_key" | "token" | "key");
            pairs.push(format!("{}={}", key, if redacted { "[REDACTED]" } else { val }));
        }
        format!("{}{}", base, pairs.join("&"))
    } else {
        raw.to_string()
    }
}

/// Sanitize JSON/form bodies by redacting API keys
fn sanitize_body(raw: &str) -> String {
    let mut s = raw.to_string();
    for marker in ["apikey\":\"", "api_key\":\"", "token\":\""] {
        if let Some(idx) = s.find(marker) {
            let start = idx + marker.len();
            if let Some(end) = s[start..].find('"') {
                s.replace_range(start..start + end, "[REDACTED]");
            }
        }
    }
    for marker in ["apikey=", "api_key=", "token="] {
        if let Some(idx) = s.find(marker) {
            let start = idx + marker.len();
            let end = s[start..]
                .find(|c: char| c == '&' || c == ' ' || c == '\n')
                .map(|e| start + e)
                .unwrap_or_else(|| s.len());
            s.replace_range(start..end, "[REDACTED]");
        }
    }
    s
}

/// Check file size and rotate if needed
fn check_and_rotate_log(log_path: &Path, max_size_bytes: u64, max_files: usize) {
    if let Ok(metadata) = fs::metadata(log_path) {
        if metadata.len() >= max_size_bytes {
            rotate_log_file(log_path, max_files);
        }
    }
}

/// Rotate log file by renaming it with timestamp and removing old files
fn rotate_log_file(log_path: &Path, max_files: usize) {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let rotated_name = format!(
        "{}.{}",
        log_path.file_stem().unwrap_or_default().to_string_lossy(),
        timestamp
    );
    
    if let Some(parent) = log_path.parent() {
        let rotated_path = parent.join(&rotated_name);
        let _ = fs::rename(log_path, &rotated_path);
        
        // Clean up old rotated files
        cleanup_old_rotated_logs(parent, log_path, max_files);
    }
}

/// Remove oldest rotated log files, keeping only max_files
fn cleanup_old_rotated_logs(dir: &Path, base_log_path: &Path, max_files: usize) {
    let base_name = base_log_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    if let Ok(entries) = fs::read_dir(dir) {
        let mut rotated_files: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name();
                let name_str = name.to_string_lossy();
                name_str.starts_with(base_name) && name_str.contains('.')
                    && e.path() != base_log_path
            })
            .collect();
        
        // Sort by modified time, oldest first
        rotated_files.sort_by_key(|e| {
            e.metadata()
                .and_then(|m| m.modified())
                .ok()
        });
        
        // Remove oldest files if we exceed max_files
        if rotated_files.len() > max_files {
            for entry in rotated_files.iter().take(rotated_files.len() - max_files) {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
}

/// Initialize the logging system with configuration
///
/// Sets up:
/// - App-wide logging to app.log with rotation
/// - Error-level logging to errors.log
/// - Console output
/// - Optional JSON formatting
pub fn init_logging(config: &LoggingConfig) {
    // Ensure log directory exists
    if let Some(parent) = config.app_log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    // Set up environment filter from config
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(&config.level));
    
    // Create file appender for app logs
    let app_file_appender = if let Some(parent) = config.app_log_path.parent() {
        if let Some(filename) = config.app_log_path.file_name() {
            RollingFileAppender::new(
                Rotation::NEVER, // We handle rotation manually
                parent,
                filename
            )
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "app.log")
        }
    } else {
        RollingFileAppender::new(Rotation::NEVER, ".", "app.log")
    };
    
    if config.structured_json {
        // JSON format for machine parsing
        let app_layer = fmt::layer()
            .json()
            .with_writer(app_file_appender)
            .with_ansi(false);
        
        // Create separate error appender for JSON
        let error_appender = if let Some(parent) = config.error_log_path.parent() {
            if let Some(filename) = config.error_log_path.file_name() {
                RollingFileAppender::new(Rotation::NEVER, parent, filename)
            } else {
                RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
            }
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
        };
        
        let error_layer = fmt::layer()
            .json()
            .with_writer(error_appender)
            .with_ansi(false)
            .with_filter(EnvFilter::new("error"));
        
        if config.console_output {
            let console_layer = fmt::layer()
                .json()
                .with_writer(std::io::stdout)
                .with_ansi(false);
            
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .with(console_layer)
                .init();
        } else {
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .init();
        }
    } else {
        // Human-readable format
        let app_layer = fmt::layer()
            .with_writer(app_file_appender)
            .with_ansi(false);
        
        // Create separate error appender for text
        let error_appender = if let Some(parent) = config.error_log_path.parent() {
            if let Some(filename) = config.error_log_path.file_name() {
                RollingFileAppender::new(Rotation::NEVER, parent, filename)
            } else {
                RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
            }
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
        };
        
        let error_layer = fmt::layer()
            .with_writer(error_appender)
            .with_ansi(false)
            .with_filter(EnvFilter::new("error"));
        
        if config.console_output {
            let console_layer = fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(true);
            
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .with(console_layer)
                .init();
        } else {
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .init();
        }
    }
}

/// Log an external API call with sanitization and rotation
///
/// Writes to api_calls.log with automatic rotation when size limit reached
pub fn log_api_call(
    name: &str,
    url: &str,
    status: reqwest::StatusCode,
    body_preview: &str,
    log_path: &PathBuf,
) {
    // Check if rotation needed (10MB default from config)
    let max_size_bytes = 10 * 1024 * 1024; // We should get this from config ideally
    check_and_rotate_log(log_path, max_size_bytes, 5);
    
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_path) {
        let safe_url = sanitize_url(url);
        let safe_body = sanitize_body(body_preview);
        
        let _ = writeln!(
            f,
            "[{}] {} {} - {}",
            chrono::Utc::now().to_rfc3339(),
            name,
            status.as_u16(),
            safe_url
        );
        let _ = writeln!(f, "body: {}", safe_body);
        let _ = writeln!(f, "----------------------------------------");
    }
}

/// Check all log files and rotate if needed
///
/// Should be called periodically or before writing to ensure logs don't grow unbounded
#[allow(dead_code)]
pub fn check_log_rotation(config: &LoggingConfig) {
    let max_size_bytes = config.max_file_size_mb * 1024 * 1024;
    
    check_and_rotate_log(&config.app_log_path, max_size_bytes, config.max_files);
    check_and_rotate_log(&config.api_log_path, max_size_bytes, config.max_files);
    check_and_rotate_log(&config.error_log_path, max_size_bytes, config.max_files);
}
