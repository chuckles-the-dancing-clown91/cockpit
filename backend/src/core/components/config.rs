//! Centralized, type-safe configuration for Architect Cockpit
//!
//! All configuration is loaded from environment variables with:
//! - Type safety
//! - Validation
//! - Sensible defaults
//! - Clear error messages

use super::errors::AppError;
use std::path::PathBuf;
use std::time::Duration;

/// Main application configuration
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
    pub newsdata: NewsDataConfig,
    pub storage: StorageConfig,
    pub crypto: CryptoConfig,
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub path: PathBuf,
    pub max_connections: u32,
    pub min_connections: u32,
}

/// Logging configuration
#[derive(Debug, Clone)]
pub struct LoggingConfig {
    pub level: String,
    pub app_log_path: PathBuf,
    pub api_log_path: PathBuf,
    pub error_log_path: PathBuf,
    pub max_file_size_mb: u64,
    pub max_files: usize,
    pub structured_json: bool,
    pub console_output: bool,
}

/// NewsData API configuration
#[derive(Debug, Clone)]
pub struct NewsDataConfig {
    pub api_key: Option<String>,
    pub daily_call_limit: u32,
    pub request_timeout: Duration,
    pub max_retries: u32,
}

/// Storage configuration
#[derive(Debug, Clone)]
pub struct StorageConfig {
    pub root: PathBuf,
    pub data_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub backup_dir: PathBuf,
    pub export_dir: PathBuf,
    pub max_total_size_gb: Option<u64>,
}

/// Cryptography configuration
#[derive(Debug, Clone)]
pub struct CryptoConfig {
    pub master_key: String,
}

impl AppConfig {
    /// Load configuration from environment with validation
    pub fn from_env() -> Result<Self, AppError> {
        // Load .env file if present
        let _ = dotenvy::dotenv();
        
        let database = DatabaseConfig::from_env()?;
        let logging = LoggingConfig::from_env()?;
        let newsdata = NewsDataConfig::from_env()?;
        let storage = StorageConfig::from_env()?;
        let crypto = CryptoConfig::from_env()?;
        
        Ok(AppConfig {
            database,
            logging,
            newsdata,
            storage,
            crypto,
        })
    }
}

impl DatabaseConfig {
    fn from_env() -> Result<Self, AppError> {
        let path = std::env::var("COCKPIT_DB_PATH")
            .unwrap_or_else(|_| "cockpit.sqlite".to_string());
        
        let url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| format!("sqlite:{}", path));
        
        // Validate it's SQLite
        if !url.starts_with("sqlite:") {
            return Err(AppError::ConfigValidation {
                field: "DATABASE_URL".to_string(),
                reason: "Only SQLite databases are supported".to_string(),
                suggestion: Some("Use format: sqlite:path/to/db.sql".to_string()),
            });
        }
        
        let max_connections = std::env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(5);
        
        let min_connections = std::env::var("DB_MIN_CONNECTIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);
        
        if max_connections < min_connections {
            return Err(AppError::ConfigValidation {
                field: "DB_MAX_CONNECTIONS".to_string(),
                reason: format!("Value ({}) must be >= DB_MIN_CONNECTIONS ({})", 
                    max_connections, min_connections),
                suggestion: Some("Increase DB_MAX_CONNECTIONS or decrease DB_MIN_CONNECTIONS".to_string()),
            });
        }
        
        Ok(DatabaseConfig {
            url,
            path: PathBuf::from(path),
            max_connections,
            min_connections,
        })
    }
}

impl LoggingConfig {
    fn from_env() -> Result<Self, AppError> {
        let level = std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
        
        // Validate log level
        if !["trace", "debug", "info", "warn", "error"].contains(&level.as_str()) {
            return Err(AppError::ConfigValidation {
                field: "LOG_LEVEL".to_string(),
                reason: format!("Invalid value '{}'", level),
                suggestion: Some("Use one of: trace, debug, info, warn, error".to_string()),
            });
        }
        
        let logs_dir = PathBuf::from(
            std::env::var("LOGS_DIR").unwrap_or_else(|_| "storage/logs".to_string())
        );
        
        let app_log_path = logs_dir.join("app.log");
        let api_log_path = logs_dir.join("api_calls.log");
        let error_log_path = logs_dir.join("errors.log");
        
        let max_file_size_mb = std::env::var("LOG_MAX_SIZE_MB")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);
        
