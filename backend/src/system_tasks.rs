use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "system_tasks")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub name: String,
    pub task_type: String,
    pub component: String,
    pub frequency_cron: Option<String>,
    pub frequency_seconds: Option<i64>,
    pub enabled: i32,
    pub last_run_at: Option<DateTimeUtc>,
    pub last_status: Option<String>,
    pub last_result: Option<String>,
    pub error_count: i64,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub type EntitySystemTasks = Entity;
pub type ColumnSystemTasks = Column;
