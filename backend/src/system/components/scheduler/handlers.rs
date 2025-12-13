//! API handlers for system tasks
//!
//! Provides functions for listing, running, and updating scheduled tasks.

use super::executor::run_task_once;
use super::types::{model_to_dto, RunTaskNowResult, SystemTask, SystemTaskDto, UpdateTaskInput};
use crate::core::components::errors::{AppError, AppResult};
use crate::system::components::tasks::{Column, Entity};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};
use tauri::AppHandle;

/// List all system tasks with execution history
pub async fn list_system_tasks_handler(state: &crate::AppState) -> AppResult<Vec<SystemTaskDto>> {
    let rows = Entity::find().all(&state.db).await?;
    Ok(rows.into_iter().map(model_to_dto).collect())
}

/// Manually run a task now (bypasses schedule)
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

/// Update task configuration (enable/disable, frequency, name)
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
