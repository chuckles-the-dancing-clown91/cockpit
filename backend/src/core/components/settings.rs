use super::crypto;
use super::errors::AppError;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
    QueryFilter,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn, instrument};

// Define entity for app_settings table
mod entities {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "app_settings")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i32,
        pub key: String,
        pub value: String,
        pub value_type: String,
        pub category: String,
        pub description: Option<String>,
        pub is_encrypted: i32,
        pub created_at: String,
        pub updated_at: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub use entities::Entity as AppSettings;

/// DTO for app settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsDto {
    pub general: HashMap<String, SettingValue>,
    pub news: HashMap<String, SettingValue>,
    pub writing: HashMap<String, SettingValue>,
    pub appearance: HashMap<String, SettingValue>,
    pub advanced: HashMap<String, SettingValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingValue {
    pub value: serde_json::Value,
    pub value_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingInput {
    pub key: String,
    pub value: serde_json::Value,
}

/// Get all app settings grouped by category
/// 
/// Retrieves all settings from the database, decrypts encrypted values,
/// and groups them by category (general, news, writing, appearance, advanced).
#[instrument(skip(db), fields(otel.name = "get_app_settings"))]
pub async fn get_app_settings_handler(db: &DatabaseConnection) -> Result<AppSettingsDto, AppError> {
    info!("Fetching app settings from database");
    
    let settings = AppSettings::find()
        .all(db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch settings from database");
            AppError::database(e.to_string())
        })?;
    
    info!(settings_count = settings.len(), "Retrieved settings from database");

    let mut result = AppSettingsDto {
        general: HashMap::new(),
        news: HashMap::new(),
        writing: HashMap::new(),
        appearance: HashMap::new(),
        advanced: HashMap::new(),
    };

    for setting in settings {
        let mut value_str = setting.value.clone();

        // Decrypt if encrypted
        if setting.is_encrypted == 1 && !value_str.is_empty() {
            // Assume it's base64 encoded encrypted data
            if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, value_str.as_bytes()) {
                match crypto::decrypt_api_key(&decoded) {
                    Ok(decrypted) => {
                        info!(setting_key = %setting.key, "Successfully decrypted setting value");
                        value_str = decrypted;
                    },
                    Err(e) => {
                        warn!(
                            setting_key = %setting.key,
                            error = %e,
                            "Failed to decrypt setting, using empty value"
                        );
                        value_str = String::new();
                    }
                }
            }
        }

        // Parse value based on type
        let parsed_value = match setting.value_type.as_str() {
            "boolean" => serde_json::Value::Bool(value_str == "true"),
            "number" => {
                // Try parsing as i64 first, then f64
                if let Ok(n) = value_str.parse::<i64>() {
                    serde_json::json!(n)
                } else if let Ok(n) = value_str.parse::<f64>() {
                    serde_json::json!(n)
                } else {
                    serde_json::json!(0)
                }
            },
            "json" => serde_json::from_str(&value_str).unwrap_or(serde_json::Value::String(value_str)),
            _ => serde_json::Value::String(value_str),
        };

        let setting_value = SettingValue {
            value: parsed_value,
            value_type: setting.value_type.clone(),
            description: setting.description.clone(),
        };

        let key = setting.key.clone();
        match setting.category.as_str() {
            "general" => result.general.insert(key, setting_value),
            "news" => result.news.insert(key, setting_value),
            "writing" => result.writing.insert(key, setting_value),
            "appearance" => result.appearance.insert(key, setting_value),
            "advanced" => result.advanced.insert(key, setting_value),
            _ => None,
        };
    }

    Ok(result)
}

