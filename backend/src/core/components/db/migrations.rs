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
