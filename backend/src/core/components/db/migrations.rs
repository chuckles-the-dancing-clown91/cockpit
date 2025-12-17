//! Database migration system for Architect Cockpit
//!
//! Provides a simple, custom migration system for SQLite:
//! - Version tracking
//! - Forward migrations
//! - Rollback capability
//! - Export/import functionality

use crate::core::components::errors::{AppError, AppResult};
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use std::collections::HashMap;
use tracing::{info, warn};

/// Migration definition
pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub up: &'static str,
    #[allow(dead_code)]
    pub down: &'static str,
}

/// Get all migrations in order
pub fn all_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            name: "initial_schema",
            up: include_str!("../../../../migrations/001_initial_schema_up.sql"),
            down: include_str!("../../../../migrations/001_initial_schema_down.sql"),
        },
        Migration {
            version: 2,
            name: "app_settings",
            up: include_str!("../../../../migrations/002_app_settings_up.sql"),
            down: include_str!("../../../../migrations/002_app_settings_down.sql"),
        },
        Migration {
            version: 3,
            name: "performance_indexes",
            up: include_str!("../../../../migrations/003_performance_indexes_up.sql"),
            down: include_str!("../../../../migrations/003_performance_indexes_down.sql"),
        },
        Migration {
            version: 4,
            name: "feed_sources",
            up: include_str!("../../../../migrations/004_feed_sources_up.sql"),
            down: include_str!("../../../../migrations/004_feed_sources_down.sql"),
        },
        Migration {
            version: 5,
            name: "idea_references",
            up: include_str!("../../../../migrations/005_idea_references_up.sql"),
            down: include_str!("../../../../migrations/005_idea_references_down.sql"),
        },
    ]
}

/// Ensure migration tracking table exists
async fn ensure_migration_table(db: &DatabaseConnection) -> AppResult<()> {
    let sql = r#"
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    "#;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        sql.to_string(),
    ))
    .await?;

    Ok(())
}

/// Get currently applied migrations
async fn get_applied_migrations(db: &DatabaseConnection) -> AppResult<HashMap<i32, String>> {
    let sql = "SELECT version, name FROM _migrations ORDER BY version";
    let result = db
        .query_all(Statement::from_string(
            db.get_database_backend(),
            sql.to_string(),
        ))
        .await?;

    let mut applied = HashMap::new();
    for row in result {
        let version: i32 = row.try_get("", "version")?;
        let name: String = row.try_get("", "name")?;
        applied.insert(version, name);
    }

    Ok(applied)
}

/// Apply all pending migrations
pub async fn run_migrations(db: &DatabaseConnection) -> AppResult<()> {
    ensure_migration_table(db).await?;

    let applied = get_applied_migrations(db).await?;
    let migrations = all_migrations();

    let mut count = 0;
    for migration in migrations {
        if applied.contains_key(&migration.version) {
            info!(
                "Migration {} ({}) already applied, skipping",
                migration.version, migration.name
            );
            continue;
        }

        info!(
            "Applying migration {} ({})",
            migration.version, migration.name
        );

        // Execute migration
        for statement in migration.up.split(';').filter(|s| !s.trim().is_empty()) {
            db.execute(Statement::from_string(
                db.get_database_backend(),
                statement.trim().to_string(),
            ))
            .await?;
        }

        // Record migration
        db.execute(Statement::from_sql_and_values(
            db.get_database_backend(),
            "INSERT INTO _migrations (version, name) VALUES (?, ?)",
            vec![migration.version.into(), migration.name.into()],
        ))
        .await?;

        count += 1;
        info!("✓ Migration {} applied successfully", migration.version);
    }

    if count == 0 {
        info!("Database is up to date");
    } else {
        info!("Applied {} migration(s)", count);
    }

    Ok(())
}

/// Rollback the most recent migration
#[allow(dead_code)]
pub async fn rollback_last_migration(db: &DatabaseConnection) -> AppResult<()> {
    ensure_migration_table(db).await?;

    let applied = get_applied_migrations(db).await?;
    if applied.is_empty() {
        warn!("No migrations to rollback");
        return Ok(());
    }

    let max_version = *applied
        .keys()
        .max()
        .ok_or_else(|| AppError::other("No migrations found"))?;
    let migrations = all_migrations();
    let migration = migrations
        .iter()
        .find(|m| m.version == max_version)
        .ok_or_else(|| AppError::other("Migration not found"))?;

    info!(
        "Rolling back migration {} ({})",
        migration.version, migration.name
    );

    // Execute rollback
    for statement in migration.down.split(';').filter(|s| !s.trim().is_empty()) {
        db.execute(Statement::from_string(
            db.get_database_backend(),
            statement.trim().to_string(),
        ))
        .await?;
    }

    // Remove migration record
    let delete_sql = format!(
        "DELETE FROM _migrations WHERE version = {}",
        migration.version
    );
    db.execute(Statement::from_string(
        db.get_database_backend(),
        delete_sql,
    ))
    .await?;

    info!("✓ Migration {} rolled back successfully", migration.version);
    Ok(())
}

