//! Ideas module for writing management
//!
//! Refactored from monolithic ideas.rs into:
//! - types: Database models, DTOs, enums, utility functions
//! - handlers: CRUD operations for ideas

pub mod types;
pub mod handlers;
pub mod references;
pub mod reader;
pub mod entities;

// Re-export DTOs for API responses
pub use types::{
    CreateIdeaForArticleInput, CreateIdeaInput, IdeaDto, UpdateIdeaArticleInput,
    UpdateIdeaMetadataInput, UpdateIdeaNotesInput,
    IdeaReferenceDto, AddReferenceInput, UpdateReferenceNotesInput,
    ReferenceReaderSnapshotDto, ReaderSnapshotInput,
};

// Re-export handlers for Tauri commands
pub use handlers::{
    archive_idea_handler, create_idea_for_article_handler, create_idea_handler, get_idea_handler,
    list_ideas_handler, update_idea_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler,
};

// Re-export reference handlers
pub use references::{
    list_idea_references_handler, add_reference_to_idea_handler,
    remove_reference_handler, update_reference_notes_handler,
};

pub use reader::{
    get_reference_reader_snapshot_handler, get_reader_snapshot_for_url_handler,
};
