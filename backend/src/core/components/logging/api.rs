//! API call logging utilities
//!
//! Provides specialized logging for external API requests with automatic
//! sanitization and rotation management.

use super::rotation::check_and_rotate_log;
use super::sanitize::{sanitize_body, sanitize_url};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

/// Log an external API call with sanitization and rotation
///
/// Writes to api_calls.log with automatic rotation when size limit reached
pub fn log_api_call(
    name: &str,
    url: &str,
    status: reqwest::StatusCode,
    body_preview: &str,
    log_path: &PathBuf,
) {
    // Check if rotation needed (10MB default from config)
    let max_size_bytes = 10 * 1024 * 1024; // We should get this from config ideally
    check_and_rotate_log(log_path, max_size_bytes, 5);

    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let safe_url = sanitize_url(url);
        let safe_body = sanitize_body(body_preview);

        let _ = writeln!(
            f,
            "[{}] {} {} - {}",
            chrono::Utc::now().to_rfc3339(),
            name,
            status.as_u16(),
            safe_url
        );
        let _ = writeln!(f, "body: {}", safe_body);
        let _ = writeln!(f, "----------------------------------------");
    }
}
