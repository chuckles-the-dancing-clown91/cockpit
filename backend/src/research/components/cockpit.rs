//! Research cockpit window helpers

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use crate::research::RESEARCH_COCKPIT_WINDOW_LABEL;

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

pub fn open_detached_cockpit(
    app: &AppHandle,
    input: ResearchCockpitOpenInput,
) -> Result<(), String> {
    let target_url = normalize_cockpit_url(&input.url)?;
    let route = cockpit_route("research/reader-cockpit", &input, Some(&target_url))?;

    if let Some(window) = app.get_webview_window(RESEARCH_COCKPIT_WINDOW_LABEL) {
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
    .title("Reader Cockpit")
    .inner_size(1400.0, 900.0)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    cockpit_window.maximize().map_err(|e| e.to_string())?;
    cockpit_window.show().map_err(|e| e.to_string())?;
    cockpit_window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}
