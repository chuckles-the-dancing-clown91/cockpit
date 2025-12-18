//! Writing ↔ Idea Links Entity
//!
//! Many-to-many join table with purpose enum

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Writing purpose enum - how this idea is used in the writing
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum WritingPurpose {
    #[sea_orm(string_value = "primary")]
    Primary,
    #[sea_orm(string_value = "secondary")]
    Secondary,
    #[sea_orm(string_value = "mention")]
    Mention,
}
impl std::fmt::Display for WritingPurpose {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WritingPurpose::Primary => write!(f, "primary"),
            WritingPurpose::Secondary => write!(f, "secondary"),
            WritingPurpose::Mention => write!(f, "mention"),
        }
    }
}
/// Writing-Idea link model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "writing_idea_links")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    pub writing_id: i64,
    pub idea_id: i64,
    
    pub purpose: WritingPurpose,
    pub notes: Option<String>,
    pub link_order: i32,
    
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::writings::Entity",
        from = "Column::WritingId",
        to = "super::writings::Column::Id"
    )]
    Writing,
    
    #[sea_orm(
        belongs_to = "crate::writing::components::ideas::types::Entity",
        from = "Column::IdeaId",
        to = "crate::writing::components::ideas::types::Column::Id"
    )]
    Idea,
}

impl Related<super::writings::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Writing.def()
    }
}

impl Related<crate::writing::components::ideas::types::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Idea.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
