//! Research domain Tauri commands

use tauri::{AppHandle, State};

use crate::AppState;
use crate::research::components::cockpit::{
    CockpitBoundsInput, ResearchCockpitNavigateInput, ResearchCockpitOpenInput,
};
use crate::research::components::{cockpit, connectors};
use crate::research::components::feed::{
    clear_news_articles_handler, dismiss_news_article_handler,
    get_news_article_handler, get_news_settings_handler, list_feed_sources_handler,
    list_news_articles_handler, list_news_sources_handler, save_news_settings_handler,
    sync_all_feed_sources_handler, sync_feed_source_now_handler, sync_news_now_handler,
    sync_news_sources_now_handler, test_feed_source_connection_handler,
    toggle_star_news_article_handler, mark_news_article_read_handler,
    toggle_feed_source_handler, update_feed_source_handler,
    delete_feed_source_handler, create_feed_source_handler, get_feed_source_handler,
    NewsArticleDto, NewsSettingsDto, SaveNewsSettingsInput, NewsSourceDto,
    FeedSourceDto, CreateFeedSourceInput, UpdateFeedSourceInput,
    SyncSourceResult, SyncAllResult,
};
use crate::research::dto::{
    CreateResearchAccountInput, ListResearchItemsQuery, ResearchAccountDto,
    ResearchItemDto, ResearchStreamDto, UpdateResearchAccountInput, UpsertResearchStreamInput,
};
use crate::system;

/// Recalculate and apply cockpit webview bounds for the active cockpit window.
///
/// Resolves the cockpit window (falling back to the main window) and reapplies
/// stored logical bounds for the left/right cockpit webviews after converting
/// them to physical coordinates for the current window scale and position.
///
/// # Side effects
/// - Moves/resizes existing cockpit webviews if they belong to the resolved window.
/// - No-ops when no cockpit webviews have been created yet or when bounds have
///   not been stored for the active window.
///
/// # Errors
/// Returns an error when the cockpit window cannot be found or when applying
/// bounds to an existing webview fails.
pub fn resize_research_cockpit(app: &AppHandle) -> Result<(), String> {
    cockpit::resize_research_cockpit(app)
}

/// Persist normalized cockpit pane bounds and apply them to the target webview.
///
/// # Parameters
/// - `app`: App handle used to resolve the target window (cockpit or main).
/// - `input`: Logical bounds (`x`, `y`, `width`, `height`) in window units plus
///   optional `window_label` (defaults to the cockpit window or main) and
///   `webview_label` (defaults to the left cockpit pane).
/// - `state`: Provides shared cockpit bounds storage.
///
/// # Side effects
/// - Normalizes bounds to non-negative sizes, stores them in `AppState`, and
///   immediately resizes/repositions the addressed webview when it is attached
///   to the resolved window.
///
/// # Errors
/// - When the target window cannot be resolved.
/// - When an unsupported webview label is supplied.
/// - When persisting bounds fails or when applying bounds to an existing webview
///   fails.
#[tauri::command]
pub async fn research_set_cockpit_bounds(
    app: AppHandle,
    input: CockpitBoundsInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    cockpit::set_cockpit_bounds(&app, state.inner(), input)
}

/// Navigate an embedded cockpit webview to the requested URL.
///
/// # Parameters
/// - `app`: App handle used to resolve the cockpit (or main) host window.
/// - `input`: Target URL (scheme is added when missing), optional window label,
///   optional metadata, and an optional `webview_label` to direct traffic to a
///   specific cockpit pane (defaults to the left pane).
///
/// # Side effects
/// - Creates the target webview if it does not exist, or navigates and resizes
///   the existing webview using stored bounds for the host window.
///
/// # Errors
/// - When the cockpit window cannot be found.
/// - When the URL cannot be normalized/parsed.
/// - When an unsupported webview label is supplied or a webview attach/resize
///   operation fails.
#[tauri::command]
pub async fn research_open_cockpit(
    app: AppHandle,
    input: ResearchCockpitNavigateInput,
) -> Result<(), String> {
    cockpit::open_cockpit(&app, input)
}

