//! Validation logic for app settings
//!
//! Provides business rules validation for setting values based on
//! their key, type, and category.

use crate::core::components::errors::AppError;
use tracing::{error, info, instrument};

/// Validate setting value based on key and category
///
/// Applies business logic validation rules for specific settings.
#[instrument(skip(value), fields(key = %key, value_type = %value_type))]
pub(crate) fn validate_setting_value(
    key: &str,
    value: &serde_json::Value,
    value_type: &str,
    category: &str,
) -> Result<(), AppError> {
    info!(key = %key, category = %category, "Validating setting value");

    // Type-specific validation
    match value_type {
        "number" => {
            let num = value
                .as_f64()
                .or(value.as_i64().map(|i| i as f64))
                .ok_or_else(|| AppError::validation("value", "Expected number value"))?;

            // Specific validation rules
            match key {
                "news.fetch_interval_minutes" => {
                    if !(5.0..=1440.0).contains(&num) {
                        error!(key = %key, value = num, "Invalid fetch interval (must be 5-1440 minutes)");
                        return Err(AppError::validation(
                            "value",
                            "Fetch interval must be between 5 minutes and 24 hours",
                        ));
                    }
                    info!(key = %key, value = num, "Fetch interval validated");
                }
                "news.max_articles_per_fetch" => {
                    if !(1.0..=200.0).contains(&num) {
                        error!(key = %key, value = num, "Invalid max articles (must be 1-200)");
                        return Err(AppError::validation(
                            "value",
                            "Max articles must be between 1 and 200",
                        ));
                    }
                    info!(key = %key, value = num, "Max articles validated");
                }
                "storage.max_size_mb" => {
                    if !(10.0..=10240.0).contains(&num) {
                        error!(key = %key, value = num, "Invalid storage size (must be 10-10240 MB)");
                        return Err(AppError::validation(
                            "value",
                            "Storage size must be between 10 MB and 10 GB",
                        ));
                    }
                    info!(key = %key, value = num, "Storage size validated");
                }
                "storage.log_retention_days" => {
                    if !(1.0..=365.0).contains(&num) {
                        error!(key = %key, value = num, "Invalid retention days (must be 1-365)");
                        return Err(AppError::validation(
                            "value",
                            "Log retention must be between 1 and 365 days",
                        ));
                    }
                    info!(key = %key, value = num, "Log retention validated");
                }
                _ => {}
            }
        }
        "boolean" => {
            if value.as_bool().is_none() {
                error!(key = %key, "Invalid boolean value");
                return Err(AppError::validation("value", "Expected boolean value"));
            }
        }
        _ => {}
    }

    info!(key = %key, "Setting validation passed");
    Ok(())
}
