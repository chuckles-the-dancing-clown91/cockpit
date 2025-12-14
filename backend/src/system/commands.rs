//! System domain Tauri commands

use tauri::State;
use crate::AppState;
use super::components::scheduler::{
    get_task_history_handler, list_system_tasks_handler, run_system_task_now_handler,
    update_system_task_handler, RunTaskNowResult, SystemTaskDto, TaskRunDto, UpdateTaskInput,
};

#[tauri::command]
pub async fn list_system_tasks(state: State<'_, AppState>) -> Result<Vec<SystemTaskDto>, String> {
    list_system_tasks_handler(&state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_history(
    task_id: Option<i64>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<TaskRunDto>, String> {
    get_task_history_handler(task_id, limit, offset, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_system_task_now(
    task_type: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<RunTaskNowResult, String> {
    run_system_task_now_handler(task_type, &state, &app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_system_task(
    task_type: String,
    input: UpdateTaskInput,
    state: State<'_, AppState>,
) -> Result<SystemTaskDto, String> {
    update_system_task_handler(task_type, input, &state)
        .await
        .map_err(|e| e.to_string())
}
