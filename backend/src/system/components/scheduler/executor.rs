//! Task execution logic
//!
//! Handles loading tasks from database, executing task functions,
//! and preventing concurrent runs of the same task.

use super::entities::{Column, Entity};
use super::task_runs::{ActiveModel as TaskRunActiveModel, Entity as TaskRunEntity};
use super::types::{SystemTask, TaskRunResult};
use crate::core::components::errors::AppResult;
use crate::research::components::feed as news;
use crate::AppState;
use chrono::Utc;
use sea_orm::prelude::Expr;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use tauri::{AppHandle, Emitter};
use tracing::{error, info, warn};

/// Generate cron expression from task configuration
///
/// Converts frequency_seconds or uses explicit frequency_cron.
pub(crate) fn cron_for_task(task: &SystemTask) -> Option<String> {
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

/// Load all enabled tasks from database
pub(crate) async fn load_enabled_tasks(
    db: &sea_orm::DatabaseConnection,
) -> AppResult<Vec<SystemTask>> {
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

/// Execute a task once, with concurrency protection
///
/// Checks if task is already running, executes the task function,
/// updates database with results, and emits event to frontend.
pub(crate) async fn run_task_once(
    app: &AppHandle,
    state: &AppState,
    task: SystemTask,
) -> TaskRunResult {
    info!(
        target: "scheduler",
        "Starting manual task execution: task_id={}, task_type={}, name={}",
        task.id, task.task_type, task.name
    );

    // Check if already running
    {
        let mut running = state.running.lock().await;
        if running.contains(&task.id) {
            warn!(
                target: "scheduler",
                "Task {} ({}) is already running, skipping", task.task_type, task.name
            );
            return TaskRunResult {
                status: "skipped",
                result_json: Some("{\"reason\":\"already running\"}".into()),
                error_message: None,
            };
        }
        running.insert(task.id);
    }

    info!(
        target: "scheduler",
        "Executing task function: task_type={}", task.task_type
    );

    let start_time = Utc::now();

    // Execute task function based on type
    let result = match task.task_type.as_str() {
        "news_sync" => news::run_news_sync_task(state).await,
        "news_sources_sync" => news::run_news_sources_sync_task(state).await,
        _ => {
            warn!(
                target: "scheduler",
                "Unknown task type: {}", task.task_type
            );
            TaskRunResult {
                status: "skipped",
                result_json: Some("{\"reason\":\"unknown task\"}".into()),
                error_message: None,
            }
        }
    };

    // Log completion with more details
    match result.status {
        "success" => {
            info!(
                target: "scheduler",
                "Task completed successfully: task_id={}, name='{}', type='{}', result={}",
                task.id, task.name, task.task_type,
                result.result_json.as_deref().unwrap_or("null")
            );
        }
        "error" => {
            error!(
                target: "scheduler",
                "Task failed: task_id={}, name='{}', type='{}', error='{}'",
                task.id, task.name, task.task_type,
                result.error_message.as_deref().unwrap_or("unknown")
            );
        }
        _ => {
            info!(
                target: "scheduler",
                "Task finished: task_id={}, name='{}', type='{}', status='{}'",
                task.id, task.name, task.task_type, result.status
            );
        }
    }

    let end_time = Utc::now();

    // Insert task run record into history
    let task_run = TaskRunActiveModel {
        task_id: Set(task.id),
        started_at: Set(start_time),
        finished_at: Set(Some(end_time)),
        status: Set(result.status.to_string()),
        result: Set(result.result_json.clone()),
        error_message: Set(result.error_message.clone()),
        ..Default::default()
    };

    if let Err(e) = task_run.insert(&state.db).await {
        error!(
            target: "scheduler",
            "Failed to insert task run record for task_id={}: {}", task.id, e
        );
    } else {
        info!(
            target: "scheduler",
            "Task run record saved to history: task_id={}", task.id
        );
    }

    // Update task with last run information
    if let Err(e) = Entity::update_many()
        .col_expr(Column::LastRunAt, Expr::value(end_time))
        .col_expr(Column::LastStatus, Expr::value(result.status))
        .col_expr(Column::LastResult, Expr::value(result.result_json.clone()))
        .col_expr(Column::UpdatedAt, Expr::value(end_time))
        .filter(Column::Id.eq(task.id))
        .exec(&state.db)
        .await
    {
        error!(
            target: "scheduler",
            "Failed to update task status for task_id={}: {}", task.id, e
        );
    }

    // Emit event to frontend
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
        error!(
            target: "scheduler",
            "Failed to emit task completion event: {}", e
        );
    }

    // Remove from running set
    let mut running = state.running.lock().await;
    running.remove(&task.id);
    result
}
