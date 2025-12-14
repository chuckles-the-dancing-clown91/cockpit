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
pub use init::init_db_from_env;
