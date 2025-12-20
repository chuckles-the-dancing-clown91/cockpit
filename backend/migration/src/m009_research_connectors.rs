use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // research_accounts: external integrations (auth + permissions)
        manager
            .create_table(
                Table::create()
                    .table(ResearchAccounts::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ResearchAccounts::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ResearchAccounts::Provider).string().not_null())
                    .col(ColumnDef::new(ResearchAccounts::DisplayName).string().not_null())
                    .col(
                        ColumnDef::new(ResearchAccounts::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(ResearchAccounts::AllowedCapsJson)
                            .text()
                            .not_null()
                            .default("[]"),
                    )
                    .col(ColumnDef::new(ResearchAccounts::PermissionsJson).text())
                    .col(ColumnDef::new(ResearchAccounts::AuthEncrypted).binary())
                    .col(
                        ColumnDef::new(ResearchAccounts::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ResearchAccounts::UpdatedAt)
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
                    .name("idx_research_accounts_provider")
                    .table(ResearchAccounts::Table)
                    .col(ResearchAccounts::Provider)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_accounts_enabled")
                    .table(ResearchAccounts::Table)
                    .col(ResearchAccounts::Enabled)
                    .to_owned(),
            )
            .await?;

        // research_streams: downstream sync jobs (filters + schedule) linked to an account
        manager
            .create_table(
                Table::create()
                    .table(ResearchStreams::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ResearchStreams::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ResearchStreams::AccountId).big_integer().not_null())
                    .col(ColumnDef::new(ResearchStreams::Name).string().not_null())
                    .col(ColumnDef::new(ResearchStreams::Provider).string().not_null())
                    .col(
                        ColumnDef::new(ResearchStreams::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(ResearchStreams::ConfigJson).text())
                    .col(ColumnDef::new(ResearchStreams::ScheduleJson).text())
                    .col(ColumnDef::new(ResearchStreams::LastSyncAt).timestamp())
                    .col(ColumnDef::new(ResearchStreams::LastError).text())
                    .col(
                        ColumnDef::new(ResearchStreams::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ResearchStreams::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_research_streams_account")
                            .from(ResearchStreams::Table, ResearchStreams::AccountId)
                            .to(ResearchAccounts::Table, ResearchAccounts::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_streams_account")
                    .table(ResearchStreams::Table)
                    .col(ResearchStreams::AccountId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_streams_provider")
                    .table(ResearchStreams::Table)
                    .col(ResearchStreams::Provider)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_streams_enabled")
                    .table(ResearchStreams::Table)
                    .col(ResearchStreams::Enabled)
                    .to_owned(),
            )
            .await?;

        // research_items: normalized ingested items across providers/streams
        manager
            .create_table(
                Table::create()
                    .table(ResearchItems::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ResearchItems::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ResearchItems::AccountId).big_integer())
                    .col(ColumnDef::new(ResearchItems::StreamId).big_integer())
                    .col(ColumnDef::new(ResearchItems::SourceType).string().not_null())
                    .col(ColumnDef::new(ResearchItems::ExternalId).string().not_null())
                    .col(ColumnDef::new(ResearchItems::Url).text())
                    .col(ColumnDef::new(ResearchItems::Title).string().not_null())
                    .col(ColumnDef::new(ResearchItems::Excerpt).text())
                    .col(ColumnDef::new(ResearchItems::Author).string())
                    .col(ColumnDef::new(ResearchItems::PublishedAt).timestamp())
                    .col(
                        ColumnDef::new(ResearchItems::Status)
                            .string()
                            .not_null()
                            .default("new"),
                    )
                    .col(ColumnDef::new(ResearchItems::TagsJson).text())
                    .col(ColumnDef::new(ResearchItems::PayloadJson).text())
                    .col(
                        ColumnDef::new(ResearchItems::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ResearchItems::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_research_items_account")
                            .from(ResearchItems::Table, ResearchItems::AccountId)
                            .to(ResearchAccounts::Table, ResearchAccounts::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_research_items_stream")
                            .from(ResearchItems::Table, ResearchItems::StreamId)
                            .to(ResearchStreams::Table, ResearchStreams::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_items_account")
                    .table(ResearchItems::Table)
                    .col(ResearchItems::AccountId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_items_stream")
                    .table(ResearchItems::Table)
                    .col(ResearchItems::StreamId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_research_items_status")
                    .table(ResearchItems::Table)
                    .col(ResearchItems::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uq_research_items_source_external")
                    .table(ResearchItems::Table)
                    .col(ResearchItems::SourceType)
                    .col(ResearchItems::ExternalId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ResearchItems::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ResearchStreams::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(ResearchAccounts::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum ResearchAccounts {
    Table,
    Id,
    Provider,
    DisplayName,
    Enabled,
    AllowedCapsJson,
    PermissionsJson,
    AuthEncrypted,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ResearchStreams {
    Table,
    Id,
    AccountId,
    Name,
    Provider,
    Enabled,
    ConfigJson,
    ScheduleJson,
    LastSyncAt,
    LastError,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ResearchItems {
    Table,
    Id,
    AccountId,
    StreamId,
    SourceType,
    ExternalId,
    Url,
    Title,
    Excerpt,
    Author,
    PublishedAt,
    Status,
    TagsJson,
    PayloadJson,
    CreatedAt,
    UpdatedAt,
}
