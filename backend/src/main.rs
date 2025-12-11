mod config;
mod crypto;
mod db;
mod errors;
mod news_articles;
mod news_settings;
mod system_task_runs;
mod system_tasks;
mod scheduler;
mod news;
mod news_sources;
mod logging;

use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{async_runtime, Manager, State};
use tokio::sync::Mutex;
use sea_orm::DatabaseConnection;

use scheduler::{start_scheduler, SystemTaskDto};
use news::{NewsArticleDto, SaveNewsSettingsInput, NewsSettingsDto, NewsSourceDto};
use errors::AppError;
use news::{list_news_articles_handler, dismiss_news_article_handler, save_news_settings_handler, get_news_settings_handler, sync_news_now_handler, toggle_star_news_article_handler};

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
#[serde(rename_all = "snake_case")]
enum IdeaStatus {
    Inbox,
    Planned,
    Drafting,
    Archived,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ArticleIdea {
    id: u32,
    title: String,
    notes: Option<String>,
    source_url: Option<String>,
    status: IdeaStatus,
    created_at: String,
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
}

#[tauri::command]
fn get_system_user() -> String {
    whoami::username()
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
fn list_article_ideas(_status: Option<String>) -> Vec<ArticleIdea> {
    vec![ArticleIdea {
        id: 1,
        title: "Build a moderator autopilot".into(),
        notes: Some("Blend Reddit mod actions with calendar events".into()),
        source_url: None,
        status: IdeaStatus::Inbox,
        created_at: chrono::Utc::now().to_rfc3339(),
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
    scheduler::list_system_tasks_handler(&state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_system_task_now(task_type: String, state: State<'_, AppState>, app: tauri::AppHandle) -> Result<scheduler::RunTaskNowResult, String> {
    scheduler::run_system_task_now_handler(task_type, &state, &app).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_system_task(task_type: String, input: scheduler::UpdateTaskInput, state: State<'_, AppState>) -> Result<SystemTaskDto, String> {
    scheduler::update_system_task_handler(task_type, input, &state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_news_settings(state: State<'_, AppState>) -> Result<NewsSettingsDto, String> {
    get_news_settings_handler(&state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_news_settings(input: SaveNewsSettingsInput, state: State<'_, AppState>) -> Result<NewsSettingsDto, String> {
    save_news_settings_handler(input, &state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_news_articles(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NewsArticleDto>, String> {
    list_news_articles_handler(status, limit, offset, include_dismissed, search, &state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn dismiss_news_article(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    dismiss_news_article_handler(id, &state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_star_news_article(id: i64, starred: bool, state: State<'_, AppState>) -> Result<(), String> {
    toggle_star_news_article_handler(id, starred, &state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn sync_news_now(state: State<'_, AppState>) -> Result<scheduler::RunTaskNowResult, String> {
    sync_news_now_handler(&state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn sync_news_sources_now(state: State<'_, AppState>) -> Result<scheduler::RunTaskNowResult, String> {
    news::sync_news_sources_now_handler(&state).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_news_sources(country: Option<String>, language: Option<String>, search: Option<String>, state: State<'_, AppState>) -> Result<Vec<NewsSourceDto>, String> {
    news::list_news_sources_handler(country, language, search, &state).await.map_err(|e| e.to_string())
}

fn main() {
    config::load_env();
    logging::init_logging();
    tauri::Builder::default()
        .setup(|app| {
            let db = async_runtime::block_on(async { db::init_db_from_env().await })
                .map_err(|e| tauri::Error::Setup((Box::new(e) as Box<dyn std::error::Error>).into()))?;
            let state = AppState {
                db,
                running: Arc::new(Mutex::new(HashSet::new())),
            };
            app.manage(state);
            let handle = app.handle().clone();
            async_runtime::spawn(async move {
                if let Err(err) = start_scheduler(handle.clone()).await {
                    eprintln!("[scheduler] failed to start: {err}");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_user,
            get_mixed_feed,
            get_upcoming_events,
            list_article_ideas,
            list_scheduled_jobs,
            sync_calendar,
            list_system_tasks,
            run_system_task_now,
            update_system_task,
            get_news_settings,
            save_news_settings,
            list_news_articles,
            dismiss_news_article,
            toggle_star_news_article,
            sync_news_now,
            sync_news_sources_now,
            list_news_sources
        ])
        .run(tauri::generate_context!())
        .expect("error while running Architect Cockpit backend");
}
