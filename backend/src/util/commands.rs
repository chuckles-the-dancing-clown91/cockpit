//! Utility domain Tauri commands
//! 
//! Cross-domain commands that don't belong to a specific domain

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedItem {
    pub id: String,
    pub provider: String,
    pub title: String,
    pub summary: Option<String>,
    pub url: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub all_day: Option<bool>,
    pub location: Option<String>,
}

#[derive(Serialize)]
pub struct ScheduledJobStub {
    pub id: u32,
    pub job_type: String,
    pub payload: String,
    pub status: String,
    pub run_at: Option<String>,
    pub last_run_at: Option<String>,
}

/// Get the current system username
/// Used for display purposes in the UI.
#[tauri::command]
pub fn get_system_user() -> String {
    whoami::username()
}

/// Log frontend errors to backend tracing system
/// 
/// Allows the frontend to send errors to the backend for centralized logging.
/// Supports different severity levels: critical, error, warning, info.
#[tauri::command]
pub fn log_frontend_error(
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
    
    if !stack.is_empty() {
        tracing::debug!("Stack trace: {}", stack);
    }
    if !component_stack.is_empty() {
        tracing::debug!("Component stack: {}", component_stack);
    }
    if let Some(meta) = metadata {
        if !meta.is_empty() {
            tracing::debug!("Metadata: {}", meta);
        }
    }
}

/// Get mixed feed from multiple sources (stub implementation)
#[tauri::command]
pub fn get_mixed_feed(_params: Option<serde_json::Value>) -> Vec<FeedItem> {
    vec![FeedItem {
        id: "mock-1".into(),
        provider: "reddit".into(),
        title: "Reddit systems check ready".into(),
        summary: Some("Quick status digest from your favorite subs.".into()),
        url: Some("https://reddit.com".into()),
        created_at: chrono::Utc::now().to_rfc3339(),
    }]
}

/// Get upcoming calendar events (stub implementation)
#[tauri::command]
pub fn get_upcoming_events(_horizon_minutes: Option<i64>) -> Vec<CalendarEvent> {
    vec![CalendarEvent {
        id: "evt-1".into(),
        title: "Mission planning sync".into(),
        start_time: chrono::Utc::now().to_rfc3339(),
        end_time: (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339(),
        all_day: Some(false),
        location: Some("Ops room".into()),
    }]
}

/// List scheduled background jobs (stub implementation)
#[tauri::command]
pub fn list_scheduled_jobs() -> Vec<ScheduledJobStub> {
    vec![ScheduledJobStub {
        id: 1,
        job_type: "calendar_alert".into(),
        payload: "Mock alert to keep the UI alive".into(),
        status: "active".into(),
        run_at: Some((chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339()),
        last_run_at: None,
    }]
}

/// Sync calendar data (stub implementation)
#[tauri::command]
pub fn sync_calendar() -> Result<(), String> {
    println!("Calendar sync requested (stub)");
    Ok(())
}
