use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Set default note_type='main' for any existing notes that have NULL
        manager
            .exec_stmt(
                Query::update()
                    .table(Notes::Table)
                    .value(Notes::NoteType, "main")
                    .and_where(Expr::col(Notes::NoteType).is_null())
                    .to_owned(),
            )
            .await?;

        // Create unique index to enforce one note per entity per note_type
        // This prevents duplicate notes for the same entity
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notes_unique_entity_type")
                    .table(Notes::Table)
                    .col(Notes::EntityType)
                    .col(Notes::EntityId)
                    .col(Notes::NoteType)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the unique index
        manager
            .drop_index(
                Index::drop()
                    .name("idx_notes_unique_entity_type")
                    .table(Notes::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum Notes {
    Table,
    Id,
    EntityType,
    EntityId,
    NoteType,
    BodyMarkdown,
    CreatedAt,
    UpdatedAt,
}
