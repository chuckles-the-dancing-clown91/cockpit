//! Error types for Architect Cockpit backend
//!
//! Centralized error handling using thiserror for consistent, helpful error messages.

use thiserror::Error;

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

impl AppError {
    /// Create a config error with a message
    pub fn config(message: impl Into<String>) -> Self {
        Self::Config {
            message: message.into(),
            source: None,
        }
    }
    
    /// Create a config validation error
    pub fn config_validation(field: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::ConfigValidation {
            field: field.into(),
            reason: reason.into(),
            suggestion: None,
        }
    }
    
    /// Create a database error with a message
    pub fn database(message: impl Into<String>) -> Self {
        Self::Database {
            message: message.into(),
            source: None,
        }
    }
    
    /// Create a storage operation error
    pub fn storage_operation(operation: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::StorageOperation {
            operation: operation.into(),
            reason: reason.into(),
            path: None,
        }
    }
    
    /// Create a file operation error
    pub fn file_operation(operation: impl Into<String>, path: impl Into<String>, source: std::io::Error) -> Self {
        Self::FileOperation {
            operation: operation.into(),
            path: path.into(),
            source,
        }
    }
    
    /// Create a validation error
    pub fn validation(field: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::Validation {
            field: field.into(),
            reason: reason.into(),
            invalid_value: None,
        }
    }
    
    /// Create a generic error
    pub fn other(message: impl Into<String>) -> Self {
        Self::Other {
            message: message.into(),
            source: None,
        }
    }
    
    /// Add a suggestion to a Config error
    pub fn with_suggestion(self, suggestion: impl Into<String>) -> Self {
        match self {
            Self::ConfigValidation { field, reason, .. } => {
                Self::ConfigValidation {
                    field,
                    reason,
                    suggestion: Some(suggestion.into()),
                }
            }
            _ => self,
        }
    }
}

// Implement From for common error types
impl From<sea_orm::DbErr> for AppError {
    fn from(err: sea_orm::DbErr) -> Self {
        Self::DatabaseQuery {
            operation: "database operation".to_string(),
            source: err,
        }
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        Self::Network {
            message: err.to_string(),
            source: err,
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => Self::FileNotFound {
                path: "unknown".to_string(),
                suggestion: Some("Check that the file or directory exists".to_string()),
            },
            std::io::ErrorKind::PermissionDenied => Self::PermissionDenied {
                path: "unknown".to_string(),
                suggestion: "Check file permissions and try running with appropriate access".to_string(),
            },
            _ => Self::FileOperation {
                operation: "file operation".to_string(),
                path: "unknown".to_string(),
                source: err,
            },
        }
    }
}
