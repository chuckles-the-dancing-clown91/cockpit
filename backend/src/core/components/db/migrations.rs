//! Database migration system using SeaORM Migration
//!
//! Provides type-safe, database-agnostic migrations using SeaORM Migration framework:
//! - Version tracking
//! - Forward migrations
//! - Rollback capability
//! - SQLite + PostgreSQL compatibility

use crate::core::components::errors::AppResult;
use sea_orm::DatabaseConnection;
use sea_orm_migration::prelude::*;
use tracing::info;

/// Apply all pending migrations using SeaORM Migrator
pub async fn run_migrations(db: &DatabaseConnection) -> AppResult<()> {
    info!("Checking for pending migrations...");

    // Run migrations using SeaORM Migrator
    migration::Migrator::up(db, None).await?;

    // Get current database version
    let applied = migration::Migrator::get_applied_migrations(db).await?;
    let version = applied.len();

    info!("Database is at version {}", version);
    info!("All migrations applied successfully");

    Ok(())
}

/// Get current database version
pub async fn get_db_version(db: &DatabaseConnection) -> AppResult<Option<i32>> {
    let applied = migration::Migrator::get_applied_migrations(db).await?;
    Ok(Some(applied.len() as i32))
}

/// Check if migrations are pending
#[allow(dead_code)]
pub async fn has_pending_migrations(db: &DatabaseConnection) -> AppResult<bool> {
    let applied = migration::Migrator::get_applied_migrations(db).await?;
    let total = migration::Migrator::migrations().len();
    Ok(applied.len() < total)
}

/// Rollback the most recent migration
#[allow(dead_code)]
pub async fn rollback_last_migration(db: &DatabaseConnection) -> AppResult<()> {
    info!("Rolling back last migration...");
    migration::Migrator::down(db, Some(1)).await?;
    info!("✓ Migration rolled back successfully");
    Ok(())
}

/// Data migration: Move legacy NewsData settings to feed_sources
///
/// This is a one-time migration that runs after schema migrations.
/// It migrates existing app_settings for NewsData to the new feed_sources system.
pub async fn migrate_newsdata_settings_to_feed_source(db: &DatabaseConnection) -> AppResult<()> {
    use sea_orm::{ConnectionTrait, EntityTrait, PaginatorTrait, Statement};
    use crate::core::components::errors::AppError;
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

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, DbErr};

    #[tokio::test]
    async fn test_migrations() -> Result<(), DbErr> {
        // Test with in-memory database
        let db = Database::connect("sqlite::memory:").await?;
        
        // Apply migrations
        run_migrations(&db).await.unwrap();
        
        // Check version
        let version = get_db_version(&db).await.unwrap();
        assert!(version.is_some() && version.unwrap() > 0, "Expected migrations to be applied");
        
        // Check no pending migrations
        let pending = has_pending_migrations(&db).await.unwrap();
        assert!(!pending, "Expected no pending migrations");

        Ok(())
    }
}
