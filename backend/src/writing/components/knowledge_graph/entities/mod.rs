//! Knowledge Graph Entities Module
//!
//! SeaORM entities for the writing knowledge graph:
//! - reference_items: Unified sources (news, URLs, tweets, papers, books, PDFs)
//! - writings: Your articles, chapters, books
//! - idea_reference_links: Ideas ↔ References (many-to-many)
//! - writing_idea_links: Writings ↔ Ideas (many-to-many)
//! - notes: Polymorphic notes on any entity

pub mod reference_items;
pub mod writings;
pub mod idea_reference_links;
pub mod writing_idea_links;
pub mod notes;

// Re-export entities for convenient access
pub use reference_items::Entity as ReferenceItems;
pub use writings::Entity as Writings;
pub use idea_reference_links::Entity as IdeaReferenceLinks;
pub use writing_idea_links::Entity as WritingIdeaLinks;
pub use notes::Entity as Notes;

// Re-export enums for type safety
pub use reference_items::ReferenceType;
pub use writings::{WritingType, WritingStatus};
pub use idea_reference_links::ReferenceRole;
pub use writing_idea_links::WritingPurpose;
pub use notes::{EntityType, NoteType};
