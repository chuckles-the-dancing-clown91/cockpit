use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ReaderReferences::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReaderReferences::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ReaderReferences::Url).string().not_null())
                    .col(ColumnDef::new(ReaderReferences::Title).string().not_null())
                    .col(ColumnDef::new(ReaderReferences::Byline).string())
                    .col(ColumnDef::new(ReaderReferences::Excerpt).text())
                    .col(ColumnDef::new(ReaderReferences::TagsJson).text())
                    .col(
                        ColumnDef::new(ReaderReferences::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReaderReferences::UpdatedAt)
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
                    .name("idx_reader_references_url")
                    .table(ReaderReferences::Table)
                    .col(ReaderReferences::Url)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(ReaderSnapshots::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReaderSnapshots::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ReaderSnapshots::ReferenceId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReaderSnapshots::FetchedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ReaderSnapshots::Title).string())
                    .col(ColumnDef::new(ReaderSnapshots::Byline).string())
                    .col(ColumnDef::new(ReaderSnapshots::Excerpt).text())
                    .col(ColumnDef::new(ReaderSnapshots::FinalUrl).string())
                    .col(
                        ColumnDef::new(ReaderSnapshots::ContentMd)
                            .text()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ReaderSnapshots::WordCount).integer())
                    .col(ColumnDef::new(ReaderSnapshots::ReadingTimeMinutes).integer())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reader_snapshots_reference")
                            .from(ReaderSnapshots::Table, ReaderSnapshots::ReferenceId)
                            .to(ReaderReferences::Table, ReaderReferences::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reader_snapshots_reference")
                    .table(ReaderSnapshots::Table)
                    .col(ReaderSnapshots::ReferenceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reader_snapshots_fetched_at")
                    .table(ReaderSnapshots::Table)
                    .col(ReaderSnapshots::FetchedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(ReaderClips::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReaderClips::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ReaderClips::ReferenceId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReaderClips::SnapshotId)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ReaderClips::Quote).text().not_null())
                    .col(ColumnDef::new(ReaderClips::Anchor).string())
                    .col(
                        ColumnDef::new(ReaderClips::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reader_clips_reference")
                            .from(ReaderClips::Table, ReaderClips::ReferenceId)
                            .to(ReaderReferences::Table, ReaderReferences::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reader_clips_snapshot")
                            .from(ReaderClips::Table, ReaderClips::SnapshotId)
                            .to(ReaderSnapshots::Table, ReaderSnapshots::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reader_clips_reference")
                    .table(ReaderClips::Table)
                    .col(ReaderClips::ReferenceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reader_clips_snapshot")
                    .table(ReaderClips::Table)
                    .col(ReaderClips::SnapshotId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ReaderClips::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ReaderSnapshots::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ReaderReferences::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum ReaderReferences {
    Table,
    Id,
    Url,
    Title,
    Byline,
    Excerpt,
    TagsJson,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ReaderSnapshots {
    Table,
    Id,
    ReferenceId,
    FetchedAt,
    Title,
    Byline,
    Excerpt,
    FinalUrl,
    ContentMd,
    WordCount,
    ReadingTimeMinutes,
}

#[derive(DeriveIden)]
enum ReaderClips {
    Table,
    Id,
    ReferenceId,
    SnapshotId,
    Quote,
    Anchor,
    CreatedAt,
}
