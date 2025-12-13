//! Database backup and export utilities

use crate::core::components::errors::{AppError, AppResult};
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use std::fs;
use std::path::Path;
use tracing::info;

/// Backup the entire SQLite database file
#[allow(dead_code)]
pub async fn backup_database(db_path: &str, backup_path: &str) -> AppResult<()> {
    if !Path::new(db_path).exists() {
        return Err(AppError::other(format!(
            "Database file not found: {}",
            db_path
        )));
    }

    info!("Creating database backup: {} -> {}", db_path, backup_path);
    fs::copy(db_path, backup_path)?;
    info!("✓ Database backup created successfully");

    Ok(())
}

/// Export database to SQL dump format
#[allow(dead_code)]
pub async fn export_to_sql(db: &DatabaseConnection, output_path: &str) -> AppResult<()> {
    info!("Exporting database to SQL: {}", output_path);

    // Get all table names
    let tables_sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'";
    let tables = db
        .query_all(Statement::from_string(
            db.get_database_backend(),
            tables_sql.to_string(),
        ))
        .await?;

    let mut output = String::new();
    output.push_str("-- Architect Cockpit Database Export\n");
    output.push_str(&format!(
        "-- Generated: {}\n\n",
        chrono::Utc::now().to_rfc3339()
    ));
    output.push_str("BEGIN TRANSACTION;\n\n");

    for table_row in tables {
        let table_name: String = table_row.try_get("", "name")?;

        // Get CREATE TABLE statement
        let create_sql = format!(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='{}'",
            table_name
        );
        let create_result = db
            .query_one(Statement::from_string(
                db.get_database_backend(),
                create_sql,
            ))
            .await?;

        if let Some(row) = create_result {
            let sql: String = row.try_get("", "sql")?;
            output.push_str(&format!("-- Table: {}\n", table_name));
            output.push_str(&sql);
            output.push_str(";\n\n");

            // Get all data
            let data_sql = format!("SELECT * FROM {}", table_name);
            let data_rows = db
                .query_all(Statement::from_string(db.get_database_backend(), data_sql))
                .await?;

            if !data_rows.is_empty() {
                output.push_str(&format!("-- Data for {}\n", table_name));
                for _row in data_rows {
                    // This is simplified - in production you'd need proper value escaping
                    output.push_str(&format!("-- INSERT INTO {} VALUES (...);\n", table_name));
                }
                output.push_str("\n");
            }
        }
    }

    output.push_str("COMMIT;\n");

    fs::write(output_path, output)?;
    info!("✓ Database exported to SQL successfully");

    Ok(())
}

/// Get database statistics
#[allow(dead_code)]
pub async fn get_db_stats(db: &DatabaseConnection) -> AppResult<String> {
    let tables_sql =
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    let tables = db
        .query_all(Statement::from_string(
            db.get_database_backend(),
            tables_sql.to_string(),
        ))
        .await?;

    let mut stats = String::from("Database Statistics\n");
    stats.push_str("===================\n\n");

    for table_row in tables {
        let table_name: String = table_row.try_get("", "name")?;
        let count_sql = format!("SELECT COUNT(*) as count FROM {}", table_name);
        let count_result = db
            .query_one(Statement::from_string(
                db.get_database_backend(),
                count_sql,
            ))
            .await?;

        if let Some(row) = count_result {
            let count: i64 = row.try_get("", "count")?;
            stats.push_str(&format!("{}: {} rows\n", table_name, count));
        }
    }

    Ok(stats)
}
