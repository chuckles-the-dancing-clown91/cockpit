//! Scheduler module for recurring system tasks
//!
//! Refactored from monolithic scheduler.rs into:
//! - types: Data structures for tasks and results
//! - executor: Task execution with concurrency protection
//! - handlers: API endpoints for task management
//! - init: Scheduler startup and cron registration

pub mod executor;
pub mod handlers;
pub mod init;
pub mod types;

// Re-export types for use elsewhere
pub use types::{RunTaskNowResult, SystemTask, SystemTaskDto, TaskRunResult, UpdateTaskInput};

// Re-export handlers for Tauri commands
pub use handlers::{
    list_system_tasks_handler, run_system_task_now_handler, update_system_task_handler,
};

// Re-export initialization function
pub use init::start_scheduler;
