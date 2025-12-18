use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Idea References Table
        manager
            .create_table(
                Table::create()
                    .table(IdeaReferences::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IdeaReferences::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(IdeaReferences::IdeaId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(IdeaReferences::ReferenceType)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(IdeaReferences::NewsArticleId).big_integer())
                    .col(ColumnDef::new(IdeaReferences::Title).string())
                    .col(ColumnDef::new(IdeaReferences::Url).string())
                    .col(ColumnDef::new(IdeaReferences::Description).text())
                    .col(ColumnDef::new(IdeaReferences::NotesMarkdown).text())
                    .col(ColumnDef::new(IdeaReferences::SourceId).big_integer())
                    .col(
                        ColumnDef::new(IdeaReferences::AddedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(IdeaReferences::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_idea_references_idea")
                            .from(IdeaReferences::Table, IdeaReferences::IdeaId)
                            .to(Ideas::Table, Ideas::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_idea_references_news_article")
                            .from(IdeaReferences::Table, IdeaReferences::NewsArticleId)
                            .to(NewsArticles::Table, NewsArticles::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_idea_references_feed_source")
                            .from(IdeaReferences::Table, IdeaReferences::SourceId)
                            .to(FeedSources::Table, FeedSources::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes for performance
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_references_idea_id")
                    .table(IdeaReferences::Table)
                    .col(IdeaReferences::IdeaId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_references_news_article_id")
                    .table(IdeaReferences::Table)
                    .col(IdeaReferences::NewsArticleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_references_added_at")
                    .table(IdeaReferences::Table)
                    .col(IdeaReferences::AddedAt)
                    .to_owned(),
            )
            .await?;

        // Migrate existing news_article_id from ideas table
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(IdeaReferences::Table)
                    .columns([
                        IdeaReferences::IdeaId,
                        IdeaReferences::ReferenceType,
                        IdeaReferences::NewsArticleId,
                        IdeaReferences::AddedAt,
                        IdeaReferences::UpdatedAt,
                    ])
                    .select_from(
                        Query::select()
                            .column(Ideas::Id)
                            .expr(SimpleExpr::Value("article".into()))
                            .column(Ideas::NewsArticleId)
                            .column(Ideas::DateAdded)
                            .column(Ideas::DateUpdated)
                            .from(Ideas::Table)
                            .and_where(Expr::col(Ideas::NewsArticleId).is_not_null())
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(IdeaReferences::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum IdeaReferences {
    Table,
    Id,
    IdeaId,
    ReferenceType,
    NewsArticleId,
    Title,
    Url,
    Description,
    NotesMarkdown,
    SourceId,
    AddedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Ideas {
    Table,
    Id,
    NewsArticleId,
    DateAdded,
    DateUpdated,
}

#[derive(DeriveIden)]
enum NewsArticles {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum FeedSources {
    Table,
    Id,
}
