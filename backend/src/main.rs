// Core infrastructure
mod core;

// Domain modules
mod notes;
mod research;
mod system;
mod writing;
mod util;
mod connectors;

use sea_orm::DatabaseConnection;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;
use tauri::{async_runtime, Manager, WindowEvent};
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use reqwest::Client;

// Import Tauri command handlers from domain command modules
use core::commands::{
    get_app_settings, update_setting, update_settings,
    get_storage_statistics, create_database_backup, restore_database_from_backup, list_database_backups,
    delete_database_backup, export_database, import_database, cleanup_logs, cleanup_news,
    get_application_logs, get_application_log_stats, export_application_logs, clear_application_logs,
    check_setup_status_command, generate_master_key_command, save_setup_config_command,
    get_current_user,
};
use writing::commands::{
    list_ideas, get_idea, create_idea, create_idea_for_article,
    update_idea_metadata, update_idea_notes, update_idea_article, archive_idea,
    open_article_modal, add_highlight,
    list_idea_references, add_reference_to_idea, remove_reference, update_reference_notes,
    // Knowledge Graph commands
    kg_list_references, kg_get_reference, kg_create_reference, kg_update_reference, kg_delete_reference,
    kg_list_writings, kg_get_writing, kg_create_writing, kg_update_writing, kg_publish_writing, kg_delete_writing,
    kg_link_idea_reference, kg_unlink_idea_reference, kg_list_references_for_idea, kg_list_ideas_for_reference,
    kg_link_writing_idea, kg_unlink_writing_idea, kg_list_ideas_for_writing, kg_list_writings_for_idea,
    kg_list_notes_for_entity, kg_get_note, kg_create_note, kg_update_note, kg_delete_note,
    // Writing System (TipTap JSON + Draft Management)
    writing_create, writing_get, writing_list, writing_update_meta, writing_save_draft,
    writing_publish, writing_link_idea, writing_unlink_idea, writing_list_linked_ideas,
};
use research::commands::{
    get_news_settings, save_news_settings, list_news_articles, get_news_article, clear_news_articles,
    dismiss_news_article, toggle_star_news_article, mark_news_article_read,
    sync_news_now, sync_news_sources_now, list_news_sources,
    // Feed source management
    list_feed_sources, get_feed_source, create_feed_source, update_feed_source,
    delete_feed_source, toggle_feed_source, test_feed_source_connection,
    sync_feed_source_now, sync_all_feed_sources,
    research_list_accounts, research_upsert_account, research_update_account, research_delete_account, research_test_account,
    research_list_streams, research_upsert_stream, research_delete_stream, research_sync_stream_now,
    research_list_items, research_set_item_status, research_convert_to_reference, research_publish,
    research_open_cockpit, research_close_cockpit, research_open_detached_cockpit,
    research_set_cockpit_bounds, resize_research_cockpit,
};
use system::commands::{get_task_history, list_system_tasks, run_system_task_now, update_system_task};
use util::commands::{
    get_system_user, log_frontend_error, get_mixed_feed, get_upcoming_events,
    list_scheduled_jobs, sync_calendar,
};
use notes::commands::{
    notes_get_or_create, notes_upsert, notes_append_snippet,
};

// Import scheduler start function
use system::scheduler::start_scheduler;

#[derive(Clone)]
pub struct CockpitBoundsState {
    pub window_label: String,
    pub panes: HashMap<String, (f64, f64, f64, f64)>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub running: Arc<Mutex<HashSet<i64>>>,
    pub config: Arc<core::config::AppConfig>,
    pub http_client: Client,
    pub cockpit_bounds: Arc<StdMutex<Option<CockpitBoundsState>>>,
}

// ========== Main Application Setup ==========

