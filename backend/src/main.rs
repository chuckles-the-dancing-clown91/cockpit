// Core infrastructure
mod core;

// Domain modules
mod research;
mod system;
mod writing;
mod util;

use sea_orm::DatabaseConnection;
use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use tauri::{async_runtime, Manager};
use tokio::sync::Mutex;
use tracing::{error, warn};
use reqwest::Client;

// Import Tauri command handlers from domain command modules
use core::commands::{
    get_app_settings, update_setting, update_settings,
    get_storage_statistics, create_database_backup, restore_database_from_backup, list_database_backups,
    delete_database_backup, export_database, import_database, cleanup_logs, cleanup_news,
    get_application_logs, get_application_log_stats, export_application_logs, clear_application_logs,
};
use writing::commands::{
    list_ideas, get_idea, create_idea, create_idea_for_article,
    update_idea_metadata, update_idea_notes, update_idea_article, archive_idea,
};
use research::commands::{
    get_news_settings, save_news_settings, list_news_articles, get_news_article,
    dismiss_news_article, toggle_star_news_article, mark_news_article_read,
    sync_news_now, sync_news_sources_now, list_news_sources,
};
use system::commands::{list_system_tasks, run_system_task_now, update_system_task};
use util::commands::{
    get_system_user, log_frontend_error, get_mixed_feed, get_upcoming_events,
    list_scheduled_jobs, sync_calendar,
};

// Import scheduler start function
use system::scheduler::start_scheduler;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub running: Arc<Mutex<HashSet<i64>>>,
    pub config: Arc<core::config::AppConfig>,
    pub http_client: Client,
}

// ========== Main Application Setup ==========

fn main() {
    // Load and validate configuration
    let config = match core::config::AppConfig::from_env() {
        Ok(cfg) => cfg,
        Err(e) => {
            error!(target: "config", "Configuration error: {}. Please check your .env file or environment variables.", e);
            std::process::exit(1);
        }
    };
    
    // Ensure required directories exist
    if let Err(e) = core::config::ensure_directories(&config) {
        error!(target: "storage", "Failed to create directories: {}", e);
        std::process::exit(1);
    }
    
    core::logging::init_logging(&config.logging);
    
    // Initialize storage management
    if let Err(e) = core::storage::initialize_storage(&config) {
        warn!(target: "storage", "Storage initialization warning: {}", e);
        // Don't exit - this is not critical
    }
    let config_arc = Arc::new(config);
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let db =
                async_runtime::block_on(async { core::db::init_db_from_env().await }).map_err(|e| {
                    tauri::Error::Setup((Box::new(e) as Box<dyn std::error::Error>).into())
                })?;
            
            // Configure shared HTTP client with connection pooling and timeouts
            let http_client = Client::builder()
                .timeout(Duration::from_secs(30))
                .connect_timeout(Duration::from_secs(10))
                .pool_max_idle_per_host(5)
                .pool_idle_timeout(Duration::from_secs(90))
                .build()
                .map_err(|e| {
                    tauri::Error::Setup((Box::new(e) as Box<dyn std::error::Error>).into())
                })?;
            
            let state = AppState {
                db,
                running: Arc::new(Mutex::new(HashSet::new())),
                config: config_arc.clone(),
                http_client,
            };
            app.manage(state);
            let handle = app.handle().clone();
            async_runtime::spawn(async move {
                if let Err(err) = start_scheduler(handle.clone()).await {
                    error!(target: "scheduler", "Failed to start: {}", err);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_user,
            log_frontend_error,
            get_mixed_feed,
            get_upcoming_events,
            list_scheduled_jobs,
            sync_calendar,
            list_system_tasks,
            run_system_task_now,
            update_system_task,
            get_app_settings,
            update_setting,
            update_settings,
            get_storage_statistics,
            create_database_backup,
            restore_database_from_backup,
            list_database_backups,
            delete_database_backup,
            export_database,
            import_database,
            cleanup_logs,
            cleanup_news,
            get_application_logs,
            get_application_log_stats,
            export_application_logs,
            clear_application_logs,
            get_news_settings,
            save_news_settings,
            list_news_articles,
            get_news_article,
            dismiss_news_article,
            toggle_star_news_article,
            mark_news_article_read,
            sync_news_now,
            sync_news_sources_now,
            list_news_sources,
            list_ideas,
            get_idea,
            create_idea,
            create_idea_for_article,
            update_idea_metadata,
            update_idea_notes,
            update_idea_article,
            archive_idea
        ])
        .run(tauri::generate_context!())
        .expect("error while running Architect Cockpit backend");
}
