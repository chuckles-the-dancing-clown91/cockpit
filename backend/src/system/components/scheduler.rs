//! Task scheduler for recurring system jobs
//!
//! Manages scheduled tasks like news sync and source sync using tokio-cron-scheduler.
//! Tracks task execution, prevents overlapping runs, and emits events to frontend.

use std::time::Duration;
use tokio_cron_scheduler::{Job, JobScheduler};
use tauri::{async_runtime, AppHandle, Emitter};
use sea_orm::{
    EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait, IntoActiveModel,
};
use sea_orm::prelude::Expr;
use tauri::Manager;
use chrono::Utc;
use tracing::error;

use crate::system::components::tasks::{Column, Entity};
use crate::research::components::feed as news;
use crate::AppState;
use crate::core::components::errors::{AppError, AppResult};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct SystemTask {
    pub id: i64,
    pub name: String,
    pub task_type: String,
    pub component: String,
    pub frequency_cron: Option<String>,
    pub frequency_seconds: Option<i64>,
    pub enabled: bool,
}

#[derive(Debug)]
pub struct TaskRunResult {
    pub status: &'static str,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemTaskDto {
    pub id: i64,
    pub name: String,
    pub task_type: String,
    pub component: String,
    pub frequency_cron: Option<String>,
    pub frequency_seconds: Option<i64>,
    pub enabled: bool,
    pub last_run_at: Option<sea_orm::prelude::DateTimeUtc>,
    pub last_status: Option<String>,
    pub last_result: Option<String>,
    pub error_count: i64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskNowResult {
    pub status: String,
    pub result: Option<String>,
    pub error_message: Option<String>,
    pub finished_at: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateTaskInput {
    pub enabled: Option<bool>,
    pub frequency_seconds: Option<Option<i64>>,
    pub frequency_cron: Option<Option<String>>,
    pub name: Option<String>,
}

fn model_to_dto(m: crate::system::components::tasks::Model) -> SystemTaskDto {
    SystemTaskDto {
        id: m.id,
        name: m.name,
        task_type: m.task_type,
        component: m.component,
        frequency_cron: m.frequency_cron,
        frequency_seconds: m.frequency_seconds,
        enabled: m.enabled == 1,
        last_run_at: m.last_run_at,
        last_status: m.last_status,
        last_result: m.last_result,
        error_count: m.error_count,
    }
}

fn cron_for_task(task: &SystemTask) -> Option<String> {
    if let Some(expr) = &task.frequency_cron {
        return Some(expr.clone());
    }
    if let Some(seconds) = task.frequency_seconds {
        if seconds <= 59 {
            return Some(format!("0/{seconds} * * * * * *"));
        }
        if seconds % 60 == 0 {
            let minutes = seconds / 60;
            return Some(format!("0 0/{minutes} * * * * *"));
        }
    }
    None
}

async fn load_enabled_tasks(db: &sea_orm::DatabaseConnection) -> AppResult<Vec<SystemTask>> {
    let rows = Entity::find()
        .filter(Column::Enabled.eq(1))
        .all(db)
        .await?;
    Ok(rows
        .into_iter()
        .map(|m| SystemTask {
            id: m.id,
            name: m.name,
            task_type: m.task_type,
            component: m.component,
            frequency_cron: m.frequency_cron,
            frequency_seconds: m.frequency_seconds,
            enabled: m.enabled == 1,
        })
        .collect())
}

async fn run_task_once(app: &AppHandle, state: &AppState, task: SystemTask) -> TaskRunResult {
    {
        let mut running = state.running.lock().await;
        if running.contains(&task.id) {
            return TaskRunResult {
                status: "skipped",
                result_json: Some("{\"reason\":\"already running\"}".into()),
                error_message: None,
            };
        }
        running.insert(task.id);
    }

    let result = match task.task_type.as_str() {
        "news_sync" => news::run_news_sync_task(state).await,
        "news_sources_sync" => news::run_news_sources_sync_task(state).await,
        _ => TaskRunResult {
            status: "skipped",
            result_json: Some("{\"reason\":\"unknown task\"}".into()),
            error_message: None,
        },
    };

    if let Err(e) = crate::system::components::tasks::Entity::update_many()
        .col_expr(Column::LastRunAt, Expr::value(Utc::now()))
        .col_expr(Column::LastStatus, Expr::value(result.status))
        .col_expr(Column::LastResult, Expr::value(result.result_json.clone()))
        .col_expr(Column::UpdatedAt, Expr::value(Utc::now()))
        .filter(Column::Id.eq(task.id))
        .exec(&state.db)
        .await
    {
        error!(target: "scheduler", "Failed to update task status for task_id={}: {}", task.id, e);
    }

    let now = chrono::Utc::now().to_rfc3339();
    let payload = serde_json::json!({
        "taskType": task.task_type,
        "component": task.component,
        "status": result.status,
        "result": result.result_json,
        "errorMessage": result.error_message,
        "finishedAt": now,
    });
    if let Err(e) = app.emit("system_task_run", payload) {
        error!(target: "scheduler", "Failed to emit task completion event: {}", e);
    }

    let mut running = state.running.lock().await;
    running.remove(&task.id);
    result
}

pub async fn start_scheduler(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AppState>();
    let state = state.inner().clone();
    let scheduler = JobScheduler::new().await.map_err(|e| e.to_string())?;

    let tasks = load_enabled_tasks(&state.db).await.unwrap_or_default();
    for task in tasks {
        if let Some(expr) = cron_for_task(&task) {
            let app_handle = app.clone();
            let state_clone = state.clone();
            let job = Job::new_async(expr.as_str(), move |_uuid, _l| {
                let app_handle = app_handle.clone();
                let state_clone = state_clone.clone();
                let task = task.clone();
                Box::pin(async move {
                    let result = run_task_once(&app_handle, &state_clone, task).await;
                    if result.status == "error" {
                        if let Some(err) = result.error_message {
                            error!(target: "scheduler", "Scheduled task failed: {}", err);
                        }
                    }
                })
            })
            .map_err(|e| e.to_string())?;
            scheduler.add(job).await.map_err(|e| e.to_string())?;
        }
    }

    scheduler.start().await.map_err(|e| e.to_string())?;
    async_runtime::spawn(async move {
        let _scheduler = scheduler;
        loop {
            tokio::time::sleep(Duration::from_secs(3600)).await;
        }
    });

    Ok(())
}

pub async fn list_system_tasks_handler(state: &crate::AppState) -> AppResult<Vec<SystemTaskDto>> {
    let rows = Entity::find().all(&state.db).await?;
    Ok(rows.into_iter().map(model_to_dto).collect())
}

pub async fn run_system_task_now_handler(
    task_type: String,
    state: &crate::AppState,
    app: &AppHandle,
) -> AppResult<RunTaskNowResult> {
    let maybe_task = Entity::find()
        .filter(Column::TaskType.eq(task_type.clone()))
        .one(&state.db)
        .await?;
    let Some(model) = maybe_task else {
        return Err(AppError::other("Not found"));
    };
    let task = SystemTask {
        id: model.id,
        name: model.name,
        task_type: model.task_type,
        component: model.component,
        frequency_cron: model.frequency_cron,
        frequency_seconds: model.frequency_seconds,
        enabled: model.enabled == 1,
    };
    let res = run_task_once(app, state, task).await;
    let finished_at = chrono::Utc::now().to_rfc3339();
    Ok(RunTaskNowResult {
        status: res.status.to_string(),
        result: res.result_json,
        error_message: res.error_message,
        finished_at,
    })
}

pub async fn update_system_task_handler(
    task_type: String,
    input: UpdateTaskInput,
    state: &crate::AppState,
) -> AppResult<SystemTaskDto> {
    let maybe = Entity::find()
        .filter(Column::TaskType.eq(task_type.clone()))
        .one(&state.db)
        .await?;
    let Some(model) = maybe else {
        return Err(AppError::other("Not found"));
    };
    let mut active = model.into_active_model();
    if let Some(enabled) = input.enabled {
        active.enabled = Set(if enabled { 1 } else { 0 });
    }
    if let Some(freq) = input.frequency_seconds {
        active.frequency_seconds = Set(freq);
        if freq.is_some() {
            active.frequency_cron = Set(None);
        }
    }
    if let Some(cron) = input.frequency_cron {
        active.frequency_cron = Set(cron.clone());
        if cron.is_some() {
            active.frequency_seconds = Set(None);
        }
    }
    if let Some(name) = input.name {
        active.name = Set(name);
    }
    active.updated_at = Set(chrono::Utc::now());
    let saved = active.update(&state.db).await?;
    Ok(model_to_dto(saved))
}