/// Open (or reuse) the detached cockpit window with a routed cockpit view.
///
/// Builds the cockpit route with query params for the provided URL and metadata,
/// ensures legacy embedded cockpit panes are closed, and either emits an open
/// event to an existing detached webview window or creates a new one.
///
/// # Parameters
/// - `app`: App handle used to resolve or create the detached cockpit window.
/// - `input`: Target URL (auto-prepends `https://` when needed), optional title,
///   and related entity identifiers to embed in the cockpit route.
///
/// # Side effects
/// - Closes any legacy embedded cockpit webviews.
/// - Emits `research-cockpit-open` with navigation payload when the detached
///   window already exists and reattaches cockpit panes using stored bounds.
/// - Builds and shows a new detached cockpit window when none exists, wiring
///   resize listeners to keep panes in sync.
///
/// # Errors
/// - When the target URL is invalid.
/// - When the cockpit route cannot be built.
/// - When creating or showing the detached window or its child webviews fails.
#[tauri::command]
pub async fn research_open_detached_cockpit(
    app: AppHandle,
    input: ResearchCockpitOpenInput,
) -> Result<(), String> {
    cockpit::open_detached_cockpit(&app, input)
}

/// Close all cockpit panes and clear stored cockpit bounds.
///
/// # Parameters
/// - `app`: App handle used to locate active cockpit webviews.
/// - `state`: Provides access to shared cockpit bounds state to clear.
///
/// # Side effects
/// - Clears any stored cockpit bounds for the current session.
/// - Attempts to close both left and right cockpit webviews if they exist.
///
/// # Errors
/// Returns an error when closing a cockpit webview fails. Clearing stored bounds
/// best-effort ignores locking errors.
#[tauri::command]
pub async fn research_close_cockpit(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    cockpit::close_cockpit(&app, state.inner())
}

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
pub async fn clear_news_articles(state: State<'_, AppState>) -> Result<u64, String> {
    clear_news_articles_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

// --- Research connectors (accounts/streams/items) ---

#[tauri::command]
pub async fn research_list_accounts(
    state: State<'_, AppState>,
) -> Result<Vec<ResearchAccountDto>, String> {
    connectors::list_accounts(state.inner()).await
}

#[tauri::command]
pub async fn research_upsert_account(
    input: CreateResearchAccountInput,
    state: State<'_, AppState>,
) -> Result<ResearchAccountDto, String> {
    connectors::upsert_account(input, state.inner()).await
}

#[tauri::command]
pub async fn research_update_account(
    input: UpdateResearchAccountInput,
    state: State<'_, AppState>,
) -> Result<ResearchAccountDto, String> {
    connectors::update_account(input, state.inner()).await
}

#[tauri::command]
pub async fn research_delete_account(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    connectors::delete_account(id, state.inner()).await
}

#[tauri::command]
pub async fn research_test_account(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _ = id;
    let _ = state;
    Err("research_test_account is not available yet".into())
}

#[tauri::command]
pub async fn research_list_streams(
    account_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<ResearchStreamDto>, String> {
    connectors::list_streams(account_id, state.inner()).await
}

#[tauri::command]
pub async fn research_upsert_stream(
    input: UpsertResearchStreamInput,
    state: State<'_, AppState>,
) -> Result<ResearchStreamDto, String> {
    connectors::upsert_stream(input, state.inner()).await
}

#[tauri::command]
pub async fn research_delete_stream(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    connectors::delete_stream(id, state.inner()).await
}

#[tauri::command]
pub async fn research_sync_stream_now(
    stream_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    connectors::sync_stream_now(stream_id, state.inner()).await
}

#[tauri::command]
pub async fn research_list_items(
    query: ListResearchItemsQuery,
    state: State<'_, AppState>,
) -> Result<Vec<ResearchItemDto>, String> {
    connectors::list_items(query, state.inner()).await
}

#[tauri::command]
pub async fn research_set_item_status(
    item_id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    connectors::set_item_status(item_id, status, state.inner()).await
}

#[tauri::command]
pub async fn research_convert_to_reference(
    item_id: i64,
    idea_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _ = item_id;
    let _ = idea_id;
    let _ = state;
    Err("research_convert_to_reference is not available yet".into())
}

#[tauri::command]
pub async fn research_publish(
    account_id: i64,
    payload: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let _ = account_id;
    let _ = payload;
    let _ = state;
    Err("research_publish is not available yet".into())
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
