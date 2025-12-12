//! Error types for Architect Cockpit backend
//!
//! Centralized error handling using thiserror 2.0 for consistent, helpful error messages.
//! 
//! # Features
//! - Structured error variants with context
//! - Error codes for frontend display
//! - Actionable suggestions where possible
//! - Proper error source chains for debugging
//! - Automatic conversion from common error types
//!
//! # Usage
//! ```ignore
//! use crate::errors::{AppError, AppResult};
//! 
//! fn process_file(path: &str) -> AppResult<String> {
//!     let content = std::fs::read_to_string(path)
//!         .map_err(|e| AppError::file_operation("read", path, e))?;
//!     Ok(content)
//! }
//! ```

use thiserror::Error;

/// Error codes for frontend display and error categorization
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    // Configuration: 1xxx
    ConfigInvalid = 1001,
    ConfigValidationFailed = 1002,
    
    // Database: 2xxx
    DatabaseConnection = 2001,
    DatabaseQuery = 2002,
    DatabaseMigration = 2003,
    DatabaseConstraint = 2004,
    
    // Storage: 3xxx
    StorageLimitExceeded = 3001,
    StorageOperationFailed = 3002,
    
    // API/Network: 4xxx
    ApiRateLimit = 4001,
    ApiRequestFailed = 4002,
    NetworkError = 4003,
    
    // Crypto: 5xxx
    CryptoEncryptionFailed = 5001,
    CryptoInvalidKey = 5002,
    
    // File I/O: 6xxx
    FileOperationFailed = 6001,
    FileNotFound = 6002,
    PermissionDenied = 6003,
    
    // Validation: 7xxx
    ValidationFailed = 7001,
    
    // Generic: 9xxx
    Unknown = 9999,
}

impl ErrorCode {
    /// Get the error code as an integer
    pub fn as_u32(self) -> u32 {
        self as u32
    }
    
    /// Get the error code as a string (e.g., "E2001")
    pub fn as_string(self) -> String {
        format!("E{:04}", self as u32)
    }
}

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
    /// Get the error code for this error
    pub fn code(&self) -> ErrorCode {
        match self {
            Self::Config { .. } => ErrorCode::ConfigInvalid,
            Self::ConfigValidation { .. } => ErrorCode::ConfigValidationFailed,
            Self::Database { .. } => ErrorCode::DatabaseConnection,
            Self::DatabaseMigration { .. } => ErrorCode::DatabaseMigration,
            Self::DatabaseQuery { .. } => ErrorCode::DatabaseQuery,
            Self::StorageLimitExceeded { .. } => ErrorCode::StorageLimitExceeded,
            Self::StorageOperation { .. } => ErrorCode::StorageOperationFailed,
            Self::ApiRateLimit { .. } => ErrorCode::ApiRateLimit,
            Self::ApiRequest { .. } => ErrorCode::ApiRequestFailed,
            Self::Network { .. } => ErrorCode::NetworkError,
            Self::Crypto { .. } => ErrorCode::CryptoEncryptionFailed,
            Self::InvalidKey { .. } => ErrorCode::CryptoInvalidKey,
            Self::FileOperation { .. } => ErrorCode::FileOperationFailed,
            Self::FileNotFound { .. } => ErrorCode::FileNotFound,
            Self::PermissionDenied { .. } => ErrorCode::PermissionDenied,
            Self::Validation { .. } => ErrorCode::ValidationFailed,
            Self::Other { .. } => ErrorCode::Unknown,
        }
    }
    
    /// Get error code as string (e.g., "E2001")
    pub fn code_string(&self) -> String {
        self.code().as_string()
    }
    
    /// Check if this error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::Network { .. } | Self::ApiRequest { .. } | Self::DatabaseQuery { .. }
        )
    }
    
    /// Check if this error requires user action
    pub fn requires_user_action(&self) -> bool {
        matches!(
            self,
            Self::ConfigValidation { .. }
                | Self::InvalidKey { .. }
                | Self::ApiRateLimit { .. }
                | Self::StorageLimitExceeded { .. }
                | Self::PermissionDenied { .. }
        )
    }
    
    /// Get a user-friendly suggestion if available
    pub fn suggestion(&self) -> Option<&str> {
        match self {
            Self::ConfigValidation { suggestion, .. } => suggestion.as_deref(),
            Self::InvalidKey { suggestion, .. } => Some(suggestion.as_str()),
            Self::FileNotFound { suggestion, .. } => suggestion.as_deref(),
            Self::PermissionDenied { suggestion, .. } => Some(suggestion.as_str()),
            Self::StorageLimitExceeded { suggestion, .. } => Some(suggestion.as_str()),
            _ => None,
        }
    }
    
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
    
    /// Add context to any error with additional message
    pub fn with_context(self, context: impl Into<String>) -> Self {
        let ctx = context.into();
        match self {
            Self::Other { message, source } => Self::Other {
                message: format!("{}: {}", ctx, message),
                source,
            },
            _ => Self::Other {
                message: format!("{}: {}", ctx, self),
                source: Some(Box::new(self)),
            },
        }
    }
    
    /// Add a suggestion to errors that support it
    pub fn with_suggestion(self, suggestion: impl Into<String>) -> Self {
        let sug = suggestion.into();
        match self {
            Self::ConfigValidation { field, reason, .. } => {
                Self::ConfigValidation {
                    field,
                    reason,
                    suggestion: Some(sug),
                }
            }
            Self::FileNotFound { path, .. } => Self::FileNotFound {
                path,
                suggestion: Some(sug),
            },
            Self::StorageOperation { operation, reason, path } => Self::StorageOperation {
                operation,
                reason: format!("{} ({})", reason, sug),
                path,
            },
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
