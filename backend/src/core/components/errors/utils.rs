//! Error utility methods for classification and metadata
//!
//! Provides methods to query error properties like error codes,
//! retryability, and user action requirements.

use super::codes::ErrorCode;
use super::types::AppError;

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
}
