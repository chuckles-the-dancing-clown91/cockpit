use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // App Settings Table
        manager
            .create_table(
                Table::create()
                    .table(AppSettings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AppSettings::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AppSettings::Key)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(AppSettings::Value).text().not_null())
                    .col(ColumnDef::new(AppSettings::ValueType).string().not_null())
                    .col(ColumnDef::new(AppSettings::Category).string().not_null())
                    .col(ColumnDef::new(AppSettings::Description).text())
                    .col(
                        ColumnDef::new(AppSettings::IsEncrypted)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AppSettings::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(AppSettings::UpdatedAt)
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
                    .name("idx_app_settings_key")
                    .table(AppSettings::Table)
                    .col(AppSettings::Key)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_app_settings_category")
                    .table(AppSettings::Table)
                    .col(AppSettings::Category)
                    .to_owned(),
            )
            .await?;

        // Seed default settings
        let settings = vec![
            // General Settings
            ("app.theme", "dark", "string", "appearance", "App theme: light, dark, or cyberpunk", 0),
            ("app.auto_start", "false", "boolean", "general", "Launch app on system startup", 0),
            ("app.minimize_to_tray", "true", "boolean", "general", "Minimize to system tray instead of taskbar", 0),
            ("app.notifications_enabled", "true", "boolean", "general", "Show desktop notifications", 0),
            // News Settings
            ("news.auto_sync", "true", "boolean", "news", "Automatically sync news articles", 0),
            ("news.sync_interval_minutes", "45", "number", "news", "Minutes between automatic syncs", 0),
            ("news.max_articles", "4000", "number", "news", "Maximum articles to store", 0),
            ("news.auto_dismiss_read", "false", "boolean", "news", "Auto-dismiss articles after reading", 0),
            ("news.newsdata_api_key", "", "string", "news", "NewsData.io API key", 1),
            // Writing Settings
            ("writing.auto_save", "true", "boolean", "writing", "Automatically save drafts while typing", 0),
            ("writing.auto_save_delay_ms", "600", "number", "writing", "Milliseconds to wait before auto-saving", 0),
            ("writing.default_status", "in_progress", "string", "writing", "Default status for new ideas", 0),
            ("writing.spell_check", "true", "boolean", "writing", "Enable spell checking", 0),
            // Storage & Maintenance
            ("storage.auto_cleanup", "true", "boolean", "advanced", "Automatically clean up old data", 0),
            ("storage.cleanup_days", "90", "number", "advanced", "Days to keep old articles", 0),
            ("storage.auto_backup", "true", "boolean", "advanced", "Automatically create backups", 0),
            ("storage.backup_interval_days", "7", "number", "advanced", "Days between automatic backups", 0),
            ("storage.max_backup_count", "10", "number", "advanced", "Maximum number of backups to keep", 0),
            // Logging
            ("logging.level", "info", "string", "advanced", "Log level: trace, debug, info, warn, error", 0),
            ("logging.max_file_size_mb", "50", "number", "advanced", "Maximum log file size in MB", 0),
            ("logging.max_files", "5", "number", "advanced", "Maximum number of log files to keep", 0),
        ];

        for (key, value, value_type, category, description, is_encrypted) in settings {
            manager
                .exec_stmt(
                    Query::insert()
                        .into_table(AppSettings::Table)
                        .columns([
                            AppSettings::Key,
                            AppSettings::Value,
                            AppSettings::ValueType,
                            AppSettings::Category,
                            AppSettings::Description,
                            AppSettings::IsEncrypted,
                        ])
                        .values_panic([
                            key.into(),
                            value.into(),
                            value_type.into(),
                            category.into(),
                            description.into(),
                            is_encrypted.into(),
                        ])
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppSettings::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AppSettings {
    Table,
    Id,
    Key,
    Value,
    ValueType,
    Category,
    Description,
    IsEncrypted,
    CreatedAt,
    UpdatedAt,
}
