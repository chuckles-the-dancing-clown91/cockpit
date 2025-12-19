use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add 'notes' column to writing_idea_links
        manager
            .alter_table(
                Table::alter()
                    .table(WritingIdeaLinks::Table)
                    .add_column(ColumnDef::new(WritingIdeaLinks::Notes).text())
                    .to_owned(),
            )
            .await?;

        // Rename 'sort_order' to 'link_order' for consistency with entity model
        // SQLite doesn't support column rename directly, so we need to:
        // 1. Add new column
        // 2. Copy data
        // 3. Drop old column (if supported)
        
        manager
            .alter_table(
                Table::alter()
                    .table(WritingIdeaLinks::Table)
                    .add_column(
                        ColumnDef::new(WritingIdeaLinks::LinkOrder)
                            .integer()
                            .not_null()
                            .default(0)
                    )
                    .to_owned(),
            )
            .await?;

        // Copy data from sort_order to link_order
        manager
            .exec_stmt(
                Query::update()
                    .table(WritingIdeaLinks::Table)
                    .value(WritingIdeaLinks::LinkOrder, Expr::col(WritingIdeaLinks::SortOrder))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove 'notes' column
        manager
            .alter_table(
                Table::alter()
                    .table(WritingIdeaLinks::Table)
                    .drop_column(WritingIdeaLinks::Notes)
                    .to_owned(),
            )
            .await?;

        // Remove 'link_order' column
        manager
            .alter_table(
                Table::alter()
                    .table(WritingIdeaLinks::Table)
                    .drop_column(WritingIdeaLinks::LinkOrder)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum WritingIdeaLinks {
    Table,
    Notes,
    SortOrder,
    LinkOrder,
}