/// Get current database version
pub async fn get_db_version(db: &DatabaseConnection) -> AppResult<Option<i32>> {
    ensure_migration_table(db).await?;

    let applied = get_applied_migrations(db).await?;
    Ok(applied.keys().max().copied())
}

/// Data migration: Move legacy NewsData settings to feed_sources
///
/// This is a one-time migration that runs after schema migrations.
/// It migrates existing app_settings for NewsData to the new feed_sources system.
pub async fn migrate_newsdata_settings_to_feed_source(db: &DatabaseConnection) -> AppResult<()> {
    use sea_orm::{EntityTrait, PaginatorTrait};
    use crate::research::components::feed::entities::feed_sources::Entity as FeedSourceEntity;
    use crate::core::components::crypto;
    
    info!("Checking for legacy NewsData settings to migrate...");
    
    // Check if any feed sources exist
    let source_count: u64 = FeedSourceEntity::find()
        .count(db)
        .await
        .map_err(|e| AppError::database(format!("Failed to count feed sources: {}", e)))?;
    
    if source_count > 0 {
        info!("Feed sources already exist, skipping migration");
        return Ok(());
    }
    
    // Check for legacy newsdata_api_key in app_settings
    let api_key_result = db.query_one(Statement::from_sql_and_values(
        db.get_database_backend(),
        "SELECT value, is_encrypted FROM app_settings WHERE key = ?",
        vec!["news.newsdata_api_key".into()],
    )).await?;
    
    let api_key = match api_key_result {
        Some(row) => {
            let value: String = row.try_get("", "value")
                .map_err(|e| AppError::database(format!("Failed to read API key: {}", e)))?;
            let is_encrypted: i32 = row.try_get("", "is_encrypted")
                .map_err(|e| AppError::database(format!("Failed to read encryption flag: {}", e)))?;
            
            // Decrypt if necessary (legacy settings used app_settings encryption)
            if is_encrypted == 1 && !value.is_empty() {
                crypto::decrypt_api_key(&hex::decode(&value).unwrap_or_default())
                    .map_err(|e| AppError::Crypto {
                        operation: "decrypt legacy API key".to_string(),
                        reason: e.to_string(),
                    })?
            } else {
                value
            }
        },
        None => {
            info!("No legacy NewsData API key found, skipping migration");
            return Ok(());
        }
    };
    
    // Skip if API key is empty
    if api_key.trim().is_empty() {
        info!("Legacy API key is empty, skipping migration");
        return Ok(());
    }
    
    info!("Found legacy NewsData API key, migrating to feed_sources...");
    
    // Get other legacy settings
    let sync_enabled_row = db.query_one(Statement::from_sql_and_values(
        db.get_database_backend(),
        "SELECT value FROM app_settings WHERE key = ?",
        vec!["news.auto_sync".into()],
    )).await?;
    
    let sync_enabled = sync_enabled_row
        .and_then(|r| r.try_get::<String>("", "value").ok())
        .map(|v| v == "true")
        .unwrap_or(true);
    
    // Encrypt API key using feed_sources encryption
    let encrypted_key = crypto::encrypt_api_key(&api_key)
        .map_err(|e| AppError::Crypto {
            operation: "encrypt API key".to_string(),
            reason: e.to_string(),
        })?;
    
    // Insert the migrated source
    db.execute(Statement::from_sql_and_values(
        db.get_database_backend(),
        r#"INSERT INTO feed_sources 
           (name, source_type, api_key_encrypted, enabled, schedule, config, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"#,
        vec![
            "NewsData.io (Migrated)".into(),
            "NewsData".into(), // SourceType enum variant as string
            encrypted_key.into(),
            (if sync_enabled { 1 } else { 0 }).into(),
            "0 */45 * * * *".into(), // Every 45 minutes (legacy default)
            "{}".into(), // Empty config, will use defaults
        ],
    )).await?;
    
    info!("✓ Successfully migrated legacy NewsData settings to feed_sources");
    info!("  - Source name: NewsData.io (Migrated)");
    info!("  - Enabled: {}", sync_enabled);
    info!("  - Schedule: Every 45 minutes");
    
    Ok(())
}
