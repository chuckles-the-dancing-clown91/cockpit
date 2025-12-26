//! Research domain Tauri commands

use tauri::{
    async_runtime, AppHandle, Manager, Rect, State, Url, WebviewUrl,
    WebviewWindowBuilder, PhysicalPosition, PhysicalSize,
};
use tauri::webview::WebviewBuilder;
use crate::{AppState, CockpitBoundsState};
use super::{
    RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL, RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    RESEARCH_COCKPIT_SIDEBAR_WIDTH, RESEARCH_COCKPIT_SPLIT, RESEARCH_COCKPIT_WINDOW_LABEL,
};
use crate::research::dto::{
    ResearchCapability, ResearchAccountDto, ResearchStreamDto, ResearchItemDto,
    CreateResearchAccountInput, UpdateResearchAccountInput, UpsertResearchStreamInput,
    ListResearchItemsQuery,
};
use crate::research::entities::{accounts, streams, items};
use crate::connectors::{get_connector, NormalizedItem};
use sea_orm::{EntityTrait, QueryFilter, ColumnTrait, ActiveModelTrait, Set, QuerySelect};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use tauri::Emitter;
use std::time::Duration;
use tokio::time::sleep;
use crate::research::helpers::format_naive;
use tracing::info;
use super::components::feed::{
    get_news_settings_handler, save_news_settings_handler,
    list_news_articles_handler, get_news_article_handler,
    dismiss_news_article_handler, toggle_star_news_article_handler,
    mark_news_article_read_handler, clear_news_articles_handler, sync_news_now_handler,
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

// Capability guard placeholder (to be backed by DB/account lookups)
fn parse_caps(json_str: &str) -> Vec<ResearchCapability> {
    serde_json::from_str(json_str).unwrap_or_default()
}

fn redact_value(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut redacted = serde_json::Map::new();
            for (k, v) in map {
                if ["apikey", "apiKey", "token", "auth", "password", "secret"].contains(&k.as_str())
                {
                    redacted.insert(k.clone(), serde_json::Value::String("[redacted]".into()));
                } else {
                    redacted.insert(k.clone(), redact_value(v));
                }
            }
            serde_json::Value::Object(redacted)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(redact_value).collect())
        }
        _ => value.clone(),
    }
}

const COCKPIT_SELECTION_SCRIPT: &str = r#"
(() => {
  const safeEmitToHost = (payload) => {
    try {
      const tauri = window.__TAURI__;
      if (!tauri?.webview) return;
      const wv = tauri.webview.getCurrentWebview();
      const windowLabel = wv?.window?.label || "main";
      const webviewLabel = wv?.label || "";
      wv.emitTo(windowLabel, "cockpit-webview-selection", { windowLabel, webviewLabel, ...payload });
    } catch (_) {}
  };

  let last = "";
  let timer = null;

  const publish = () => {
    const sel = (window.getSelection?.().toString() || "").trim();
    if (sel === last) return;
    last = sel;
    safeEmitToHost({ selection: sel, title: document.title || "", url: location.href });
  };

  document.addEventListener("selectionchange", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(publish, 120);
  });

  window.addEventListener("mouseup", publish);
  window.addEventListener("keyup", publish);

  safeEmitToHost({ selection: "", title: document.title || "", url: location.href });
})();
"#;

