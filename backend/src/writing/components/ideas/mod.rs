//! Ideas module for writing management
//!
//! Refactored from monolithic ideas.rs into:
//! - types: Database models, DTOs, enums, utility functions
//! - handlers: CRUD operations for ideas

pub mod types;
pub mod handlers;

// Database entities available in types module

// Re-export DTOs for API responses
pub use types::{
    CreateIdeaForArticleInput, CreateIdeaInput, IdeaDto, UpdateIdeaArticleInput,
    UpdateIdeaMetadataInput, UpdateIdeaNotesInput,
};

// Re-export handlers for Tauri commands
pub use handlers::{
    archive_idea_handler, create_idea_for_article_handler, create_idea_handler, get_idea_handler,
    list_ideas_handler, update_idea_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler,
};
