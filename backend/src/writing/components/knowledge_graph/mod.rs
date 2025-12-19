#![allow(unused_imports)]
//! Knowledge Graph Module
//!
//! Comprehensive writing workflow support:
//! Ideas → References → Writings with many-to-many relationships

pub mod entities;
pub mod handlers;

// Re-export entities and handlers for easy access
pub use entities::*;
pub use handlers::*;
