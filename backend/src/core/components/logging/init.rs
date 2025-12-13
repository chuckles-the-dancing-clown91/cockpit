//! Logging initialization and setup
//!
//! Configures tracing-subscriber with multiple layers for app logs,
//! error logs, and optional console output. Supports both JSON and
//! human-readable formats.

use crate::core::components::config::LoggingConfig;
use std::fs;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer};

/// Initialize the logging system with configuration
///
/// Sets up:
/// - App-wide logging to app.log with rotation
/// - Error-level logging to errors.log
/// - Console output
/// - Optional JSON formatting
pub fn init_logging(config: &LoggingConfig) {
    // Ensure log directory exists
    if let Some(parent) = config.app_log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    // Set up environment filter from config
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&config.level));

    // Create file appender for app logs
    let app_file_appender = if let Some(parent) = config.app_log_path.parent() {
        if let Some(filename) = config.app_log_path.file_name() {
            RollingFileAppender::new(
                Rotation::NEVER, // We handle rotation manually
                parent,
                filename,
            )
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "app.log")
        }
    } else {
        RollingFileAppender::new(Rotation::NEVER, ".", "app.log")
    };

    if config.structured_json {
        // JSON format for machine parsing
        let app_layer = fmt::layer()
            .json()
            .with_writer(app_file_appender)
            .with_ansi(false);

        // Create separate error appender for JSON
        let error_appender = if let Some(parent) = config.error_log_path.parent() {
            if let Some(filename) = config.error_log_path.file_name() {
                RollingFileAppender::new(Rotation::NEVER, parent, filename)
            } else {
                RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
            }
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
        };

        let error_layer = fmt::layer()
            .json()
            .with_writer(error_appender)
            .with_ansi(false)
            .with_filter(EnvFilter::new("error"));

        if config.console_output {
            let console_layer = fmt::layer()
                .json()
                .with_writer(std::io::stdout)
                .with_ansi(false);

            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .with(console_layer)
                .init();
        } else {
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .init();
        }
    } else {
        // Human-readable format
        let app_layer = fmt::layer()
            .with_writer(app_file_appender)
            .with_ansi(false);

        // Create separate error appender for text
        let error_appender = if let Some(parent) = config.error_log_path.parent() {
            if let Some(filename) = config.error_log_path.file_name() {
                RollingFileAppender::new(Rotation::NEVER, parent, filename)
            } else {
                RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
            }
        } else {
            RollingFileAppender::new(Rotation::NEVER, ".", "errors.log")
        };

        let error_layer = fmt::layer()
            .with_writer(error_appender)
            .with_ansi(false)
            .with_filter(EnvFilter::new("error"));

        if config.console_output {
            let console_layer = fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(true);

            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .with(console_layer)
                .init();
        } else {
            tracing_subscriber::registry()
                .with(filter)
                .with(app_layer)
                .with(error_layer)
                .init();
        }
    }
}
