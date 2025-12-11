mod config;
mod crypto;
mod db;
mod errors;
mod ideas;
mod logging;
mod news;
mod news_articles;
mod news_settings;
mod news_sources;
mod scheduler;
mod system_task_runs;
mod system_tasks;

use sea_orm::DatabaseConnection;
use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{async_runtime, Manager, State};
use tokio::sync::Mutex;

use errors::AppError;
use ideas::{
    archive_idea_handler, create_idea_for_article_handler, create_idea_handler, get_idea_handler,
    list_ideas_handler, update_idea_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler, IdeaDto,
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

#[tauri::command]
async fn list_ideas(
    status: Option<String>,
    include_removed: bool,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaDto>, String> {
    list_ideas_handler(status, include_removed, search, limit, offset, &state)
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
    title: String,
    summary: Option<String>,
    news_article_id: Option<i64>,
    target: Option<String>,
    initial_status: Option<String>,
    tags: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_handler(
        title,
        summary,
        news_article_id,
        target,
        initial_status,
        tags,
        &state,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_idea_for_article(
    article_id: i64,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_for_article_handler(article_id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_metadata(
    id: i64,
    title: Option<String>,
    summary: Option<String>,
    status: Option<String>,
    target: Option<String>,
    tags: Option<Vec<String>>,
    priority: Option<i64>,
    is_pinned: Option<bool>,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_metadata_handler(
        id, title, summary, status, target, tags, priority, is_pinned, &state,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_notes(
    id: i64,
    notes_markdown: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_idea_notes_handler(id, notes_markdown, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_idea_article(
    id: i64,
    article_title: Option<String>,
    article_markdown: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    update_idea_article_handler(id, article_title, article_markdown, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn archive_idea(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    archive_idea_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    config::load_env();
    logging::init_logging();
    tauri::Builder::default()
        .setup(|app| {
            let db =
                async_runtime::block_on(async { db::init_db_from_env().await }).map_err(|e| {
                    tauri::Error::Setup((Box::new(e) as Box<dyn std::error::Error>).into())
                })?;
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
            list_scheduled_jobs,
            sync_calendar,
            list_system_tasks,
            run_system_task_now,
            update_system_task,
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