fn main() {
    // Perform first-run setup (creates ~/.cockpit, generates master key, etc.)
    let is_first_run = match core::components::setup::ensure_first_run_setup() {
        Ok(first_run) => first_run,
        Err(e) => {
            eprintln!("❌ Failed to initialize Cockpit: {}", e);
            eprintln!("Please check permissions and try again.");
            std::process::exit(1);
        }
    };
    
    // Load .env file from ~/.cockpit first (for production) or current directory (for development)
    if let Some(home) = dirs::home_dir() {
        let prod_env = home.join(".cockpit/.env");
        if prod_env.exists() {
            let _ = dotenvy::from_path(&prod_env);
        }
    }
    // Fallback to current directory .env for development
    let _ = dotenvy::dotenv();
    
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
            
            // Initialize default settings on first run
            if is_first_run {
                info!(target: "setup", "First run detected, initializing default settings...");
                async_runtime::block_on(async {
                    if let Err(e) = core::components::setup::initialize_default_settings(&db).await {
                        warn!(target: "setup", "Failed to initialize default settings: {}", e);
                        // Don't fail startup - settings can be created manually
                    }
                });
            }
            
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
                cockpit_bounds: Arc::new(StdMutex::new(None)),
            };
            app.manage(state);
            if let Some(window) = app.get_window("main") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if matches!(
                        event,
                        WindowEvent::Resized(_)
                            | WindowEvent::ScaleFactorChanged { .. }
                            | WindowEvent::Moved(_)
                    ) {
                        let _ = resize_research_cockpit(&handle);
                    }
                });
            }
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
            get_current_user,
            log_frontend_error,
            get_mixed_feed,
            get_upcoming_events,
            list_scheduled_jobs,
            sync_calendar,
            list_system_tasks,
            get_task_history,
            run_system_task_now,
            update_system_task,
            check_setup_status_command,
            generate_master_key_command,
            save_setup_config_command,
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
            clear_news_articles,
            dismiss_news_article,
            toggle_star_news_article,
            mark_news_article_read,
            sync_news_now,
            sync_news_sources_now,
            list_news_sources,
            // Feed source management
            list_feed_sources,
            get_feed_source,
            create_feed_source,
            update_feed_source,
            delete_feed_source,
            toggle_feed_source,
            test_feed_source_connection,
            sync_feed_source_now,
            sync_all_feed_sources,
            research_list_accounts,
            research_upsert_account,
            research_update_account,
            research_delete_account,
            research_test_account,
            research_list_streams,
            research_upsert_stream,
            research_delete_stream,
            research_sync_stream_now,
            research_list_items,
            research_set_item_status,
            research_convert_to_reference,
            research_publish,
            research_open_cockpit,
            research_close_cockpit,
            research_open_detached_cockpit,
            research_set_cockpit_bounds,
            list_ideas,
            get_idea,
            create_idea,
            create_idea_for_article,
            update_idea_metadata,
            update_idea_notes,
            update_idea_article,
            archive_idea,
            open_article_modal,
            add_highlight,
            list_idea_references,
            add_reference_to_idea,
            remove_reference,
            update_reference_notes,
            // Knowledge Graph - Reference Items
            kg_list_references,
            kg_get_reference,
            kg_create_reference,
            kg_update_reference,
            kg_delete_reference,
            // Knowledge Graph - Writings
            kg_list_writings,
            kg_get_writing,
            kg_create_writing,
            kg_update_writing,
            kg_publish_writing,
            kg_delete_writing,
            // Knowledge Graph - Links
            kg_link_idea_reference,
            kg_unlink_idea_reference,
            kg_list_references_for_idea,
            kg_list_ideas_for_reference,
            kg_link_writing_idea,
            kg_unlink_writing_idea,
            kg_list_ideas_for_writing,
            kg_list_writings_for_idea,
            // Knowledge Graph - Notes
            kg_list_notes_for_entity,
            kg_get_note,
            kg_create_note,
            kg_update_note,
            kg_delete_note,
            // Notes Feature
            notes_get_or_create,
            notes_upsert,
            notes_append_snippet,
            // Writing System (TipTap JSON + Draft Management)
            writing_create,
            writing_get,
            writing_list,
            writing_update_meta,
            writing_save_draft,
            writing_publish,
            writing_link_idea,
            writing_unlink_idea,
            writing_list_linked_ideas
        ])
        .run(tauri::generate_context!())
        .expect("error while running Architect Cockpit backend");
}
