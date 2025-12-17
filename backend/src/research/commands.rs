//! Research domain Tauri commands

use tauri::State;
use crate::AppState;
use super::components::feed::{
    get_news_settings_handler, save_news_settings_handler,
    list_news_articles_handler, get_news_article_handler,
    dismiss_news_article_handler, toggle_star_news_article_handler,
    mark_news_article_read_handler, sync_news_now_handler,
    sync_news_sources_now_handler, list_news_sources_handler,
    NewsArticleDto, NewsSettingsDto, SaveNewsSettingsInput, NewsSourceDto,
    // Feed source management
    list_feed_sources_handler, get_feed_source_handler,
    create_feed_source_handler, update_feed_source_handler,
    delete_feed_source_handler, toggle_feed_source_handler,
    test_feed_source_connection_handler,
    sync_feed_source_now_handler, sync_all_feed_sources_handler,
    FeedSourceDto, CreateFeedSourceInput, UpdateFeedSourceInput,
    SyncSourceResult, SyncAllResult,
};
use crate::system;

#[tauri::command]
pub async fn get_news_settings(state: State<'_, AppState>) -> Result<NewsSettingsDto, String> {
    get_news_settings_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_news_settings(
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
/// - `status`: Filter by read status ("unread", "dismissed", "ideas", "all")
/// - `limit`: Max number of results (default: 100)
/// - `offset`: Pagination offset (default: 0)
/// - `include_dismissed`: Include dismissed articles (default: false)
/// - `search`: Text search in title/excerpt/content
/// - `source_id`: Filter by feed source ID
/// - `starred`: Filter by starred status
/// - `start_date`: Filter articles published after this date (RFC3339)
/// - `end_date`: Filter articles published before this date (RFC3339)
/// - `sort_by`: Sort order ("latest", "oldest", "starred")
/// 
/// # Returns
/// Paginated list of news articles with applied filters and sorting
#[tauri::command]
pub async fn list_news_articles(
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    include_dismissed: Option<bool>,
    search: Option<String>,
    source_id: Option<i64>,
    starred: Option<bool>,
    start_date: Option<String>,
    end_date: Option<String>,
    sort_by: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NewsArticleDto>, String> {
    list_news_articles_handler(
        status,
        limit,
        offset,
        include_dismissed,
        search,
        source_id,
        starred,
        start_date,
        end_date,
        sort_by,
        &state,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_news_article(id: i64, state: State<'_, AppState>) -> Result<NewsArticleDto, String> {
    get_news_article_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn dismiss_news_article(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    dismiss_news_article_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_star_news_article(
    id: i64,
    starred: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    toggle_star_news_article_handler(id, starred, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_news_article_read(id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
pub async fn sync_news_now(state: State<'_, AppState>) -> Result<system::scheduler::RunTaskNowResult, String> {
    sync_news_now_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_news_sources_now(
    state: State<'_, AppState>,
) -> Result<system::scheduler::RunTaskNowResult, String> {
    sync_news_sources_now_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_news_sources(
    country: Option<String>,
    language: Option<String>,
    search: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NewsSourceDto>, String> {
    list_news_sources_handler(country, language, search, &state)
        .await
        .map_err(|e| e.to_string())
}

// ===== Feed Source Management Commands =====

#[tauri::command]
pub async fn list_feed_sources(state: State<'_, AppState>) -> Result<Vec<FeedSourceDto>, String> {
    list_feed_sources_handler(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_feed_source(
    source_id: i64,
    state: State<'_, AppState>,
) -> Result<FeedSourceDto, String> {
    get_feed_source_handler(&state.db, source_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_feed_source(
    input: CreateFeedSourceInput,
    state: State<'_, AppState>,
) -> Result<FeedSourceDto, String> {
    create_feed_source_handler(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_feed_source(
    source_id: i64,
    input: UpdateFeedSourceInput,
    state: State<'_, AppState>,
) -> Result<FeedSourceDto, String> {
    update_feed_source_handler(&state.db, source_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_feed_source(
    source_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_feed_source_handler(&state.db, source_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_feed_source(
    source_id: i64,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<FeedSourceDto, String> {
    toggle_feed_source_handler(&state.db, source_id, enabled)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_feed_source_connection(
    source_id: i64,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    test_feed_source_connection_handler(&state.db, &state.http_client, source_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_feed_source_now(
    source_id: i64,
    state: State<'_, AppState>,
) -> Result<SyncSourceResult, String> {
    sync_feed_source_now_handler(&state.db, &state.http_client, source_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_all_feed_sources(
    state: State<'_, AppState>,
) -> Result<SyncAllResult, String> {
    sync_all_feed_sources_handler(&state.db, &state.http_client)
        .await
        .map_err(|e| e.to_string())
}
