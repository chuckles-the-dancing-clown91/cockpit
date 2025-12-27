//! Database components for Architect Cockpit
//!
//! Provides database initialization and schema migration functionality.
//!
//! Organized into focused modules:
//! - init: Database connection and initialization
//! - migrations: Schema version management

pub mod init;
pub mod migrations;

// Re-export commonly used functions
pub use init::init_db_from_env;
