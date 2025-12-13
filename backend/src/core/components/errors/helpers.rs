//! Helper methods for creating common error variants
//!
//! Provides convenient constructors for frequently used error types.

use super::types::AppError;

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
    pub fn file_operation(
        operation: impl Into<String>,
        path: impl Into<String>,
        source: std::io::Error,
    ) -> Self {
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
            Self::ConfigValidation { field, reason, .. } => Self::ConfigValidation {
                field,
                reason,
                suggestion: Some(sug),
            },
            Self::FileNotFound { path, .. } => Self::FileNotFound {
                path,
                suggestion: Some(sug),
            },
            Self::StorageOperation {
                operation,
                reason,
                path,
            } => Self::StorageOperation {
                operation,
                reason: format!("{} ({})", reason, sug),
                path,
            },
            _ => self,
        }
    }
}
