use crate::crypto;
use crate::errors::AppError;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
    QueryFilter,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
pub async fn get_app_settings_handler(db: &DatabaseConnection) -> Result<AppSettingsDto, AppError> {
    tracing::info!("Fetching app settings from database");
    let settings = AppSettings::find()
        .all(db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch settings from database: {}", e);
            AppError::database(e.to_string())
        })?;
    
    tracing::info!("Found {} settings", settings.len());

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
                    Ok(decrypted) => value_str = decrypted,
                    Err(e) => {
                        tracing::warn!("Failed to decrypt setting {}: {}", setting.key, e);
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

/// Update a single setting
pub async fn update_setting_handler(
    db: &DatabaseConnection,
    input: UpdateSettingInput,
) -> Result<(), AppError> {
    // Find existing setting
    let existing = AppSettings::find()
        .filter(entities::Column::Key.eq(&input.key))
        .one(db)
        .await
        .map_err(|e| AppError::database(e.to_string()))?
        .ok_or_else(|| AppError::validation("key", format!("Setting '{}' not found", input.key)))?;

    // Convert value to string based on type
    let value_str = match existing.value_type.as_str() {
        "boolean" => input.value.as_bool().map(|b| b.to_string()),
        "number" => input.value.as_f64().or(input.value.as_i64().map(|i| i as f64)).map(|n| n.to_string()),
        "json" => Some(serde_json::to_string(&input.value).unwrap_or_default()),
        _ => input.value.as_str().map(|s| s.to_string()),
    }
    .ok_or_else(|| AppError::validation("value", format!("Invalid value type for setting '{}'", input.key)))?;

    // Encrypt if needed
    let final_value = if existing.is_encrypted == 1 && !value_str.is_empty() {
        let encrypted = crypto::encrypt_api_key(&value_str)
            .map_err(|e| AppError::other(format!("Encryption failed: {}", e)))?;
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, encrypted)
    } else {
        value_str
    };

    // Update the setting
    let mut active = existing.into_active_model();
    active.value = ActiveValue::Set(final_value);
    active.updated_at = ActiveValue::Set(chrono::Utc::now().to_rfc3339());

    active
        .update(db)
        .await
        .map_err(|e| AppError::database(e.to_string()))?;

    Ok(())
}

/// Update multiple settings at once
pub async fn update_settings_handler(
    db: &DatabaseConnection,
    inputs: Vec<UpdateSettingInput>,
) -> Result<(), AppError> {
    for input in inputs {
        update_setting_handler(db, input).await?;
    }
    Ok(())
}
