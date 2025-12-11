use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "news_sources")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub source_id: String,
    pub name: String,
    pub url: Option<String>,
    pub country: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub is_active: i32,
    pub is_muted: i32,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
