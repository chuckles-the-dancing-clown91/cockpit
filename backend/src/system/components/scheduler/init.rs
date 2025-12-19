//! Main scheduler initialization
//!
//! Sets up tokio-cron-scheduler and registers all enabled tasks
//! to run on their configured schedules.

use super::executor::{cron_for_task, load_enabled_tasks, run_task_once};
use std::time::Duration;
use tauri::{async_runtime, AppHandle, Manager};
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info, warn};

/// Ensure scheduler tasks exist for all feed sources
async fn ensure_feed_source_tasks(db: &sea_orm::DatabaseConnection) -> Result<(), String> {
    use crate::research::components::feed::entities::feed_sources::{Entity as FeedSourceEntity, Column as FeedSourceColumn};
    use sea_orm::{EntityTrait, QueryFilter, ColumnTrait};
use super::entities::{Entity as TaskEntity, ActiveModel as TaskActiveModel};
    use sea_orm::{Set, ActiveModelTrait};
    
    // Get all enabled feed sources
    let sources = FeedSourceEntity::find()
        .filter(FeedSourceColumn::Enabled.eq(1))
        .all(db)
        .await
        .map_err(|e| format!("Failed to load feed sources: {}", e))?;
    
    for source in sources {
        // If source already has a task_id, check if task exists
        if let Some(task_id) = source.task_id {
            let existing_task = TaskEntity::find_by_id(task_id)
                .one(db)
                .await
                .map_err(|e| format!("Failed to check existing task: {}", e))?;
            
            if existing_task.is_some() {
                // Task already exists, skip
                continue;
            }
        }
        
        // Create new task with default schedule
        let task_type = format!("feed_sync_{}", source.id);
        let task_name = format!("Sync: {}", source.name);
        let default_schedule = "0 0/45 * * * * *".to_string(); // Every 45 minutes
        
        let task = TaskActiveModel {
            name: Set(task_name),
            task_type: Set(task_type),
            component: Set("research".to_string()),
            frequency_cron: Set(Some(default_schedule)),
            frequency_seconds: Set(None),
            enabled: Set(1),
            ..Default::default()
        };
        
        let task_model = task.insert(db)
            .await
            .map_err(|e| format!("Failed to create task: {}", e))?;
            
        // Update feed source with task_id
        use crate::research::components::feed::entities::feed_sources::ActiveModel as ActiveFeedSource;
        let mut source_active: ActiveFeedSource = source.into();
        source_active.task_id = Set(Some(task_model.id));
        source_active.update(db)
            .await
            .map_err(|e| format!("Failed to update feed source: {}", e))?;
            
        info!(
            target: "scheduler",
            "Created scheduler task {} for feed source: {}", task_model.id, task_model.name
        );
    }
    
    Ok(())
}

/// Start the task scheduler and register all enabled tasks
///
/// Creates a JobScheduler, loads enabled tasks from database,
/// registers cron jobs for each task, and keeps scheduler running.
pub async fn start_scheduler(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AppState>();
    let state = state.inner().clone();
    
    // Ensure tasks exist for all feed sources before starting scheduler
    if let Err(e) = ensure_feed_source_tasks(&state.db).await {
        warn!(target: "scheduler", "Failed to ensure feed source tasks: {}", e);
    }
    
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
