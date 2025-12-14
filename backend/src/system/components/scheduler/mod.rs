//! Scheduler module for recurring system tasks
//!
//! Refactored from monolithic scheduler.rs into:
//! - entities: Database model for system_tasks table
//! - task_runs: Database model for system_task_runs table
//! - types: Data structures for tasks and results
//! - executor: Task execution with concurrency protection
//! - handlers: API endpoints for task management
//! - init: Scheduler startup and cron registration

pub mod entities;
pub mod executor;
pub mod handlers;
pub mod init;
pub mod task_runs;
pub mod types;

// Re-export types for use elsewhere
pub use types::{RunTaskNowResult, SystemTaskDto, TaskRunResult, UpdateTaskInput};

// Re-export handlers for Tauri commands
pub use handlers::{
    get_task_history_handler, list_system_tasks_handler, run_system_task_now_handler,
    update_system_task_handler, TaskRunDto,
};

// Re-export initialization function
pub use init::start_scheduler;
