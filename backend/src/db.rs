use crate::errors::AppError;
use crate::{ideas, news_articles, news_settings, news_sources, system_task_runs, system_tasks};
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{
    ColumnDef, ForeignKey, ForeignKeyAction, SqliteQueryBuilder, Table, TableCreateStatement,
};
use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, EntityName, Schema, Statement,
};
use std::path::PathBuf;

pub async fn init_db_from_env() -> Result<DatabaseConnection, AppError> {
    let db_path = std::env::var("COCKPIT_DB_PATH").unwrap_or_else(|_| "cockpit.sqlite".into());
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| format!("sqlite:{db_path}"));
    init_db(&db_url).await
}

pub async fn init_db(db_url: &str) -> Result<DatabaseConnection, AppError> {
    let is_sqlite = db_url.starts_with("sqlite:");
    if is_sqlite {
        if let Some(path) = db_url
            .trim_start_matches("sqlite:")
            .strip_prefix("//")
            .or_else(|| db_url.trim_start_matches("sqlite:").strip_prefix(""))
        {
            if let Some(parent) = PathBuf::from(path).parent() {
                std::fs::create_dir_all(parent)?;
            }
            let _ = std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .open(path)?;
        }
    } else {
        return Err(AppError::Config(format!(
            "Only sqlite is supported currently. DATABASE_URL={db_url}"
        )));
    }

    let mut opt = ConnectOptions::new(db_url.to_string());
    opt.max_connections(5)
        .min_connections(1)
        .sqlx_logging(false);
    let db = Database::connect(opt).await?;

    let builder = db.get_database_backend();
    let schema = Schema::new(builder);

    let create_tasks: TableCreateStatement = Table::create()
        .table(system_tasks::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(system_tasks::Column::Id)
                .integer()
                .not_null()
                .primary_key()
                .auto_increment(),
        )
        .col(
            ColumnDef::new(system_tasks::Column::Name)
                .string()
                .not_null(),
        )
        .col(
            ColumnDef::new(system_tasks::Column::TaskType)
                .string()
                .not_null(),
        )
        .col(
            ColumnDef::new(system_tasks::Column::Component)
                .string()
                .not_null(),
        )
        .col(ColumnDef::new(system_tasks::Column::FrequencyCron).string())
        .col(ColumnDef::new(system_tasks::Column::FrequencySeconds).integer())
        .col(
            ColumnDef::new(system_tasks::Column::Enabled)
                .integer()
                .not_null()
                .default(1),
        )
        .col(ColumnDef::new(system_tasks::Column::LastRunAt).date_time())
        .col(ColumnDef::new(system_tasks::Column::LastStatus).string())
        .col(ColumnDef::new(system_tasks::Column::LastResult).string())
        .col(
            ColumnDef::new(system_tasks::Column::ErrorCount)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(system_tasks::Column::CreatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(system_tasks::Column::UpdatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_tasks.to_string(SqliteQueryBuilder),
    ))
    .await?;

    // Deduplicate seeded tasks and enforce uniqueness on task_type
    db.execute(Statement::from_sql_and_values(
        builder,
        r#"DELETE FROM system_tasks WHERE id NOT IN (SELECT MIN(id) FROM system_tasks GROUP BY task_type)"#,
        vec![],
    ))
    .await?;
    db.execute(Statement::from_sql_and_values(
        builder,
        r#"CREATE UNIQUE INDEX IF NOT EXISTS idx_system_tasks_task_type ON system_tasks (task_type)"#,
        vec![],
    ))
    .await?;

    let create_runs: TableCreateStatement = Table::create()
        .table(system_task_runs::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(system_task_runs::Column::Id)
                .integer()
                .primary_key()
                .auto_increment()
                .not_null(),
        )
        .col(
            ColumnDef::new(system_task_runs::Column::TaskId)
                .integer()
                .not_null(),
        )
        .col(
            ColumnDef::new(system_task_runs::Column::StartedAt)
                .date_time()
                .not_null(),
        )
        .col(ColumnDef::new(system_task_runs::Column::FinishedAt).date_time())
        .col(
            ColumnDef::new(system_task_runs::Column::Status)
                .string()
                .not_null(),
        )
        .col(ColumnDef::new(system_task_runs::Column::Result).string())
        .col(ColumnDef::new(system_task_runs::Column::ErrorMessage).string())
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_runs.to_string(SqliteQueryBuilder),
    ))
    .await?;

    let create_settings: TableCreateStatement = Table::create()
        .table(news_settings::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(news_settings::Column::Id)
                .integer()
                .primary_key()
                .auto_increment()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_settings::Column::UserId)
                .integer()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_settings::Column::Provider)
                .string()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_settings::Column::ApiKeyEncrypted)
                .binary()
                .not_null(),
        )
        .col(ColumnDef::new(news_settings::Column::Language).string())
        .col(ColumnDef::new(news_settings::Column::Languages).string())
        .col(ColumnDef::new(news_settings::Column::Countries).string())
        .col(ColumnDef::new(news_settings::Column::Categories).string())
        .col(ColumnDef::new(news_settings::Column::Sources).string())
        .col(ColumnDef::new(news_settings::Column::Query).string())
        .col(ColumnDef::new(news_settings::Column::KeywordsInTitle).string())
        .col(ColumnDef::new(news_settings::Column::FromDate).string())
        .col(ColumnDef::new(news_settings::Column::ToDate).string())
        .col(ColumnDef::new(news_settings::Column::MaxStored).integer())
        .col(
            ColumnDef::new(news_settings::Column::MaxArticles)
                .integer()
                .not_null()
                .default(4000),
        )
        .col(
            ColumnDef::new(news_settings::Column::DailyCallLimit)
                .integer()
                .not_null()
                .default(180),
        )
        .col(
            ColumnDef::new(news_settings::Column::CallsToday)
                .integer()
                .not_null()
                .default(0),
        )
        .col(ColumnDef::new(news_settings::Column::LastResetDate).date())
        .col(ColumnDef::new(news_settings::Column::LastSyncedAt).date_time())
        .col(
            ColumnDef::new(news_settings::Column::CreatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(news_settings::Column::UpdatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_settings.to_string(SqliteQueryBuilder),
    ))
    .await?;

    let create_articles: TableCreateStatement = Table::create()
        .table(news_articles::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(news_articles::Column::Id)
                .integer()
                .primary_key()
                .auto_increment()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_articles::Column::UserId)
                .integer()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_articles::Column::Provider)
                .string()
                .not_null(),
        )
        .col(ColumnDef::new(news_articles::Column::ProviderArticleId).string())
        .col(ColumnDef::new(news_articles::Column::SourceName).string())
        .col(ColumnDef::new(news_articles::Column::SourceDomain).string())
        .col(ColumnDef::new(news_articles::Column::SourceId).string())
        .col(
            ColumnDef::new(news_articles::Column::Title)
                .string()
                .not_null(),
        )
        .col(ColumnDef::new(news_articles::Column::Excerpt).string())
        .col(ColumnDef::new(news_articles::Column::Content).string())
        .col(ColumnDef::new(news_articles::Column::Tags).string())
        .col(ColumnDef::new(news_articles::Column::Url).string())
        .col(ColumnDef::new(news_articles::Column::ImageUrl).string())
        .col(ColumnDef::new(news_articles::Column::Language).string())
        .col(ColumnDef::new(news_articles::Column::Category).string())
        .col(ColumnDef::new(news_articles::Column::Country).string())
        .col(ColumnDef::new(news_articles::Column::PublishedAt).date_time())
        .col(
            ColumnDef::new(news_articles::Column::FetchedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(news_articles::Column::AddedVia)
                .string()
                .not_null()
                .default("sync"),
        )
        .col(
            ColumnDef::new(news_articles::Column::IsStarred)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(news_articles::Column::IsDismissed)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(news_articles::Column::IsRead)
                .integer()
                .not_null()
                .default(0),
        )
        .col(ColumnDef::new(news_articles::Column::AddedToIdeasAt).date_time())
        .col(ColumnDef::new(news_articles::Column::DismissedAt).date_time())
        .col(
            ColumnDef::new(news_articles::Column::IsPinned)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(news_articles::Column::CreatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(news_articles::Column::UpdatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_articles.to_string(SqliteQueryBuilder),
    ))
    .await?;

    let create_ideas: TableCreateStatement = Table::create()
        .table(ideas::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(ideas::Column::Id)
                .integer()
                .not_null()
                .primary_key()
                .auto_increment(),
        )
        .col(ColumnDef::new(ideas::Column::Title).string().not_null())
        .col(ColumnDef::new(ideas::Column::Summary).string())
        .col(ColumnDef::new(ideas::Column::Status).string().not_null())
        .col(ColumnDef::new(ideas::Column::NewsArticleId).integer())
        .col(ColumnDef::new(ideas::Column::Target).string())
        .col(ColumnDef::new(ideas::Column::Tags).string())
        .col(ColumnDef::new(ideas::Column::NotesMarkdown).string())
        .col(ColumnDef::new(ideas::Column::ArticleTitle).string())
        .col(ColumnDef::new(ideas::Column::ArticleMarkdown).string())
        .col(
            ColumnDef::new(ideas::Column::DateAdded)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(ideas::Column::DateUpdated)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(ColumnDef::new(ideas::Column::DateCompleted).date_time())
        .col(ColumnDef::new(ideas::Column::DateRemoved).date_time())
        .col(
            ColumnDef::new(ideas::Column::Priority)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(ideas::Column::IsPinned)
                .integer()
                .not_null()
                .default(0),
        )
        .foreign_key(
            ForeignKey::create()
                .from(ideas::Entity, ideas::Column::NewsArticleId)
                .to(news_articles::Entity, news_articles::Column::Id)
                .on_delete(ForeignKeyAction::SetNull),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_ideas.to_string(SqliteQueryBuilder),
    ))
    .await?;

    let create_sources: TableCreateStatement = Table::create()
        .table(news_sources::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(news_sources::Column::Id)
                .integer()
                .primary_key()
                .auto_increment()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_sources::Column::SourceId)
                .string()
                .not_null(),
        )
        .col(
            ColumnDef::new(news_sources::Column::Name)
                .string()
                .not_null(),
        )
        .col(ColumnDef::new(news_sources::Column::Url).string())
        .col(ColumnDef::new(news_sources::Column::Country).string())
        .col(ColumnDef::new(news_sources::Column::Language).string())
        .col(ColumnDef::new(news_sources::Column::Category).string())
        .col(
            ColumnDef::new(news_sources::Column::IsActive)
                .integer()
                .not_null()
                .default(1),
        )
        .col(
            ColumnDef::new(news_sources::Column::IsMuted)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(news_sources::Column::CreatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .col(
            ColumnDef::new(news_sources::Column::UpdatedAt)
                .date_time()
                .not_null()
                .default(Expr::current_timestamp()),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_sources.to_string(SqliteQueryBuilder),
    ))
    .await?;

    let create_ideas: TableCreateStatement = Table::create()
        .table(ideas::Entity.table_ref())
        .if_not_exists()
        .col(
            ColumnDef::new(ideas::Column::Id)
                .integer()
                .primary_key()
                .auto_increment()
                .not_null(),
        )
        .col(ColumnDef::new(ideas::Column::Title).string().not_null())
        .col(ColumnDef::new(ideas::Column::Summary).string())
        .col(ColumnDef::new(ideas::Column::Status).string().not_null())
        .col(ColumnDef::new(ideas::Column::NewsArticleId).integer())
        .col(ColumnDef::new(ideas::Column::Target).string())
        .col(ColumnDef::new(ideas::Column::Tags).string())
        .col(ColumnDef::new(ideas::Column::NotesMarkdown).string())
        .col(ColumnDef::new(ideas::Column::ArticleTitle).string())
        .col(ColumnDef::new(ideas::Column::ArticleMarkdown).string())
        .col(
            ColumnDef::new(ideas::Column::DateAdded)
                .date_time()
                .not_null(),
        )
        .col(
            ColumnDef::new(ideas::Column::DateUpdated)
                .date_time()
                .not_null(),
        )
        .col(ColumnDef::new(ideas::Column::DateCompleted).date_time())
        .col(ColumnDef::new(ideas::Column::DateRemoved).date_time())
        .col(
            ColumnDef::new(ideas::Column::Priority)
                .integer()
                .not_null()
                .default(0),
        )
        .col(
            ColumnDef::new(ideas::Column::IsPinned)
                .integer()
                .not_null()
                .default(0),
        )
        .to_owned();
    db.execute(Statement::from_string(
        builder,
        create_ideas.to_string(SqliteQueryBuilder),
    ))
    .await?;

    // Lightweight column backfills for existing installs
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_settings ADD COLUMN language TEXT",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_settings ADD COLUMN keywords_in_title TEXT",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_settings ADD COLUMN from_date TEXT",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_settings ADD COLUMN to_date TEXT",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_settings ADD COLUMN max_stored INTEGER",
            vec![],
        ))
        .await;

    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN source_id TEXT",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN country TEXT",
            vec![],
        ))
        .await;
    let _ = db.execute(Statement::from_sql_and_values(builder, "ALTER TABLE news_articles ADD COLUMN fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL", vec![])).await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN added_via TEXT DEFAULT 'sync' NOT NULL",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN is_starred INTEGER DEFAULT 0 NOT NULL",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN is_dismissed INTEGER DEFAULT 0 NOT NULL",
            vec![],
        ))
        .await;
    let _ = db
        .execute(Statement::from_sql_and_values(
            builder,
            "ALTER TABLE news_articles ADD COLUMN is_read INTEGER DEFAULT 0 NOT NULL",
            vec![],
        ))
        .await;

    // Seed news_sync task
    db.execute(Statement::from_sql_and_values(
        builder,
        r#"
        INSERT OR IGNORE INTO system_tasks
            (name, task_type, component, frequency_cron, frequency_seconds, enabled, created_at, updated_at)
        VALUES
            ('NewsData Sync', 'news_sync', 'news', '0 0/45 * * * * *', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        "#,
        vec![],
    ))
    .await?;
    db.execute(Statement::from_sql_and_values(
        builder,
        r#"
        INSERT OR IGNORE INTO system_tasks
            (name, task_type, component, frequency_cron, frequency_seconds, enabled, created_at, updated_at)
        VALUES
            ('News Sources Sync', 'news_sources_sync', 'news', '0 0 2 * * * *', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        "#,
        vec![],
    ))
    .await?;

    Ok(db)
}
