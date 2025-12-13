//! Configuration validation and directory setup utilities
//!
//! Provides helper functions to ensure the filesystem is properly configured
//! before the application starts.

use super::types::AppConfig;
use crate::core::components::errors::AppError;

/// Helper to validate and create required directories
pub fn ensure_directories(config: &AppConfig) -> Result<(), AppError> {
    let dirs = vec![
        &config.storage.root,
        &config.storage.data_dir,
        &config.storage.logs_dir,
        &config.storage.cache_dir,
        &config.storage.backup_dir,
        &config.storage.export_dir,
    ];

    for dir in dirs {
        std::fs::create_dir_all(dir)?;
    }

    Ok(())
}
