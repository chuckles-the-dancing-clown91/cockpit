//! Research module - News aggregation and article management
//!
//! This module handles news feed integration, article management,
//! source configuration, and research settings.

pub mod commands;
pub mod components;
pub mod dto;
pub mod entities;
pub mod helpers;

pub const RESEARCH_COCKPIT_LEFT_WEBVIEW_LABEL: &str = "research_cockpit_left";
pub const RESEARCH_COCKPIT_RIGHT_WEBVIEW_LABEL: &str = "research_cockpit_right";
pub const RESEARCH_COCKPIT_WINDOW_LABEL: &str = "detached_cockpit";

// Re-export commonly used types
// Re-export components when needed
// pub use components::{articles, feed, settings, sources};
