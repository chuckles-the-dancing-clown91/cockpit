//! Storage management module
//! 
//! Provides centralized storage operations organized by responsibility:
//! - **stats**: Storage statistics and monitoring
//! - **backup**: Database backup and restore operations
//! - **cleanup**: Cleanup policies for logs and old data
//! - **logs**: Log reading, statistics, and export
//! - **export**: Data export/import to JSON

pub mod stats;
pub mod backup;
pub mod cleanup;
pub mod logs;
pub mod export;

// Re-export commonly used types and functions
pub use stats::{
    StorageStats,
    get_storage_stats,
    initialize_storage,
};

pub use backup::{
    BackupInfo,
    backup_database,
    restore_database,
    list_backups,
    delete_backup,
};

pub use cleanup::{
    CleanupSummary,
    cleanup_old_logs,
    cleanup_old_news,
};

pub use logs::{
    LogEntry,
    LogStats,
    get_logs,
    get_log_stats,
    export_logs,
    clear_logs,
};

pub use export::{
    ExportInfo,
    ImportSummary,
    export_data,
    import_data,
};
