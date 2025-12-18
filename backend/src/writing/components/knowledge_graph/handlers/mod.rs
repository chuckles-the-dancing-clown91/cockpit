//! Knowledge graph CRUD handlers
//!
//! This module provides database operations for the knowledge graph entities:
//! - reference_items: Unified reference sources (articles, URLs, papers, etc.)
//! - writings: Articles, chapters, books
//! - idea_reference_links: Many-to-many links between ideas and references
//! - writing_idea_links: Many-to-many links between writings and ideas
//! - notes: Polymorphic notes attached to ideas, references, or writings

pub mod links;
pub mod notes;
pub mod reference_items;
pub mod writings;

pub use links::*;
pub use notes::*;
pub use reference_items::*;
pub use writings::*;
