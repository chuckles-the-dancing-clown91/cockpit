//! Log file rotation utilities
//!
//! Handles size-based log rotation, timestamp naming, and cleanup
//! of old rotated files to prevent unbounded disk usage.

use std::fs;
use std::path::Path;

/// Check file size and rotate if needed
pub(crate) fn check_and_rotate_log(log_path: &Path, max_size_bytes: u64, max_files: usize) {
    if let Ok(metadata) = fs::metadata(log_path) {
        if metadata.len() >= max_size_bytes {
            rotate_log_file(log_path, max_files);
        }
    }
}

/// Rotate log file by renaming it with timestamp and removing old files
fn rotate_log_file(log_path: &Path, max_files: usize) {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let rotated_name = format!(
        "{}.{}",
        log_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy(),
        timestamp
    );

    if let Some(parent) = log_path.parent() {
        let rotated_path = parent.join(&rotated_name);
        let _ = fs::rename(log_path, &rotated_path);

        // Clean up old rotated files
        cleanup_old_rotated_logs(parent, log_path, max_files);
    }
}

/// Remove oldest rotated log files, keeping only max_files
fn cleanup_old_rotated_logs(dir: &Path, base_log_path: &Path, max_files: usize) {
    let base_name = base_log_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    if let Ok(entries) = fs::read_dir(dir) {
        let mut rotated_files: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name();
                let name_str = name.to_string_lossy();
                name_str.starts_with(base_name)
                    && name_str.contains('.')
                    && e.path() != base_log_path
            })
            .collect();

        // Sort by modified time, oldest first
        rotated_files.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());

        // Remove oldest files if we exceed max_files
        if rotated_files.len() > max_files {
            for entry in rotated_files.iter().take(rotated_files.len() - max_files) {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
}
