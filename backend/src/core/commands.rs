//! Core Tauri commands
//! 
//! App settings management and storage commands

use tauri::State;
use crate::AppState;
use super::components::settings::{get_app_settings_handler, update_setting_handler, update_settings_handler, AppSettingsDto, UpdateSettingInput};
use super::components::storage::{
    get_storage_stats, backup_database, restore_database, list_backups, delete_backup,
    export_data, import_data,
    StorageStats, BackupInfo, ExportInfo, ImportSummary
};

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

// ============================================================================
// Storage Commands
// ============================================================================

/// Get storage statistics including data, logs, cache, and backup sizes
#[tauri::command]
pub fn get_storage_statistics(state: State<'_, AppState>) -> Result<StorageStats, String> {
    get_storage_stats(&state.config.storage)
        .map_err(|e| e.to_string())
}

/// Create a backup of the database
#[tauri::command]
pub async fn create_database_backup(state: State<'_, AppState>) -> Result<BackupInfo, String> {
    backup_database(&state.db, &state.config.storage)
        .await
        .map_err(|e| e.to_string())
}

/// Restore database from a backup file
#[tauri::command]
pub async fn restore_database_from_backup(
    backup_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    restore_database(&state.db, &backup_path, &state.config.storage)
        .await
        .map_err(|e| e.to_string())
}

/// List all available database backups
#[tauri::command]
pub fn list_database_backups(state: State<'_, AppState>) -> Result<Vec<BackupInfo>, String> {
    list_backups(&state.config.storage)
        .map_err(|e| e.to_string())
}

/// Delete a specific backup file
#[tauri::command]
pub async fn delete_database_backup(
    backup_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_backup(&state.config.storage, &backup_path)
        .await
        .map_err(|e| e.to_string())
}

/// Export all data to JSON file
#[tauri::command]
pub async fn export_database(state: State<'_, AppState>) -> Result<ExportInfo, String> {
    export_data(&state.db, &state.config.storage)
        .await
        .map_err(|e| e.to_string())
}

/// Import data from JSON file
#[tauri::command]
pub async fn import_database(
    import_path: String,
    state: State<'_, AppState>,
) -> Result<ImportSummary, String> {
    import_data(&state.db, &import_path)
        .await
        .map_err(|e| e.to_string())
}
