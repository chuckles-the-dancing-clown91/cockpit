//! Database components for Architect Cockpit
//!
//! Provides database initialization, migrations, backup, and export functionality.
//!
//! Organized into focused modules:
//! - init: Database connection and initialization
//! - migrations: Schema version management
//! - backup: Database backup and export utilities

pub mod backup;
pub mod init;
pub mod migrations;

// Re-export commonly used functions
pub use backup::{backup_database, export_to_sql, get_db_stats};
pub use init::{init_db, init_db_from_env};
pub use migrations::{get_db_version, rollback_last_migration, run_migrations};
