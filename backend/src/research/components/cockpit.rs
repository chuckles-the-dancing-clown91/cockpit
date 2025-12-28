//! Research cockpit helpers (child webviews + bounds syncing)

use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    async_runtime, AppHandle, Manager, Rect, Url, WebviewUrl, WebviewWindowBuilder,
    PhysicalPosition, PhysicalSize, WindowEvent,
};
use tauri::webview::WebviewBuilder;
use tauri::Emitter;
use tokio::time::sleep;

use crate::{AppState, CockpitBoundsState};
use crate::research::{
    RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL, RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL,
    RESEARCH_COCKPIT_WINDOW_LABEL,
};

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

type CockpitBounds = (f64, f64, f64, f64);

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

fn normalize_cockpit_bounds(input: &CockpitBoundsInput) -> CockpitBounds {
    let width = input.width.max(1.0);
    let height = input.height.max(1.0);
    let x = input.x.max(0.0);
    let y = input.y.max(0.0);
    (x, y, width, height)
}

fn cockpit_rect(bounds: CockpitBounds) -> Rect {
    let x = bounds.0.round() as i32;
    let y = bounds.1.round() as i32;
    let width = bounds.2.round().max(1.0) as u32;
    let height = bounds.3.round().max(1.0) as u32;
    Rect {
        position: PhysicalPosition::new(x, y).into(),
        size: PhysicalSize::new(width, height).into(),
    }
}

fn cockpit_physical_bounds(
    window: &tauri::Window,
    logical: CockpitBounds,
) -> Result<CockpitBounds, String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    Ok((
        logical.0 * scale,
        logical.1 * scale,
        logical.2 * scale,
        logical.3 * scale,
    ))
}

fn cockpit_rect_for_window(
    window: &tauri::Window,
    logical: CockpitBounds,
) -> Result<Rect, String> {
    let physical = cockpit_physical_bounds(window, logical)?;
    Ok(cockpit_rect(physical))
}

fn apply_webview_rect(webview: &tauri::Webview, rect: Rect) -> Result<(), String> {
    webview.set_bounds(rect).map_err(|e| e.to_string())?;
    webview.show().map_err(|e| e.to_string())?;
    Ok(())
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

fn cockpit_webview_targets(
    target_url: &Url,
) -> HashMap<&'static str, WebviewUrl> {
    let mut targets = HashMap::new();
    targets.insert(
        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL,
        WebviewUrl::External(target_url.clone()),
    );
    targets
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
        None => Ok(RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string()),
    }
}

fn stored_cockpit_bounds(
    app: &AppHandle,
    window_label: &str,
) -> Option<HashMap<String, CockpitBounds>> {
    let state = app.state::<AppState>();
    let stored = state.cockpit_bounds.lock().ok()?;
    let stored = stored.as_ref()?;
    if stored.window_label != window_label {
        return None;
    }
    let mut bounds = HashMap::new();
    for (label, rect) in stored.panes.iter() {
        bounds.insert(label.clone(), *rect);
    }
    Some(bounds)
}

fn effective_cockpit_bounds(
    app: &AppHandle,
    window: &tauri::Window,
) -> Result<HashMap<String, Rect>, String> {
    let stored = stored_cockpit_bounds(app, window.label())
        .ok_or_else(|| "Cockpit bounds not ready".to_string())?;
    let mut bounds = HashMap::new();
    for (label, rect) in stored.into_iter() {
        bounds.insert(label, cockpit_rect_for_window(window, rect)?);
    }
    Ok(bounds)
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
        apply_webview_rect(&existing, *bounds)?;
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
    apply_webview_rect(&webview, *bounds)?;
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
        let inject_selection_script = label == RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL;
        ensure_cockpit_webview(app, window, label, target, &rect, inject_selection_script)?;
    }
    Ok(())
}

fn attach_cockpit_window_events(app: AppHandle, window: &tauri::Window) {
    window.on_window_event(move |event| {
        if matches!(
            event,
            WindowEvent::Resized(_)
                | WindowEvent::ScaleFactorChanged { .. }
                | WindowEvent::Moved(_)
        ) {
            let _ = resize_research_cockpit(&app);
        }
    });
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
    let bounds = match effective_cockpit_bounds(app, &window) {
        Ok(bounds) => bounds,
        Err(_) => return Ok(()),
    };
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
                apply_webview_rect(&webview, rect)?;
            }
        }
    }
    Ok(())
}

pub fn set_cockpit_bounds(
    app: &AppHandle,
    state: &AppState,
    input: CockpitBoundsInput,
) -> Result<(), String> {
    let window = resolve_cockpit_window_for_label(app, input.window_label.as_deref())
        .ok_or_else(|| "Cockpit window not found".to_string())?;
    let webview_label = resolve_webview_label(input.webview_label.as_deref())?;
    let logical = normalize_cockpit_bounds(&input);
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
        panes.panes.insert(webview_label.clone(), logical);
        *guard = Some(panes);
    }
    if let Some(webview) = app.get_webview(&webview_label) {
        if webview.window().label() != window.label() {
            return Ok(());
        }
        let rect = cockpit_rect_for_window(&window, logical)?;
        apply_webview_rect(&webview, rect)?;
    }
    Ok(())
}

pub fn open_cockpit(
    app: &AppHandle,
    input: ResearchCockpitNavigateInput,
) -> Result<(), String> {
    let window = resolve_cockpit_window_for_label(app, input.window_label.as_deref())
        .ok_or_else(|| "Cockpit window not found".to_string())?;
    let target_url = normalize_cockpit_url(&input.url)?;
    let targets = cockpit_webview_targets(&target_url);
    let target_labels: Vec<String> = if let Some(label) = input.webview_label.as_deref() {
        vec![resolve_webview_label(Some(label))?]
    } else {
        vec![RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string()]
    };
    ensure_cockpit_targets(app, &window, &targets, &target_labels)?;
    Ok(())
}

pub fn open_detached_cockpit(
    app: &AppHandle,
    input: ResearchCockpitOpenInput,
) -> Result<(), String> {
    let target_url = normalize_cockpit_url(&input.url)?;
    let route = cockpit_route("research/cockpit", &input, Some(&target_url))?;
    let targets = cockpit_webview_targets(&target_url);

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
            if stored_cockpit_bounds(app, parent_window.label()).is_some() {
                ensure_cockpit_targets(
                    app,
                    &parent_window,
                    &targets,
                    &[
                        RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(),
                    ],
                )?;
            }
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
        app,
        RESEARCH_COCKPIT_WINDOW_LABEL,
        WebviewUrl::App(route.into()),
    )
    .title("Architect Cockpit")
    .inner_size(1400.0, 900.0)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    if let Some(window) = app.get_window(RESEARCH_COCKPIT_WINDOW_LABEL) {
        attach_cockpit_window_events(app.clone(), &window);
        if stored_cockpit_bounds(app, window.label()).is_some() {
            ensure_cockpit_targets(
                app,
                &window,
                &targets,
                &[
                    RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL.to_string(),
                ],
            )?;
        }
        schedule_cockpit_reflow(app.clone());
    }

    cockpit_window.maximize().map_err(|e| e.to_string())?;
    cockpit_window.show().map_err(|e| e.to_string())?;
    cockpit_window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn close_cockpit(
    app: &AppHandle,
    state: &AppState,
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
