//! Settings module for application configuration
//!
//! Refactored from monolithic settings.rs into:
//! - entities: Database model for app_settings table
//! - types: DTOs and input structures
//! - validation: Business rules validation
//! - handlers: Get and update operations with encryption support

pub mod entities;
pub mod handlers;
pub mod types;
pub mod validation;

// Re-export DTOs for API responses
pub use types::{AppSettingsDto, UpdateSettingInput};

// Re-export handlers for Tauri commands
pub use handlers::{get_app_settings_handler, update_setting_handler, update_settings_handler};
