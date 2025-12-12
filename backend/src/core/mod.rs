//! Core infrastructure module
//!
//! This module contains all core infrastructure components:
//! - Database connection and migrations
//! - Error handling and result types
//! - Configuration management
//! - Encryption and security
//! - Logging and storage
//! - Application settings

pub mod components;
pub mod commands;

// Re-export commonly used types
pub use components::{config, db, logging, storage};
