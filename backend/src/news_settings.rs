use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "news_settings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub user_id: i64,
    pub provider: String,
    pub api_key_encrypted: Vec<u8>,
    pub language: Option<String>,
    pub languages: Option<String>,
    pub countries: Option<String>,
    pub categories: Option<String>,
    pub sources: Option<String>,
    pub query: Option<String>,
    pub keywords_in_title: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub max_stored: Option<i64>,
    pub max_articles: i64,
    pub daily_call_limit: i64,
    pub calls_today: i64,
    pub last_reset_date: Option<Date>,
    pub last_synced_at: Option<DateTimeUtc>,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