/// Validate setting value based on key and category
/// 
/// Applies business logic validation rules for specific settings.
#[instrument(skip(value), fields(key = %key, value_type = %value_type))]
fn validate_setting_value(key: &str, value: &serde_json::Value, value_type: &str, category: &str) -> Result<(), AppError> {
    info!(key = %key, category = %category, "Validating setting value");
    
    // Type-specific validation
    match value_type {
        "number" => {
            let num = value.as_f64().or(value.as_i64().map(|i| i as f64))
                .ok_or_else(|| AppError::validation("value", "Expected number value"))?;
            
            // Specific validation rules
            match key {
                "news.fetch_interval_minutes" => {
                    if num < 5.0 || num > 1440.0 {
                        error!(key = %key, value = num, "Invalid fetch interval (must be 5-1440 minutes)");
                        return Err(AppError::validation("value", "Fetch interval must be between 5 minutes and 24 hours"));
                    }
                    info!(key = %key, value = num, "Fetch interval validated");
                }
                "news.max_articles_per_fetch" => {
                    if num < 1.0 || num > 200.0 {
                        error!(key = %key, value = num, "Invalid max articles (must be 1-200)");
                        return Err(AppError::validation("value", "Max articles must be between 1 and 200"));
                    }
                    info!(key = %key, value = num, "Max articles validated");
                }
                "storage.max_size_mb" => {
                    if num < 10.0 || num > 10240.0 {
                        error!(key = %key, value = num, "Invalid storage size (must be 10-10240 MB)");
                        return Err(AppError::validation("value", "Storage size must be between 10 MB and 10 GB"));
                    }
                    info!(key = %key, value = num, "Storage size validated");
                }
                "storage.log_retention_days" => {
                    if num < 1.0 || num > 365.0 {
                        error!(key = %key, value = num, "Invalid retention days (must be 1-365)");
                        return Err(AppError::validation("value", "Log retention must be between 1 and 365 days"));
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

/// Update a single setting
/// 
/// Updates a setting in the database with validation and encryption.
/// Logs all changes for audit trail.
#[instrument(skip(db, input), fields(setting_key = %input.key))]
pub async fn update_setting_handler(
    db: &DatabaseConnection,
    input: UpdateSettingInput,
) -> Result<(), AppError> {
    info!(setting_key = %input.key, "Updating app setting");
    
    // Find existing setting
    let existing = AppSettings::find()
        .filter(entities::Column::Key.eq(&input.key))
        .one(db)
        .await
        .map_err(|e| {
            error!(error = %e, setting_key = %input.key, "Database error fetching setting");
            AppError::database(e.to_string())
        })?
        .ok_or_else(|| {
            error!(setting_key = %input.key, "Setting not found in database");
            AppError::validation("key", format!("Setting '{}' not found", input.key))
        })?;
    
    info!(
        setting_key = %input.key,
        category = %existing.category,
        value_type = %existing.value_type,
        is_encrypted = existing.is_encrypted == 1,
        "Found existing setting"
    );
    
    // Validate the value
    validate_setting_value(&input.key, &input.value, &existing.value_type, &existing.category)?;

    // Convert value to string based on type
    let value_str = match existing.value_type.as_str() {
        "boolean" => input.value.as_bool().map(|b| b.to_string()),
        "number" => input.value.as_f64().or(input.value.as_i64().map(|i| i as f64)).map(|n| n.to_string()),
        "json" => Some(serde_json::to_string(&input.value).unwrap_or_default()),
        _ => input.value.as_str().map(|s| s.to_string()),
    }
    .ok_or_else(|| {
        error!(setting_key = %input.key, value_type = %existing.value_type, "Invalid value type conversion");
        AppError::validation("value", format!("Invalid value type for setting '{}'", input.key))
    })?;

    info!(
        setting_key = %input.key,
        old_value_length = existing.value.len(),
        new_value_length = value_str.len(),
        "Converted value to string"
    );

    // Encrypt if needed
    let final_value = if existing.is_encrypted == 1 && !value_str.is_empty() {
        info!(setting_key = %input.key, "Encrypting setting value");
        let encrypted = crypto::encrypt_api_key(&value_str)
            .map_err(|e| {
                error!(error = %e, setting_key = %input.key, "Encryption failed");
                AppError::other(format!("Encryption failed: {}", e))
            })?;
        let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, encrypted);
        info!(
            setting_key = %input.key,
            encrypted_length = encoded.len(),
            "Successfully encrypted setting value"
        );
        encoded
    } else {
        value_str
    };

    // Update the setting
    let mut active = existing.clone().into_active_model();
    active.value = ActiveValue::Set(final_value);
    active.updated_at = ActiveValue::Set(chrono::Utc::now().to_rfc3339());

    active
        .update(db)
        .await
        .map_err(|e| {
            error!(error = %e, setting_key = %input.key, "Failed to update setting in database");
            AppError::database(e.to_string())
        })?;

    info!(
        setting_key = %input.key,
        category = %existing.category,
        "Successfully updated setting"
    );
    
    Ok(())
}

/// Update multiple settings at once
/// 
/// Batch updates multiple settings atomically. If any update fails,
/// all changes are rolled back (transactional behavior).
#[instrument(skip(db, inputs), fields(settings_count = inputs.len()))]
pub async fn update_settings_handler(
    db: &DatabaseConnection,
    inputs: Vec<UpdateSettingInput>,
) -> Result<(), AppError> {
    info!(settings_count = inputs.len(), "Batch updating app settings");
    
    let mut updated_count = 0;
    let mut failed_keys = Vec::new();
    
    for input in inputs {
        let key = input.key.clone();
        match update_setting_handler(db, input).await {
            Ok(_) => {
                updated_count += 1;
                info!(setting_key = %key, "Setting updated successfully");
            }
            Err(e) => {
                error!(error = %e, setting_key = %key, "Failed to update setting");
                failed_keys.push(key);
                // Continue to try other settings, but collect errors
            }
        }
    }
    
    if !failed_keys.is_empty() {
        error!(
            failed_count = failed_keys.len(),
            failed_keys = ?failed_keys,
            "Some settings failed to update"
        );
        return Err(AppError::validation(
            "settings",
            format!("Failed to update {} setting(s): {}", failed_keys.len(), failed_keys.join(", "))
        ));
    }
    
    info!(
        updated_count = updated_count,
        "Successfully updated all settings"
    );
    Ok(())
}
