//! Main scheduler initialization
//!
//! Sets up tokio-cron-scheduler and registers all enabled tasks
//! to run on their configured schedules.

use super::executor::{cron_for_task, load_enabled_tasks, run_task_once};
use std::time::Duration;
use tauri::{async_runtime, AppHandle, Manager};
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info, warn};

/// Start the task scheduler and register all enabled tasks
///
/// Creates a JobScheduler, loads enabled tasks from database,
/// registers cron jobs for each task, and keeps scheduler running.
pub async fn start_scheduler(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AppState>();
    let state = state.inner().clone();
    let scheduler = JobScheduler::new().await.map_err(|e| e.to_string())?;

    let tasks = load_enabled_tasks(&state.db).await.unwrap_or_default();
    for task in tasks {
        if let Some(expr) = cron_for_task(&task) {
            let app_handle = app.clone();
            let state_clone = state.clone();
            let expr_clone = expr.clone();
            let job = Job::new_async(expr.as_str(), move |_uuid, _l| {
                let app_handle = app_handle.clone();
                let state_clone = state_clone.clone();
                let task = task.clone();
                let cron_expr = expr_clone.clone();
                Box::pin(async move {
                    info!(
                        target: "scheduler",
                        "Scheduler triggering task: name='{}', type='{}', cron='{}'",
                        task.name, task.task_type, cron_expr
                    );
                    let result = run_task_once(&app_handle, &state_clone, task.clone()).await;
                    
                    match result.status {
                        "success" => {
                            info!(
                                target: "scheduler",
                                "Scheduled task completed successfully: name='{}', type='{}'",
                                task.name, task.task_type
                            );
                        }
                        "error" => {
                            error!(
                                target: "scheduler",
                                "Scheduled task failed: name='{}', type='{}', error='{}'",
                                task.name, task.task_type, 
                                result.error_message.as_deref().unwrap_or("unknown")
                            );
                        }
                        "skipped" => {
                            warn!(
                                target: "scheduler",
                                "Scheduled task skipped: name='{}', type='{}', reason='{}'",
                                task.name, task.task_type,
                                result.result_json.as_deref().unwrap_or("unknown")
                            );
                        }
                        _ => {
                            info!(
                                target: "scheduler",
                                "Scheduled task finished: name='{}', type='{}', status='{}'",
                                task.name, task.task_type, result.status
                            );
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
