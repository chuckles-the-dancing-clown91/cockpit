//! Automatic conversions from common error types
//!
//! Implements From trait for seamless error conversion using the ? operator.

use super::types::AppError;

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
                suggestion: "Check file permissions and try running with appropriate access"
                    .to_string(),
            },
            _ => Self::FileOperation {
                operation: "file operation".to_string(),
                path: "unknown".to_string(),
                source: err,
            },
        }
    }
}
