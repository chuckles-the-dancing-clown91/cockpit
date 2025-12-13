//! Utility functions for log maintenance
//!
//! Provides periodic maintenance operations like checking rotation
//! for all log files.

use crate::core::components::config::LoggingConfig;
use super::rotation::check_and_rotate_log;

/// Check all log files and rotate if needed
///
/// Should be called periodically or before writing to ensure logs don't grow unbounded
#[allow(dead_code)]
pub fn check_log_rotation(config: &LoggingConfig) {
    let max_size_bytes = config.max_file_size_mb * 1024 * 1024;

    check_and_rotate_log(&config.app_log_path, max_size_bytes, config.max_files);
    check_and_rotate_log(&config.api_log_path, max_size_bytes, config.max_files);
    check_and_rotate_log(&config.error_log_path, max_size_bytes, config.max_files);
}
