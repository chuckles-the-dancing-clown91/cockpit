//! Type definitions for application configuration
//!
//! Defines the structure of configuration objects for each subsystem.

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
