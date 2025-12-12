//! Core Tauri commands
//! 
//! App settings management commands

use tauri::State;
use crate::AppState;
use super::components::settings::{get_app_settings_handler, update_setting_handler, update_settings_handler, AppSettingsDto, UpdateSettingInput};

/// Get all application settings grouped by category
#[tauri::command]
pub async fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettingsDto, String> {
    get_app_settings_handler(&state.db)
        .await
        .map_err(|e| e.to_string())
}

/// Update a single application setting
#[tauri::command]
pub async fn update_setting(
    input: UpdateSettingInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_setting_handler(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

/// Update multiple application settings
#[tauri::command]
pub async fn update_settings(
    inputs: Vec<UpdateSettingInput>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_settings_handler(&state.db, inputs)
        .await
        .map_err(|e| e.to_string())
}