fn normalize_cockpit_url(raw: &str) -> Result<Url, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("url is required".to_string());
    }
    let with_scheme = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };
    Url::parse(&with_scheme).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCockpitOpenInput {
    pub url: String,
    pub title: Option<String>,
    pub reference_id: Option<i64>,
    pub idea_id: Option<i64>,
    pub writing_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResearchCockpitOpenPayload {
    url: String,
    title: Option<String>,
    reference_id: Option<i64>,
    idea_id: Option<i64>,
    writing_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCockpitNavigateInput {
    pub url: String,
    pub window_label: Option<String>,
    pub title: Option<String>,
    pub reference_id: Option<i64>,
    pub idea_id: Option<i64>,
    pub writing_id: Option<i64>,
    pub webview_label: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CockpitBoundsInput {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub window_label: Option<String>,
    pub webview_label: Option<String>,
}

fn normalize_cockpit_bounds(input: &CockpitBoundsInput) -> (f64, f64, f64, f64) {
    let width = input.width.max(1.0);
    let height = input.height.max(1.0);
    let x = input.x.max(0.0);
    let y = input.y.max(0.0);
    (x, y, width, height)
}

fn cockpit_rect(bounds: (f64, f64, f64, f64)) -> Rect {
    let x = bounds.0.round() as i32;
    let y = bounds.1.round() as i32;
    let width = bounds.2.round().max(1.0) as u32;
    let height = bounds.3.round().max(1.0) as u32;
    Rect {
        position: PhysicalPosition::new(x, y).into(),
        size: PhysicalSize::new(width, height).into(),
    }
}

fn cockpit_route(
    path: &str,
    input: &ResearchCockpitOpenInput,
    url: Option<&Url>,
) -> Result<String, String> {
    let mut route_url = Url::parse("https://cockpit.local/").map_err(|e| e.to_string())?;
    route_url.set_path(path);
    {
        let mut pairs = route_url.query_pairs_mut();
        if let Some(url) = url {
            pairs.append_pair("url", url.as_str());
        }
        if let Some(title) = input.title.as_ref() {
            pairs.append_pair("title", title);
        }
        if let Some(reference_id) = input.reference_id {
            pairs.append_pair("referenceId", &reference_id.to_string());
        }
        if let Some(idea_id) = input.idea_id {
            pairs.append_pair("ideaId", &idea_id.to_string());
        }
        if let Some(writing_id) = input.writing_id {
            pairs.append_pair("writingId", &writing_id.to_string());
        }
    }
    let query = route_url.query().unwrap_or("");
    let path = route_url.path().trim_start_matches('/');
    if query.is_empty() {
        Ok(path.to_string())
    } else {
        Ok(format!("{}?{}", path, query))
    }
}

fn notes_cockpit_route(input: &ResearchCockpitOpenInput) -> Result<String, String> {
    let mut route_url = Url::parse("https://cockpit.local/").map_err(|e| e.to_string())?;
    route_url.set_path("notes/cockpit");
    {
        let mut pairs = route_url.query_pairs_mut();
        if let Some(title) = input.title.as_ref() {
            pairs.append_pair("title", title);
        }
        if let Some(reference_id) = input.reference_id {
            pairs.append_pair("entityType", "reference");
            pairs.append_pair("entityId", &reference_id.to_string());
        } else if let Some(idea_id) = input.idea_id {
            pairs.append_pair("entityType", "idea");
            pairs.append_pair("entityId", &idea_id.to_string());
        } else if let Some(writing_id) = input.writing_id {
            pairs.append_pair("entityType", "writing");
            pairs.append_pair("entityId", &writing_id.to_string());
        }
    }
    let query = route_url.query().unwrap_or("");
    let path = route_url.path().trim_start_matches('/');
    if query.is_empty() {
        Ok(path.to_string())
    } else {
        Ok(format!("{}?{}", path, query))
    }
}

fn cockpit_webview_targets(
    input: &ResearchCockpitOpenInput,
    target_url: &Url,
) -> Result<HashMap<&'static str, WebviewUrl>, String> {
    let research_route = cockpit_route("research/cockpit", input, Some(target_url))?;
    let notes_route = notes_cockpit_route(input)?;
    let mut targets = HashMap::new();
    targets.insert(
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        WebviewUrl::App(research_route.into()),
    );
    targets.insert(
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
        WebviewUrl::App(notes_route.into()),
    );
    Ok(targets)
}

fn resolve_cockpit_window(app: &AppHandle) -> Option<tauri::Window> {
    app.get_window(RESEARCH_COCKPIT_WINDOW_LABEL)
        .or_else(|| app.get_window("main"))
}

fn resolve_cockpit_window_for_label(
    app: &AppHandle,
    window_label: Option<&str>,
) -> Option<tauri::Window> {
    if let Some(label) = window_label {
        if let Some(window) = app.get_window(label) {
            return Some(window);
        }
    }
    resolve_cockpit_window(app)
}

fn resolve_webview_label(webview_label: Option<&str>) -> Result<String, String> {
    match webview_label.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(label)
            if label == RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL
                || label == RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL =>
        {
            Ok(label.to_string())
        }
        Some(label) => Err(format!("Unsupported webview label: {}", label)),
        None => Ok(RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL.to_string()),
    }
}

fn cockpit_bounds(window: &tauri::Window) -> Result<HashMap<String, Rect>, String> {
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let width = size.width.max(1);
    let height = size.height.max(1);
    let sidebar_physical = (RESEARCH_COCKPIT_SIDEBAR_WIDTH * scale).round() as u32;
    let available_width = width.saturating_sub(sidebar_physical).max(2);
    let max_left_width = available_width.saturating_sub(1).max(1);
    let left_width = ((available_width as f64) * RESEARCH_COCKPIT_SPLIT)
        .round()
        .min(max_left_width as f64)
        .max(1.0) as u32;
    let right_width = available_width.saturating_sub(left_width).max(1);
    let left_rect = Rect {
        position: PhysicalPosition::new(sidebar_physical as i32, 0).into(),
        size: PhysicalSize::new(left_width, height).into(),
    };
    let right_rect = Rect {
        position: PhysicalPosition::new(sidebar_physical as i32 + left_width as i32, 0).into(),
        size: PhysicalSize::new(right_width, height).into(),
    };
    let mut bounds = HashMap::new();
    bounds.insert(RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(), left_rect);
    bounds.insert(RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL.to_string(), right_rect);
    Ok(bounds)
}

fn stored_cockpit_bounds(app: &AppHandle, window_label: &str) -> Option<HashMap<String, Rect>> {
    let state = app.state::<AppState>();
    let stored = state.cockpit_bounds.lock().ok()?;
    let stored = stored.as_ref()?;
    if stored.window_label != window_label {
        return None;
    }
    let mut bounds = HashMap::new();
    for (label, rect) in stored.panes.iter() {
        bounds.insert(label.clone(), cockpit_rect(*rect));
    }
    Some(bounds)
}

fn effective_cockpit_bounds(
    app: &AppHandle,
    window: &tauri::Window,
) -> Result<HashMap<String, Rect>, String> {
    let mut defaults = cockpit_bounds(window)?;
    if let Some(stored) = stored_cockpit_bounds(app, window.label()) {
        for (label, rect) in stored {
            defaults.insert(label, rect);
        }
    }
    Ok(defaults)
}

fn schedule_cockpit_reflow(app: AppHandle) {
    async_runtime::spawn(async move {
        let delays = [0_u64, 50, 150, 300];
        for delay in delays {
            if delay > 0 {
                sleep(Duration::from_millis(delay)).await;
            }
            let _ = resize_research_cockpit(&app);
        }
    });
}

fn ensure_cockpit_webview(
    app: &AppHandle,
    window: &tauri::Window,
    label: &str,
    target: WebviewUrl,
    bounds: &Rect,
    inject_selection_script: bool,
) -> Result<(), String> {
    if let Some(existing) = app.get_webview(label) {
        if existing.window().label() != window.label() || matches!(target, WebviewUrl::App(_)) {
            existing.close().map_err(|e| e.to_string())?;
        }
    }

    if let Some(existing) = app.get_webview(label) {
        if let WebviewUrl::External(url) = target {
            existing.navigate(url).map_err(|e| e.to_string())?;
        }
        existing.set_bounds(*bounds).map_err(|e| e.to_string())?;
        existing
            .set_position(bounds.position)
            .map_err(|e| e.to_string())?;
        existing.set_size(bounds.size).map_err(|e| e.to_string())?;
        existing.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let webview_builder = if inject_selection_script {
        WebviewBuilder::new(label, target).initialization_script(COCKPIT_SELECTION_SCRIPT)
    } else {
        WebviewBuilder::new(label, target)
    };

    let webview = window
        .add_child(webview_builder, bounds.position, bounds.size)
        .map_err(|e| e.to_string())?;
    webview.set_bounds(*bounds).map_err(|e| e.to_string())?;
    webview
        .set_position(bounds.position)
        .map_err(|e| e.to_string())?;
    webview.set_size(bounds.size).map_err(|e| e.to_string())?;
    webview.show().map_err(|e| e.to_string())?;
    Ok(())
}

fn ensure_cockpit_targets(
    app: &AppHandle,
    window: &tauri::Window,
    targets: &HashMap<&'static str, WebviewUrl>,
    labels: &[String],
) -> Result<(), String> {
    let bounds = effective_cockpit_bounds(app, window)?;
    for label in labels {
        let Some(rect) = bounds.get(label.as_str()).cloned() else {
            continue;
        };
        let Some(target) = targets.get(label.as_str()).cloned() else {
            continue;
        };
        let inject_selection_script = label == RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL;
        ensure_cockpit_webview(app, window, label, target, &rect, inject_selection_script)?;
    }
    Ok(())
}

pub fn resize_research_cockpit(app: &AppHandle) -> Result<(), String> {
    let window = resolve_cockpit_window(app)
        .ok_or_else(|| "Cockpit window not found".to_string())?;
    let any_webview = [
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    ]
    .iter()
    .any(|label| app.get_webview(label).is_some());
    if !any_webview {
        return Ok(());
    }
    let bounds = effective_cockpit_bounds(app, &window)?;
    for label in [
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    ] {
        if let Some(webview) = app.get_webview(label) {
            if webview.window().label() != window.label() {
                continue;
            }
            if let Some(rect) = bounds.get(label) {
                let rect = rect.clone();
                webview.set_bounds(rect).map_err(|e| e.to_string())?;
                webview
                    .set_position(rect.position)
                    .map_err(|e| e.to_string())?;
                webview.set_size(rect.size).map_err(|e| e.to_string())?;
                webview.show().map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn research_set_cockpit_bounds(
    app: AppHandle,
    input: CockpitBoundsInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let window = resolve_cockpit_window_for_label(&app, input.window_label.as_deref())
        .ok_or_else(|| "Cockpit window not found".to_string())?;
    let webview_label = resolve_webview_label(input.webview_label.as_deref())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let logical = normalize_cockpit_bounds(&input);
    let bounds = (
        logical.0 * scale,
        logical.1 * scale,
        logical.2 * scale,
        logical.3 * scale,
    );
    {
        let mut guard = state
            .cockpit_bounds
            .lock()
            .map_err(|_| "Failed to lock cockpit bounds".to_string())?;
        let mut panes = guard.take().unwrap_or(CockpitBoundsState {
            window_label: window.label().to_string(),
            panes: HashMap::new(),
        });
        if panes.window_label != window.label() {
            panes = CockpitBoundsState {
                window_label: window.label().to_string(),
                panes: HashMap::new(),
            };
        }
        panes.panes.insert(webview_label.clone(), bounds);
        *guard = Some(panes);
    }
    if let Some(webview) = app.get_webview(&webview_label) {
        if webview.window().label() != window.label() {
            return Ok(());
        }
        let rect = cockpit_rect(bounds);
        webview.set_bounds(rect).map_err(|e| e.to_string())?;
        webview
            .set_position(rect.position)
            .map_err(|e| e.to_string())?;
        webview.set_size(rect.size).map_err(|e| e.to_string())?;
        webview.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn research_open_cockpit(
    app: AppHandle,
    input: ResearchCockpitNavigateInput,
) -> Result<(), String> {
    let window = resolve_cockpit_window_for_label(&app, input.window_label.as_deref())
        .ok_or_else(|| "Cockpit window not found".to_string())?;
    let target_url = normalize_cockpit_url(&input.url)?;
    let open_input = ResearchCockpitOpenInput {
        url: input.url.clone(),
        title: input.title.clone(),
        reference_id: input.reference_id,
        idea_id: input.idea_id,
        writing_id: input.writing_id,
    };
    let targets = cockpit_webview_targets(&open_input, &target_url)?;
    let mut target_labels: Vec<String> = if let Some(label) = input.webview_label.as_deref() {
        vec![resolve_webview_label(Some(label))?]
    } else {
        vec![
            RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(),
            RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL.to_string(),
        ]
    };
    for label in [
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    ] {
        if !target_labels.iter().any(|l| l == label) && app.get_webview(label).is_none() {
            target_labels.push(label.to_string());
        }
    }
    ensure_cockpit_targets(&app, &window, &targets, &target_labels)?;
    Ok(())
}

#[tauri::command]
pub async fn research_open_detached_cockpit(
    app: AppHandle,
    input: ResearchCockpitOpenInput,
) -> Result<(), String> {
    let target_url = normalize_cockpit_url(&input.url)?;
    let route = cockpit_route("research/cockpit", &input, Some(&target_url))?;
    let targets = cockpit_webview_targets(&input, &target_url)?;

    // Defensive: if an older build created an embedded cockpit webview, close it.
    for label in [
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    ] {
        if let Some(webview) = app.get_webview(label) {
            let _ = webview.close();
        }
    }

    if let Some(window) = app.get_webview_window(RESEARCH_COCKPIT_WINDOW_LABEL) {
        if let Some(parent_window) = app.get_window(RESEARCH_COCKPIT_WINDOW_LABEL) {
            ensure_cockpit_targets(
                &app,
                &parent_window,
                &targets,
                &[
                    RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(),
                    RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL.to_string(),
                ],
            )?;
        }
        window
            .emit(
                "research-cockpit-open",
                ResearchCockpitOpenPayload {
                    url: target_url.as_str().to_string(),
                    title: input.title.clone(),
                    reference_id: input.reference_id,
                    idea_id: input.idea_id,
                    writing_id: input.writing_id,
                },
            )
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let cockpit_window = WebviewWindowBuilder::new(
        &app,
        RESEARCH_COCKPIT_WINDOW_LABEL,
        WebviewUrl::App(route.into()),
    )
    .title("Architect Cockpit")
    .inner_size(1400.0, 900.0)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    if let Some(window) = app.get_window(RESEARCH_COCKPIT_WINDOW_LABEL) {
        ensure_cockpit_targets(
            &app,
            &window,
            &targets,
            &[
                RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(),
                RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL.to_string(),
            ],
        )?;
        schedule_cockpit_reflow(app.clone());
    }

    cockpit_window.maximize().map_err(|e| e.to_string())?;
    cockpit_window.show().map_err(|e| e.to_string())?;
    cockpit_window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn research_close_cockpit(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if let Ok(mut guard) = state.cockpit_bounds.lock() {
        *guard = None;
    }
    for label in [
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    ] {
        if let Some(webview) = app.get_webview(label) {
            webview.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
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
    let rows = accounts::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let dtos = rows
        .into_iter()
        .map(|m| ResearchAccountDto {
            id: m.id,
            provider: m.provider,
            display_name: m.display_name,
            enabled: m.enabled,
            allowed_caps: parse_caps(&m.allowed_caps_json),
            permissions: m.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

#[tauri::command]
pub async fn research_upsert_account(
    input: CreateResearchAccountInput,
    state: State<'_, AppState>,
) -> Result<ResearchAccountDto, String> {
    info!(
        provider = %input.provider,
        display_name = %input.display_name,
        allowed_caps = ?input.allowed_caps,
        auth = ?input.auth.as_ref().map(redact_value),
        "research_upsert_account start"
    );
    let now = Utc::now().naive_utc();
    let caps_json = serde_json::to_string(&input.allowed_caps).map_err(|e| e.to_string())?;
    let permissions_json = input
        .permissions
        .as_ref()
        .map(|p| serde_json::to_string(p).map_err(|e| e.to_string()))
        .transpose()?;
    let auth_encrypted = input
        .auth
        .as_ref()
        .map(|a| serde_json::to_vec(a).map_err(|e| e.to_string()))
        .transpose()?;

    let model = accounts::ActiveModel {
        provider: Set(input.provider),
        display_name: Set(input.display_name),
        enabled: Set(input.enabled.unwrap_or(true)),
        allowed_caps_json: Set(caps_json),
        permissions_json: Set(permissions_json),
        auth_encrypted: Set(auth_encrypted),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let saved = model.insert(&state.db).await.map_err(|e| e.to_string())?;

    info!(
        account_id = saved.id,
        provider = %saved.provider,
        "research_upsert_account ok"
    );
    Ok(ResearchAccountDto {
        id: saved.id,
        provider: saved.provider,
        display_name: saved.display_name,
        enabled: saved.enabled,
        allowed_caps: parse_caps(&saved.allowed_caps_json),
        permissions: saved.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
        created_at: format_naive(saved.created_at),
        updated_at: format_naive(saved.updated_at),
    })
}

#[tauri::command]
pub async fn research_update_account(
    input: UpdateResearchAccountInput,
    state: State<'_, AppState>,
) -> Result<ResearchAccountDto, String> {
    let mut model: accounts::ActiveModel = accounts::Entity::find_by_id(input.id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found".to_string())?
        .into();

    if let Some(p) = input.provider {
        model.provider = Set(p);
    }
    if let Some(n) = input.display_name {
        model.display_name = Set(n);
    }
    if let Some(enabled) = input.enabled {
        model.enabled = Set(enabled);
    }
    if let Some(caps) = input.allowed_caps {
        model.allowed_caps_json = Set(serde_json::to_string(&caps).map_err(|e| e.to_string())?);
    }
    if let Some(perms) = input.permissions {
        model.permissions_json = Set(Some(serde_json::to_string(&perms).map_err(|e| e.to_string())?));
    }
    if let Some(auth) = input.auth {
        model.auth_encrypted = Set(Some(serde_json::to_vec(&auth).map_err(|e| e.to_string())?));
    }
    model.updated_at = Set(Utc::now().naive_utc());

    let saved = model.update(&state.db).await.map_err(|e| e.to_string())?;

    Ok(ResearchAccountDto {
        id: saved.id,
        provider: saved.provider,
        display_name: saved.display_name,
        enabled: saved.enabled,
        allowed_caps: parse_caps(&saved.allowed_caps_json),
        permissions: saved.permissions_json.and_then(|p| serde_json::from_str(&p).ok()),
        created_at: format_naive(saved.created_at),
        updated_at: format_naive(saved.updated_at),
    })
}

#[tauri::command]
pub async fn research_delete_account(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!(account_id = id, "research_delete_account start");
    accounts::Entity::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    info!(account_id = id, "research_delete_account ok");
    Ok(())
}

#[tauri::command]
pub async fn research_test_account(
    _id: i64,
    _state: State<'_, AppState>,
) -> Result<(), String> {
    // TODO: validate auth/scopes vs allowed capabilities
    Ok(())
}

#[tauri::command]
pub async fn research_list_streams(
    account_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<ResearchStreamDto>, String> {
    let mut query = streams::Entity::find();
    if let Some(id) = account_id {
        query = query.filter(streams::Column::AccountId.eq(id));
    }
    let rows = query.all(&state.db).await.map_err(|e| e.to_string())?;
    let dtos = rows
        .into_iter()
        .map(|m| ResearchStreamDto {
            id: m.id,
            account_id: m.account_id,
            name: m.name,
            provider: m.provider,
            enabled: m.enabled,
            config: m.config_json.and_then(|c| serde_json::from_str(&c).ok()),
            schedule: m.schedule_json.and_then(|s| serde_json::from_str(&s).ok()),
            last_sync_at: m.last_sync_at.map(format_naive),
            last_error: m.last_error,
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

#[tauri::command]
pub async fn research_upsert_stream(
    input: UpsertResearchStreamInput,
    state: State<'_, AppState>,
) -> Result<ResearchStreamDto, String> {
    info!(
        stream_id = input.id,
        account_id = input.account_id,
        provider = %input.provider,
        name = %input.name,
        "research_upsert_stream start"
    );
    let now = Utc::now().naive_utc();
    let config_json = input
        .config
        .as_ref()
        .map(|c| serde_json::to_string(c).map_err(|e| e.to_string()))
        .transpose()?;
    let schedule_json = input
        .schedule
        .as_ref()
        .map(|s| serde_json::to_string(s).map_err(|e| e.to_string()))
        .transpose()?;

    let model = if let Some(id) = input.id {
        let mut model: streams::ActiveModel = streams::Entity::find_by_id(id)
            .one(&state.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Stream not found".to_string())?
            .into();
        model.account_id = Set(input.account_id);
        model.name = Set(input.name);
        model.provider = Set(input.provider);
        if let Some(enabled) = input.enabled {
            model.enabled = Set(enabled);
        }
        model.config_json = Set(config_json);
        model.schedule_json = Set(schedule_json);
        model.updated_at = Set(now);
        model
    } else {
        streams::ActiveModel {
            account_id: Set(input.account_id),
            name: Set(input.name),
            provider: Set(input.provider),
            enabled: Set(input.enabled.unwrap_or(true)),
            config_json: Set(config_json),
            schedule_json: Set(schedule_json),
            last_sync_at: Set(None),
            last_error: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            ..Default::default()
        }
    };

    let saved = if input.id.is_some() {
        model.update(&state.db).await
    } else {
        model.insert(&state.db).await
    }
    .map_err(|e| e.to_string())?;

    info!(
        stream_id = saved.id,
        account_id = saved.account_id,
        "research_upsert_stream ok"
    );
    Ok(ResearchStreamDto {
        id: saved.id,
        account_id: saved.account_id,
        name: saved.name,
        provider: saved.provider,
        enabled: saved.enabled,
        config: saved.config_json.and_then(|c| serde_json::from_str(&c).ok()),
        schedule: saved.schedule_json.and_then(|s| serde_json::from_str(&s).ok()),
            last_sync_at: saved.last_sync_at.map(format_naive),
            last_error: saved.last_error,
            created_at: format_naive(saved.created_at),
            updated_at: format_naive(saved.updated_at),
    })
}

#[tauri::command]
pub async fn research_delete_stream(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    streams::Entity::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn research_sync_stream_now(
    stream_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    use sea_orm::EntityTrait;
    let stream = streams::Entity::find_by_id(stream_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Stream not found".to_string())?;
    let stream_id_val = stream.id;
    let account_id_val = stream.account_id;

    let account = accounts::Entity::find_by_id(stream.account_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Account not found".to_string())?;

    if !account.enabled || !stream.enabled {
        return Err("Account or stream disabled".into());
    }
    let allowed_caps = parse_caps(&account.allowed_caps_json);
    if !allowed_caps.contains(&ResearchCapability::ReadStream) {
        return Err("ReadStream not allowed for this account".into());
    }

    let connector = get_connector(&stream.provider)
        .ok_or_else(|| format!("Connector not found for provider {}", stream.provider))?;

    info!(
        stream_id = stream_id_val,
        account_id = account_id_val,
        provider = %stream.provider,
        "research_sync_stream_now start"
    );

    if !connector
        .supported_capabilities()
        .contains(&ResearchCapability::ReadStream)
    {
        return Err("Connector does not support ReadStream".into());
    }

    let account_auth: serde_json::Value = account
        .auth_encrypted
        .as_ref()
        .and_then(|b| serde_json::from_slice(b).ok())
        .unwrap_or_else(|| json!({}));
    let stream_cfg: serde_json::Value = stream
        .config_json
        .as_ref()
        .and_then(|c| serde_json::from_str(c).ok())
        .unwrap_or_else(|| json!({}));

    let items = connector
        .sync_stream(&account_auth, &stream_cfg, &state.http_client)
        .await?;

    let count = items.len();
    for it in items {
        upsert_research_item(&state, &account, &stream, it).await?;
    }

    let mut active: streams::ActiveModel = stream.into();
    active.last_sync_at = Set(Some(Utc::now().naive_utc()));
    active.last_error = Set(None);
    active.updated_at = Set(Utc::now().naive_utc());
    active.update(&state.db).await.map_err(|e| e.to_string())?;

    info!(
        stream_id = stream_id_val,
        account_id = account_id_val,
        items = count,
        "research_sync_stream_now ok"
    );
    Ok(())
}

#[tauri::command]
pub async fn research_list_items(
    query: ListResearchItemsQuery,
    state: State<'_, AppState>,
) -> Result<Vec<ResearchItemDto>, String> {
    use sea_orm::QueryOrder;
    let mut q = items::Entity::find();
    if let Some(provider) = query.provider {
        q = q.filter(items::Column::SourceType.eq(provider));
    }
    if let Some(account_id) = query.account_id {
        q = q.filter(items::Column::AccountId.eq(account_id));
    }
    if let Some(stream_id) = query.stream_id {
        q = q.filter(items::Column::StreamId.eq(stream_id));
    }
    if let Some(status) = query.status {
        q = q.filter(items::Column::Status.eq(status));
    }
    if let Some(search) = query.search {
        let like = format!("%{}%", search);
        q = q.filter(
            items::Column::Title
                .like(&like)
                .or(items::Column::Excerpt.like(&like)),
        );
    }
    if let Some(limit) = query.limit {
        q = q.limit(limit);
    }
    if let Some(offset) = query.offset {
        q = q.offset(offset);
    }
    let rows = q
        .order_by_desc(items::Column::PublishedAt)
        .order_by_desc(items::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let dtos = rows
        .into_iter()
        .map(|m| ResearchItemDto {
            id: m.id,
            account_id: m.account_id,
            stream_id: m.stream_id,
            source_type: m.source_type,
            external_id: m.external_id,
            url: m.url,
            title: m.title,
            excerpt: m.excerpt,
            author: m.author,
            published_at: m.published_at.map(format_naive),
            status: m.status,
            tags: m.tags_json.and_then(|t| serde_json::from_str(&t).ok()),
            payload: m.payload_json.and_then(|p| serde_json::from_str(&p).ok()),
            created_at: format_naive(m.created_at),
            updated_at: format_naive(m.updated_at),
        })
        .collect();
    Ok(dtos)
}

#[tauri::command]
pub async fn research_set_item_status(
    item_id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut model: items::ActiveModel = items::Entity::find_by_id(item_id)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?
        .into();
    model.status = Set(status);
    model.updated_at = Set(Utc::now().naive_utc());
    model.update(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn research_convert_to_reference(
    _item_id: i64,
    _idea_id: Option<i64>,
    _state: State<'_, AppState>,
) -> Result<(), String> {
    Err("research_convert_to_reference not implemented yet".into())
}

#[tauri::command]
pub async fn research_publish(
    _account_id: i64,
    _payload: serde_json::Value,
    _state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // Capabilities guard will be added when publish is implemented
    Err("research_publish not implemented yet".into())
}

async fn upsert_research_item(
    state: &AppState,
    account: &accounts::Model,
    stream: &streams::Model,
    item: NormalizedItem,
) -> Result<(), String> {
    let existing = items::Entity::find()
        .filter(items::Column::SourceType.eq(item.source_type.clone()))
        .filter(items::Column::ExternalId.eq(item.external_id.clone()))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let now = Utc::now().naive_utc();
    let payload_json = serde_json::to_string(&item.payload).map_err(|e| e.to_string())?;
    let tags_json = item
        .tags
        .as_ref()
        .map(|t| serde_json::to_string(t).map_err(|e| e.to_string()))
        .transpose()?;

    if let Some(existing) = existing {
        let mut model: items::ActiveModel = existing.into();
        model.url = Set(item.url);
        model.title = Set(item.title);
        model.excerpt = Set(item.excerpt);
        model.author = Set(item.author);
        model.published_at = Set(
            item.published_at
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.naive_utc()),
        );
        model.tags_json = Set(tags_json);
        model.payload_json = Set(Some(payload_json));
        model.updated_at = Set(now);
        model.update(&state.db).await.map_err(|e| e.to_string())?;
    } else {
        let model = items::ActiveModel {
            account_id: Set(Some(account.id)),
            stream_id: Set(Some(stream.id)),
            source_type: Set(item.source_type),
            external_id: Set(item.external_id),
            url: Set(item.url),
            title: Set(item.title),
            excerpt: Set(item.excerpt),
            author: Set(item.author),
            published_at: Set(
                item.published_at
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok())
                    .map(|d| d.naive_utc()),
            ),
            status: Set("new".to_string()),
            tags_json: Set(tags_json),
            payload_json: Set(Some(payload_json)),
            created_at: Set(now),
            updated_at: Set(now),
            ..Default::default()
        };
        model.insert(&state.db).await.map_err(|e| e.to_string())?;
    }
    Ok(())
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
