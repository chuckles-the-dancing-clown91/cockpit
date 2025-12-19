//! Writing ↔ Idea Links Entity
//!
//! Many-to-many join table with purpose field

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Writing-Idea link model
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "writing_idea_links")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    
    pub writing_id: i64,
    pub idea_id: i64,
    
    #[sea_orm(column_name = "purpose")]
    pub purpose: Option<String>,
    
    #[sea_orm(column_name = "sort_order")]
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
