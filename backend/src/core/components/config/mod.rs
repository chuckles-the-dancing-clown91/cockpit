//! Centralized, type-safe configuration for Architect Cockpit
//!
//! All configuration is loaded from environment variables with:
//! - Type safety
//! - Validation
//! - Sensible defaults
//! - Clear error messages
//!
//! Refactored into focused modules:
//! - types: Configuration struct definitions
//! - loader: Environment variable loading logic
//! - validation: Directory setup and validation

mod loader;
mod types;
mod validation;

// Re-export all public types
pub use types::{AppConfig, LoggingConfig, StorageConfig};

// Re-export utilities
pub use validation::ensure_directories;
