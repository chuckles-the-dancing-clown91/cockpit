use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "news_articles")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub user_id: i64,
    pub provider: String,
    pub provider_article_id: Option<String>,
    pub source_name: Option<String>,
    pub source_domain: Option<String>,
    pub source_id: Option<String>,
    pub title: String,
    pub excerpt: Option<String>,
    pub content: Option<String>,
    pub tags: Option<String>,
    pub url: Option<String>,
    pub image_url: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub country: Option<String>,
    pub published_at: Option<DateTimeUtc>,
    pub fetched_at: DateTimeUtc,
    pub added_via: String,
    pub is_starred: i32,
    pub is_dismissed: i32,
    pub added_to_ideas_at: Option<DateTimeUtc>,
    pub dismissed_at: Option<DateTimeUtc>,
    pub is_pinned: i32,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
