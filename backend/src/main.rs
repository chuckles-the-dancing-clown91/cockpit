mod config;
mod crypto;
mod db;
mod db_backup;
mod errors;
mod ideas;
mod logging;
mod migrations;
mod news;
mod news_articles;
mod news_settings;
mod news_sources;
mod scheduler;
mod settings;
mod storage;
mod system_task_runs;
mod system_tasks;

use sea_orm::DatabaseConnection;
use serde::Serialize;
use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use tauri::{async_runtime, Manager, State};
use tokio::sync::Mutex;
use tracing::{error, warn};
use reqwest::Client;

use ideas::{
    archive_idea_handler, create_idea_for_article_handler, create_idea_handler, get_idea_handler,
    list_ideas_handler, update_idea_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler, CreateIdeaForArticleInput, CreateIdeaInput, IdeaDto,
    UpdateIdeaArticleInput, UpdateIdeaMetadataInput, UpdateIdeaNotesInput,
};
use settings::{
    get_app_settings_handler, update_setting_handler, update_settings_handler,
    AppSettingsDto, UpdateSettingInput,
};
use news::{
    dismiss_news_article_handler, get_news_article_handler, get_news_settings_handler,
    list_news_articles_handler, mark_news_article_read_handler, save_news_settings_handler,
    sync_news_now_handler, toggle_star_news_article_handler,
};
use news::{NewsArticleDto, NewsSettingsDto, NewsSourceDto, SaveNewsSettingsInput};
use scheduler::{start_scheduler, SystemTaskDto};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FeedItem {
    id: String,
    provider: String,
    title: String,
    summary: Option<String>,
    url: Option<String>,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarEvent {
    id: String,
    title: String,
    start_time: String,
    end_time: String,
    all_day: Option<bool>,
    location: Option<String>,
}

#[derive(Serialize)]
struct ScheduledJobStub {
    id: u32,
    job_type: String,
    payload: String,
    status: String,
    run_at: Option<String>,
    last_run_at: Option<String>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub running: Arc<Mutex<HashSet<i64>>>,
    pub config: Arc<config::AppConfig>,
    pub http_client: Client,
}

/// Get the current system username
/// 
/// Returns the username of the user running the application.
/// Used for display purposes in the UI.
#[tauri::command]
fn get_system_user() -> String {
    whoami::username()
}

/// Log frontend errors to backend tracing system
/// 
/// Allows the frontend to send errors to the backend for centralized logging.
/// Supports different severity levels: critical, error, warning, info.
/// 
/// # Parameters
/// - `message`: Error message
/// - `stack`: JavaScript stack trace
/// - `component_stack`: React component stack (if available)
/// - `action`: User action that triggered the error
/// - `metadata`: Additional context (JSON string)
/// - `severity`: Error severity (critical, error, warning, info)
/// - `timestamp`: ISO 8601 timestamp from frontend
#[tauri::command]
fn log_frontend_error(
    message: String,
    stack: String,
    component_stack: String,
    action: Option<String>,
    metadata: Option<String>,
    severity: Option<String>,
    timestamp: String,
) {
    let severity_level = severity.unwrap_or_else(|| "error".to_string());
    
    match severity_level.as_str() {
        "critical" => tracing::error!(
            "[FRONTEND] {} | action={} | time={}",
            message,
            action.unwrap_or_default(),
            timestamp
        ),
        "error" => tracing::error!(
            "[FRONTEND] {} | action={} | time={}",
            message,
            action.unwrap_or_default(),
            timestamp
        ),
        "warning" => tracing::warn!(
            "[FRONTEND] {} | action={} | time={}",
            message,
            action.unwrap_or_default(),
            timestamp
        ),
        _ => tracing::info!(
            "[FRONTEND] {} | action={} | time={}",
            message,
            action.unwrap_or_default(),
            timestamp
        ),
    }
    
    // Log stack trace if available
    if !stack.is_empty() {
        tracing::debug!("Stack trace: {}", stack);
    }
    
    // Log component stack if available
    if !component_stack.is_empty() {
        tracing::debug!("Component stack: {}", component_stack);
    }
    
    // Log metadata if available
    if let Some(meta) = metadata {
        if !meta.is_empty() {
            tracing::debug!("Metadata: {}", meta);
        }
    }
}

#[tauri::command]
fn get_mixed_feed(_params: Option<serde_json::Value>) -> Vec<FeedItem> {
    vec![FeedItem {
        id: "mock-1".into(),
        provider: "reddit".into(),
        title: "Reddit systems check ready".into(),
        summary: Some("Quick status digest from your favorite subs.".into()),
        url: Some("https://reddit.com".into()),
        created_at: chrono::Utc::now().to_rfc3339(),
    }]
}

#[tauri::command]
fn get_upcoming_events(_horizon_minutes: Option<i64>) -> Vec<CalendarEvent> {
    vec![CalendarEvent {
        id: "evt-1".into(),
        title: "Mission planning sync".into(),
        start_time: chrono::Utc::now().to_rfc3339(),
        end_time: (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339(),
        all_day: Some(false),
        location: Some("Ops room".into()),
    }]
}

#[tauri::command]
fn list_scheduled_jobs() -> Vec<ScheduledJobStub> {
    vec![ScheduledJobStub {
        id: 1,
        job_type: "calendar_alert".into(),
        payload: "Mock alert to keep the UI alive".into(),
        status: "active".into(),
        run_at: Some((chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339()),
        last_run_at: None,
    }]
}

#[tauri::command]
fn sync_calendar() -> Result<(), String> {
    println!("Calendar sync requested (stub)");
    Ok(())
}

#[tauri::command]
async fn list_system_tasks(state: State<'_, AppState>) -> Result<Vec<SystemTaskDto>, String> {
    scheduler::list_system_tasks_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_system_task_now(
    task_type: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<scheduler::RunTaskNowResult, String> {
    scheduler::run_system_task_now_handler(task_type, &state, &app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_system_task(
    task_type: String,
    input: scheduler::UpdateTaskInput,
    state: State<'_, AppState>,
) -> Result<SystemTaskDto, String> {
    scheduler::update_system_task_handler(task_type, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_news_settings(state: State<'_, AppState>) -> Result<NewsSettingsDto, String> {
    get_news_settings_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_news_settings(
    input: SaveNewsSettingsInput,
    state: State<'_, AppState>,
) -> Result<NewsSettingsDto, String> {
    save_news_settings_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

/// List news articles with filtering and pagination
/// 
/// # Parameters
/// - `status`: Filter by read status ("unread", "read", "all")
/// - `limit`: Max number of results (default: 50)
/// - `offset`: Pagination offset (default: 0)
/// - `include_dismissed`: Include dismissed articles (default: false)
/// - `search`: Text search in title/excerpt
/// 
/// # Returns
/// Paginated list of news articles sorted by published date (newest first)
#[tauri::command]
async fn list_news_articles(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NewsArticleDto>, String> {
    list_news_articles_handler(status, limit, offset, include_dismissed, search, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_news_article(id: i64, state: State<'_, AppState>) -> Result<NewsArticleDto, String> {
    get_news_article_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn dismiss_news_article(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    dismiss_news_article_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_star_news_article(
    id: i64,
    starred: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    toggle_star_news_article_handler(id, starred, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn mark_news_article_read(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    mark_news_article_read_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

/// Manually trigger news synchronization
/// 
/// Fetches latest articles from NewsData.io API based on current settings.
/// Respects daily API call limits configured in news settings.
/// 
/// # Returns
/// Task run result with inserted/updated counts and status
#[tauri::command]
async fn sync_news_now(state: State<'_, AppState>) -> Result<scheduler::RunTaskNowResult, String> {
    sync_news_now_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn sync_news_sources_now(
    state: State<'_, AppState>,
) -> Result<scheduler::RunTaskNowResult, String> {
    news::sync_news_sources_now_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_news_sources(
    country: Option<String>,
    language: Option<String>,
    search: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NewsSourceDto>, String> {
    news::list_news_sources_handler(country, language, search, &state)
        .await
        .map_err(|e| e.to_string())
}

/// List writing ideas with filtering and pagination
/// 
/// # Parameters
/// - `status`: Filter by status ("draft", "in_progress", "completed", "archived")
/// - `search`: Text search in title/summary
/// - `include_removed`: Include archived ideas (default: false)
/// - `limit`: Max number of results (default: 50)
/// - `offset`: Pagination offset (default: 0)
/// 
/// # Returns
/// Paginated list of ideas sorted by last updated (newest first)
#[tauri::command]
async fn list_ideas(
    status: Option<String>,
    search: Option<String>,
    include_removed: Option<bool>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaDto>, String> {
    list_ideas_handler(status, search, include_removed, limit, offset, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_idea(id: i64, state: State<'_, AppState>) -> Result<IdeaDto, String> {
    get_idea_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_idea(
    input: CreateIdeaInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_idea_for_article(
    input: CreateIdeaForArticleInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_for_article_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_metadata(
    id: i64,
    input: UpdateIdeaMetadataInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_metadata_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_notes(
    id: i64,
    input: UpdateIdeaNotesInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_notes_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_article(
    id: i64,
    input: UpdateIdeaArticleInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_article_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn archive_idea(id: i64, state: State<'_, AppState>) -> Result<IdeaDto, String> {
    archive_idea_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

// ===== Settings Commands =====

/// Get all application settings
/// 
/// Returns all settings as key-value pairs with proper types.
/// Settings include API keys (encrypted), theme preferences, and feature flags.
#[tauri::command]
async fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettingsDto, String> {
    get_app_settings_handler(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_setting(
    input: UpdateSettingInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_setting_handler(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_settings(
    inputs: Vec<UpdateSettingInput>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_settings_handler(&state.db, inputs)
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    // Load and validate configuration
    let config = match config::AppConfig::from_env() {
        Ok(cfg) => cfg,
        Err(e) => {
            error!(target: "config", "Configuration error: {}. Please check your .env file or environment variables.", e);
            std::process::exit(1);
        }
    };
    
    // Ensure required directories exist
    if let Err(e) = config::ensure_directories(&config) {
        error!(target: "storage", "Failed to create directories: {}", e);
        std::process::exit(1);
    }
    
    logging::init_logging(&config.logging);
    
    // Initialize storage management
    if let Err(e) = storage::initialize_storage(&config) {
        warn!(target: "storage", "Storage initialization warning: {}", e);
        // Don't exit - this is not critical
    }
    let config_arc = Arc::new(config);
    tauri::Builder::default()
        .setup(move |app| {
            let db =
                async_runtime::block_on(async { db::init_db_from_env().await }).map_err(|e| {
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
