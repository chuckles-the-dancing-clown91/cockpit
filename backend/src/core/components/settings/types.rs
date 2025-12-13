//! Type definitions for app settings
//!
//! Defines DTOs and input structures for settings management.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// DTO for app settings grouped by category
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsDto {
    pub general: HashMap<String, SettingValue>,
    pub news: HashMap<String, SettingValue>,
    pub writing: HashMap<String, SettingValue>,
    pub appearance: HashMap<String, SettingValue>,
    pub advanced: HashMap<String, SettingValue>,
}

/// Individual setting value with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingValue {
    pub value: serde_json::Value,
    pub value_type: String,
    pub description: Option<String>,
}

/// Input for updating a single setting
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingInput {
    pub key: String,
    pub value: serde_json::Value,
}
