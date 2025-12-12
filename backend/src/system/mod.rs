//! System module - Background tasks and scheduling
//!
//! This module handles scheduled tasks, task history, and the
//! cron-based scheduler for automated operations.

pub mod components;
pub mod commands;

// Re-export commonly used types
pub use components::scheduler;
