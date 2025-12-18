//! Notes Feature Module
//!
//! Polymorphic notes that can attach to ideas, references, or writings.
//! 
//! Key concepts:
//! - Each entity gets ONE "main" note document (1:1 relationship per note_type)
//! - Snippets/highlights append to the main note with divider
//! - HTML-native content (TipTap is HTML-based)
//! 
//! Commands:
//! - notes_get_or_create: Get existing note or create empty one
//! - notes_upsert: Create or update note content
//! - notes_append_snippet: Append content with <hr /> divider

pub mod commands;
pub mod components;
