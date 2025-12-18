use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Reference Items Table
        manager
            .create_table(
                Table::create()
                    .table(ReferenceItems::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReferenceItems::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ReferenceItems::ReferenceType)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ReferenceItems::Title).string().not_null())
                    .col(ColumnDef::new(ReferenceItems::Url).string())
                    .col(ColumnDef::new(ReferenceItems::Source).string())
                    .col(ColumnDef::new(ReferenceItems::Author).string())
                    .col(ColumnDef::new(ReferenceItems::PublishedAt).timestamp())
                    .col(ColumnDef::new(ReferenceItems::NewsArticleId).big_integer())
                    .col(ColumnDef::new(ReferenceItems::Metadata).text())
                    .col(
                        ColumnDef::new(ReferenceItems::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReferenceItems::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reference_items_news_article")
                            .from(ReferenceItems::Table, ReferenceItems::NewsArticleId)
                            .to(NewsArticles::Table, NewsArticles::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique index on reference_type + url (when url is not NULL)
        // Note: SQLite doesn't support partial indexes in SeaORM, so we create a normal unique index
        // The application layer should handle NULL url cases
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_references_unique_url")
                    .table(ReferenceItems::Table)
                    .col(ReferenceItems::ReferenceType)
                    .col(ReferenceItems::Url)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_references_type")
                    .table(ReferenceItems::Table)
                    .col(ReferenceItems::ReferenceType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_references_news_article")
                    .table(ReferenceItems::Table)
                    .col(ReferenceItems::NewsArticleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_references_created_at")
                    .table(ReferenceItems::Table)
                    .col(ReferenceItems::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Writings Table
        manager
            .create_table(
                Table::create()
                    .table(Writings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Writings::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Writings::Type)
                            .string()
                            .not_null()
                            .default("article"),
                    )
                    .col(ColumnDef::new(Writings::Title).string().not_null())
                    .col(ColumnDef::new(Writings::Slug).string().unique_key())
                    .col(
                        ColumnDef::new(Writings::ContentMarkdown)
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Writings::Excerpt).text())
                    .col(
                        ColumnDef::new(Writings::Status)
                            .string()
                            .not_null()
                            .default("draft"),
                    )
                    .col(ColumnDef::new(Writings::Tags).text())
                    .col(ColumnDef::new(Writings::WordCount).integer().default(0))
                    .col(ColumnDef::new(Writings::SeriesName).string())
                    .col(ColumnDef::new(Writings::SeriesPart).integer())
                    .col(
                        ColumnDef::new(Writings::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Writings::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Writings::PublishedAt).timestamp())
                    .col(
                        ColumnDef::new(Writings::IsPinned)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Writings::IsFeatured)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writings_type")
                    .table(Writings::Table)
                    .col(Writings::Type)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writings_status")
                    .table(Writings::Table)
                    .col(Writings::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writings_published_at")
                    .table(Writings::Table)
                    .col(Writings::PublishedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writings_series")
                    .table(Writings::Table)
                    .col(Writings::SeriesName)
                    .col(Writings::SeriesPart)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writings_updated_at")
                    .table(Writings::Table)
                    .col(Writings::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        // Idea Reference Links Table
        manager
            .create_table(
                Table::create()
                    .table(IdeaReferenceLinks::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IdeaReferenceLinks::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(IdeaReferenceLinks::IdeaId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(IdeaReferenceLinks::ReferenceId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(IdeaReferenceLinks::Role).string())
                    .col(
                        ColumnDef::new(IdeaReferenceLinks::SortOrder)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(IdeaReferenceLinks::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_idea_reference_links_idea")
                            .from(IdeaReferenceLinks::Table, IdeaReferenceLinks::IdeaId)
                            .to(Ideas::Table, Ideas::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_idea_reference_links_reference")
                            .from(IdeaReferenceLinks::Table, IdeaReferenceLinks::ReferenceId)
                            .to(ReferenceItems::Table, ReferenceItems::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_reference_unique")
                    .table(IdeaReferenceLinks::Table)
                    .col(IdeaReferenceLinks::IdeaId)
                    .col(IdeaReferenceLinks::ReferenceId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_reference_links_idea")
                    .table(IdeaReferenceLinks::Table)
                    .col(IdeaReferenceLinks::IdeaId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_idea_reference_links_reference")
                    .table(IdeaReferenceLinks::Table)
                    .col(IdeaReferenceLinks::ReferenceId)
                    .to_owned(),
            )
            .await?;

        // Writing Idea Links Table
        manager
            .create_table(
                Table::create()
                    .table(WritingIdeaLinks::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WritingIdeaLinks::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(WritingIdeaLinks::WritingId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WritingIdeaLinks::IdeaId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(WritingIdeaLinks::Purpose).string())
                    .col(
                        ColumnDef::new(WritingIdeaLinks::SortOrder)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(WritingIdeaLinks::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_writing_idea_links_writing")
                            .from(WritingIdeaLinks::Table, WritingIdeaLinks::WritingId)
                            .to(Writings::Table, Writings::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_writing_idea_links_idea")
                            .from(WritingIdeaLinks::Table, WritingIdeaLinks::IdeaId)
                            .to(Ideas::Table, Ideas::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writing_idea_unique")
                    .table(WritingIdeaLinks::Table)
                    .col(WritingIdeaLinks::WritingId)
                    .col(WritingIdeaLinks::IdeaId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writing_idea_links_writing")
                    .table(WritingIdeaLinks::Table)
                    .col(WritingIdeaLinks::WritingId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_writing_idea_links_idea")
                    .table(WritingIdeaLinks::Table)
                    .col(WritingIdeaLinks::IdeaId)
                    .to_owned(),
            )
            .await?;

        // Notes Table
        manager
            .create_table(
                Table::create()
                    .table(Notes::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Notes::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Notes::EntityType).string().not_null())
                    .col(ColumnDef::new(Notes::EntityId).big_integer().not_null())
                    .col(ColumnDef::new(Notes::BodyMarkdown).text().not_null())
                    .col(ColumnDef::new(Notes::NoteType).string())
                    .col(
                        ColumnDef::new(Notes::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Notes::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notes_entity")
                    .table(Notes::Table)
                    .col(Notes::EntityType)
                    .col(Notes::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notes_type")
                    .table(Notes::Table)
                    .col(Notes::NoteType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notes_created_at")
                    .table(Notes::Table)
                    .col(Notes::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Notes::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(WritingIdeaLinks::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(IdeaReferenceLinks::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Writings::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ReferenceItems::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum ReferenceItems {
    Table,
    Id,
    ReferenceType,
    Title,
    Url,
    Source,
    Author,
    PublishedAt,
    NewsArticleId,
    Metadata,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum NewsArticles {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Writings {
    Table,
    Id,
    Type,
    Title,
    Slug,
    ContentMarkdown,
    Excerpt,
    Status,
    Tags,
    WordCount,
    SeriesName,
    SeriesPart,
    CreatedAt,
    UpdatedAt,
    PublishedAt,
    IsPinned,
    IsFeatured,
}

#[derive(DeriveIden)]
enum IdeaReferenceLinks {
    Table,
    Id,
    IdeaId,
    ReferenceId,
    Role,
    SortOrder,
    CreatedAt,
}

#[derive(DeriveIden)]
enum WritingIdeaLinks {
    Table,
    Id,
    WritingId,
    IdeaId,
    Purpose,
    SortOrder,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Notes {
    Table,
    Id,
    EntityType,
    EntityId,
    BodyMarkdown,
    NoteType,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Ideas {
    Table,
    Id,
}
