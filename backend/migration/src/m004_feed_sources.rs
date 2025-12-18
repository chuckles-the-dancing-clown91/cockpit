use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Feed Sources Table
        manager
            .create_table(
                Table::create()
                    .table(FeedSources::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(FeedSources::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(FeedSources::Name).string().not_null())
                    .col(ColumnDef::new(FeedSources::SourceType).string().not_null())
                    .col(
                        ColumnDef::new(FeedSources::Enabled)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(FeedSources::ApiKeyEncrypted).binary())
                    .col(ColumnDef::new(FeedSources::Config).text())
                    .col(ColumnDef::new(FeedSources::TaskId).big_integer())
                    .col(ColumnDef::new(FeedSources::LastSyncAt).timestamp())
                    .col(ColumnDef::new(FeedSources::LastError).text())
                    .col(
                        ColumnDef::new(FeedSources::ArticleCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(FeedSources::ErrorCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(FeedSources::ApiCallsToday)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(FeedSources::ApiQuotaDaily).integer())
                    .col(ColumnDef::new(FeedSources::LastQuotaReset).date())
                    .col(
                        ColumnDef::new(FeedSources::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(FeedSources::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_feed_sources_task")
                            .from(FeedSources::Table, FeedSources::TaskId)
                            .to(SystemTasks::Table, SystemTasks::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes for feed_sources
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_feed_sources_source_type")
                    .table(FeedSources::Table)
                    .col(FeedSources::SourceType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_feed_sources_enabled")
                    .table(FeedSources::Table)
                    .col(FeedSources::Enabled)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_feed_sources_task_id")
                    .table(FeedSources::Table)
                    .col(FeedSources::TaskId)
                    .to_owned(),
            )
            .await?;

        // Add feed_source_id to news_articles
        manager
            .alter_table(
                Table::alter()
                    .table(NewsArticles::Table)
                    .add_column(ColumnDef::new(NewsArticles::FeedSourceId).big_integer())
                    .to_owned(),
            )
            .await?;

        // Index for feed_source_id lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_news_articles_feed_source_id")
                    .table(NewsArticles::Table)
                    .col(NewsArticles::FeedSourceId)
                    .to_owned(),
            )
            .await?;

        // Remove old hardcoded news sync tasks
        manager
            .exec_stmt(
                Query::delete()
                    .from_table(SystemTasks::Table)
                    .and_where(Expr::col(SystemTasks::TaskType).eq("news_sync"))
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::delete()
                    .from_table(SystemTasks::Table)
                    .and_where(Expr::col(SystemTasks::TaskType).eq("news_sources_sync"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop index first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_news_articles_feed_source_id")
                    .table(NewsArticles::Table)
                    .to_owned(),
            )
            .await?;

        // Drop column from news_articles
        manager
            .alter_table(
                Table::alter()
                    .table(NewsArticles::Table)
                    .drop_column(NewsArticles::FeedSourceId)
                    .to_owned(),
            )
            .await?;

        // Drop feed_sources table
        manager
            .drop_table(Table::drop().table(FeedSources::Table).to_owned())
            .await?;

        // Re-add the old system tasks
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(SystemTasks::Table)
                    .columns([
                        SystemTasks::Name,
                        SystemTasks::TaskType,
                        SystemTasks::Component,
                        SystemTasks::FrequencyCron,
                        SystemTasks::Enabled,
                    ])
                    .values_panic([
                        "NewsData Sync".into(),
                        "news_sync".into(),
                        "news".into(),
                        "0 0/45 * * * * *".into(),
                        1.into(),
                    ])
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(SystemTasks::Table)
                    .columns([
                        SystemTasks::Name,
                        SystemTasks::TaskType,
                        SystemTasks::Component,
                        SystemTasks::FrequencyCron,
                        SystemTasks::Enabled,
                    ])
                    .values_panic([
                        "News Sources Sync".into(),
                        "news_sources_sync".into(),
                        "news".into(),
                        "0 0 2 * * * *".into(),
                        1.into(),
                    ])
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum FeedSources {
    Table,
    Id,
    Name,
    SourceType,
    Enabled,
    ApiKeyEncrypted,
    Config,
    TaskId,
    LastSyncAt,
    LastError,
    ArticleCount,
    ErrorCount,
    ApiCallsToday,
    ApiQuotaDaily,
    LastQuotaReset,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum NewsArticles {
    Table,
    FeedSourceId,
}

#[derive(DeriveIden)]
enum SystemTasks {
    Table,
    Id,
    Name,
    TaskType,
    Component,
    FrequencyCron,
    Enabled,
}
