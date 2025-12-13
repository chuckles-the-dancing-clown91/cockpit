//! Error type definitions using thiserror
//!
//! Defines structured error variants with context for all error conditions
//! in the application.

use thiserror::Error;

/// Main application error type with structured variants
#[derive(Debug, Error)]
pub enum AppError {
    // Configuration errors
    #[error("Configuration error: {message}")]
    Config {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },

    #[error("Configuration validation failed: {field} - {reason}")]
    ConfigValidation {
        field: String,
        reason: String,
        suggestion: Option<String>,
    },

    // Database errors
    #[error("Database error: {message}")]
    Database {
        message: String,
        #[source]
        source: Option<sea_orm::DbErr>,
    },

    #[error("Database migration failed: {migration} - {reason}")]
    DatabaseMigration {
        migration: String,
        reason: String,
    },

    #[error("Database query failed: {operation}")]
    DatabaseQuery {
        operation: String,
        #[source]
        source: sea_orm::DbErr,
    },

    // Storage errors
    #[error("Storage limit exceeded: {current_gb:.2} GB used of {limit_gb} GB limit")]
    StorageLimitExceeded {
        current_gb: f64,
        limit_gb: u64,
        suggestion: String,
    },

    #[error("Storage operation failed: {operation} - {reason}")]
    StorageOperation {
        operation: String,
        reason: String,
        path: Option<String>,
    },

    // API/Network errors
    #[error("API rate limit exceeded: {used}/{limit} calls used")]
    ApiRateLimit {
        used: u32,
        limit: u32,
        reset_time: Option<String>,
    },

    #[error("API request failed: {endpoint} returned {status}")]
    ApiRequest {
        endpoint: String,
        status: u16,
        #[source]
        source: Option<reqwest::Error>,
    },

    #[error("Network error: {message}")]
    Network {
        message: String,
        #[source]
        source: reqwest::Error,
    },

    // Crypto errors
    #[error("Encryption error: {operation} failed - {reason}")]
    Crypto {
        operation: String,
        reason: String,
    },

    #[error("Invalid encryption key: {reason}")]
    InvalidKey {
        reason: String,
        suggestion: String,
    },

    // File I/O errors
    #[error("File operation failed: {operation} on {path}")]
    FileOperation {
        operation: String,
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("File not found: {path}")]
    FileNotFound {
        path: String,
        suggestion: Option<String>,
    },

    #[error("Permission denied: {path}")]
    PermissionDenied {
        path: String,
        suggestion: String,
    },

    // Validation errors
    #[error("Validation error: {field} - {reason}")]
    Validation {
        field: String,
        reason: String,
        invalid_value: Option<String>,
    },

    // Generic errors
    #[error("{message}")]
    Other {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
}

/// Result type alias for AppError
pub type AppResult<T> = Result<T, AppError>;
