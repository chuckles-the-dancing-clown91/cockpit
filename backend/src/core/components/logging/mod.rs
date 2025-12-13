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
//!
//! Refactored into focused modules:
//! - init: Tracing subscriber initialization
//! - rotation: Log file rotation logic
//! - sanitize: Sensitive data redaction
//! - api: API call logging
//! - utils: Maintenance utilities

mod api;
mod init;
mod rotation;
mod sanitize;
mod utils;

// Re-export public API
pub use api::log_api_call;
pub use init::init_logging;
pub use utils::check_log_rotation;

// Re-export LoggingConfig from sibling module for convenience
pub use crate::core::components::config::LoggingConfig;
