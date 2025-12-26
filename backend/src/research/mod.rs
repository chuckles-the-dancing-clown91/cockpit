//! Research module - News aggregation and article management
//!
//! This module handles news feed integration, article management,
//! source configuration, and research settings.

pub mod components;
pub mod commands;
pub mod dto;
pub mod entities;
pub mod helpers;

pub const RESEARCH_COCKPIT_WEBVIEW_LABEL: &str = "research_cockpit";
pub const RESEARCH_COCKPIT_WINDOW_LABEL: &str = "detached_cockpit";
pub const RESEARCH_COCKPIT_SPLIT: f64 = 0.25;
pub const RESEARCH_COCKPIT_SIDEBAR_WIDTH: f64 = 400.0;

// Re-export commonly used types
// Re-export components when needed
// pub use components::{articles, feed, settings, sources};
