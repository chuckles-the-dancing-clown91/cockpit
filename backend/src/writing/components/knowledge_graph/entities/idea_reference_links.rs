//! Idea ↔ Reference Links Entity
//!
//! Many-to-many join table with role enum

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Reference role enum - how this reference relates to the idea
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum ReferenceRole {
    #[sea_orm(string_value = "supporting")]
    Supporting,
    #[sea_orm(string_value = "counter")]
    Counter,
    #[sea_orm(string_value = "quote")]
    Quote,
    #[sea_orm(string_value = "background")]
    Background,
}
impl std::fmt::Display for ReferenceRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReferenceRole::Supporting => write!(f, "supporting"),
            ReferenceRole::Counter => write!(f, "counter"),
            ReferenceRole::Quote => write!(f, "quote"),
            ReferenceRole::Background => write!(f, "background"),
        }
    }
}
/// Idea-Reference link model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "idea_reference_links")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    pub idea_id: i64,
    pub reference_id: i64,
    
    pub role: ReferenceRole,
    pub notes: Option<String>,
    pub link_order: i32,
    
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::writing::components::ideas::types::Entity",
        from = "Column::IdeaId",
        to = "crate::writing::components::ideas::types::Column::Id"
    )]
    Idea,
    
    #[sea_orm(
        belongs_to = "super::reference_items::Entity",
        from = "Column::ReferenceId",
        to = "super::reference_items::Column::Id"
    )]
    Reference,
}

impl Related<crate::writing::components::ideas::types::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Idea.def()
    }
}

impl Related<super::reference_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reference.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
