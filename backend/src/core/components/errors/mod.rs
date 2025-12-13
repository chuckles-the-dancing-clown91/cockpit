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
//!
//! Refactored into focused modules:
//! - codes: Error code definitions
//! - types: Main AppError enum and AppResult type
//! - helpers: Convenient constructors for common errors
//! - utils: Error classification and metadata methods
//! - conversions: Automatic From implementations

mod codes;
mod conversions;
mod helpers;
mod types;
mod utils;

// Re-export all public items
pub use codes::ErrorCode;
pub use types::{AppError, AppResult};

// Re-export methods are already implemented on AppError via the modules
