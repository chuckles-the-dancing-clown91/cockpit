use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Index for fetching news articles filtered by user/dismissed status and sorted by date
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_news_articles_user_dismissed_published")
                    .table(NewsArticles::Table)
                    .col(NewsArticles::UserId)
                    .col(NewsArticles::IsDismissed)
                    .col(NewsArticles::PublishedAt)
                    .to_owned(),
            )
            .await?;

        // Index for URL-based lookups during news sync
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_news_articles_url_lookup")
                    .table(NewsArticles::Table)
                    .col(NewsArticles::UserId)
                    .col(NewsArticles::Provider)
                    .col(NewsArticles::Url)
                    .to_owned(),
            )
            .await?;

        // Index for read status filtering with dismissal
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_news_articles_read_status")
                    .table(NewsArticles::Table)
                    .col(NewsArticles::UserId)
                    .col(NewsArticles::IsRead)
                    .col(NewsArticles::IsDismissed)
                    .col(NewsArticles::PublishedAt)
                    .to_owned(),
            )
            .await?;

        // Index for ideas filtering by status and date
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_ideas_status_updated")
                    .table(Ideas::Table)
                    .col(Ideas::Status)
                    .col(Ideas::DateRemoved)
                    .col(Ideas::DateUpdated)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_ideas_status_updated")
                    .table(Ideas::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_news_articles_read_status")
                    .table(NewsArticles::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_news_articles_url_lookup")
                    .table(NewsArticles::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_news_articles_user_dismissed_published")
                    .table(NewsArticles::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum NewsArticles {
    Table,
    UserId,
    Provider,
    Url,
    PublishedAt,
    IsDismissed,
    IsRead,
}

#[derive(DeriveIden)]
enum Ideas {
    Table,
    Status,
    DateRemoved,
    DateUpdated,
}