        let max_files = std::env::var("LOG_MAX_FILES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(5);
        
        let structured_json = std::env::var("LOG_JSON")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);
        
        let console_output = std::env::var("LOG_CONSOLE")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(true);
        
        Ok(LoggingConfig {
            level,
            app_log_path,
            api_log_path,
            error_log_path,
            max_file_size_mb,
            max_files,
            structured_json,
            console_output,
        })
    }
}

impl NewsDataConfig {
    fn from_env() -> Result<Self, AppError> {
        let api_key = std::env::var("NEWSDATA_API_KEY")
            .or_else(|_| std::env::var("NEWS_API_KEY"))
            .ok();
        
        let daily_call_limit = std::env::var("NEWSDATA_DAILY_LIMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(180);
        
        let timeout_secs = std::env::var("NEWSDATA_TIMEOUT_SECS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(30);
        
        let max_retries = std::env::var("NEWSDATA_MAX_RETRIES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(3);
        
        Ok(NewsDataConfig {
            api_key,
            daily_call_limit,
            request_timeout: Duration::from_secs(timeout_secs),
            max_retries,
        })
    }
}

impl StorageConfig {
    fn from_env() -> Result<Self, AppError> {
        let root = PathBuf::from(
            std::env::var("STORAGE_ROOT").unwrap_or_else(|_| "storage".to_string())
        );
        
        let data_dir = root.join("data");
        let logs_dir = PathBuf::from(
            std::env::var("LOGS_DIR").unwrap_or_else(|_| "storage/logs".to_string())
        );
        let cache_dir = root.join("cache");
        let backup_dir = root.join("backups");
        let export_dir = root.join("exports");
        
        let max_total_size_gb = std::env::var("STORAGE_MAX_SIZE_GB")
            .ok()
            .and_then(|s| s.parse().ok());
        
        Ok(StorageConfig {
            root,
            data_dir,
            logs_dir,
            cache_dir,
            backup_dir,
            export_dir,
            max_total_size_gb,
        })
    }
}

impl CryptoConfig {
    fn from_env() -> Result<Self, AppError> {
        let master_key = std::env::var("COCKPIT_MASTER_KEY")
            .map_err(|_| AppError::InvalidKey {
                reason: "COCKPIT_MASTER_KEY environment variable is required".to_string(),
                suggestion: "Generate with: openssl rand -hex 32".to_string(),
            })?;
        
        // Validate it's valid hex and correct length (32 bytes = 64 hex chars)
        if master_key.len() != 64 {
            return Err(AppError::InvalidKey {
                reason: format!("Key must be 64 hex characters (32 bytes), got {} characters", 
                    master_key.len()),
                suggestion: "Generate a new key with: openssl rand -hex 32".to_string(),
            });
        }
        
        if hex::decode(&master_key).is_err() {
            return Err(AppError::InvalidKey {
                reason: "Key contains invalid hexadecimal characters".to_string(),
                suggestion: "Key must only contain 0-9 and a-f characters".to_string(),
            });
        }
        
        Ok(CryptoConfig { master_key })
    }
}

/// Helper to validate and create required directories
pub fn ensure_directories(config: &AppConfig) -> Result<(), AppError> {
    let dirs = vec![
        &config.storage.root,
        &config.storage.data_dir,
        &config.storage.logs_dir,
        &config.storage.cache_dir,
        &config.storage.backup_dir,
        &config.storage.export_dir,
    ];
    
    for dir in dirs {
        std::fs::create_dir_all(dir)?;
    }
    
    Ok(())
}
