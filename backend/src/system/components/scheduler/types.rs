//! Type definitions for task scheduler
//!
//! Defines data structures for system tasks, execution results,
//! and API request/response types.

use serde::{Deserialize, Serialize};

/// Internal representation of a system task
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

/// Result of task execution
#[derive(Debug)]
pub struct TaskRunResult {
    pub status: &'static str,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
}

/// DTO for system task API responses
#[derive(Serialize)]
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

/// Result of manually running a task
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskNowResult {
    pub status: String,
    pub result: Option<String>,
    pub error_message: Option<String>,
    pub finished_at: String,
}

/// Input for updating task configuration
#[derive(Deserialize)]
pub struct UpdateTaskInput {
    pub enabled: Option<bool>,
    pub frequency_seconds: Option<Option<i64>>,
    pub frequency_cron: Option<Option<String>>,
    pub name: Option<String>,
}

/// Convert database model to DTO
pub(crate) fn model_to_dto(m: super::entities::Model) -> SystemTaskDto {
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
