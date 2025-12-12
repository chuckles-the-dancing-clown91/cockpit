//! Database initialization using migration system
//!
//! Simplified database setup that delegates schema management to migrations.
//! All schema changes should be done through migrations going forward.

use crate::errors::AppError;
use crate::migrations;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::path::PathBuf;
use tracing::info;

/// Initialize database from environment variables
pub async fn init_db_from_env() -> Result<DatabaseConnection, AppError> {
    let db_path = std::env::var("COCKPIT_DB_PATH").unwrap_or_else(|_| "cockpit.sqlite".into());
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| format!("sqlite:{db_path}"));
    init_db(&db_url).await
}

/// Initialize database with migration system
pub async fn init_db(db_url: &str) -> Result<DatabaseConnection, AppError> {
    // Ensure SQLite database file exists
    let is_sqlite = db_url.starts_with("sqlite:");
    if is_sqlite {
        if let Some(path) = db_url
            .trim_start_matches("sqlite:")
            .strip_prefix("//")
            .or_else(|| db_url.trim_start_matches("sqlite:").strip_prefix(""))
        {
            // Create parent directory if needed
            if let Some(parent) = PathBuf::from(path).parent() {
                std::fs::create_dir_all(parent)?;
            }
            
            // Touch the file to create it
            let _ = std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .open(path)?;
                
            info!("Database file: {}", path);
        }
    } else {
        return Err(AppError::config(format!(
            "Only SQLite is supported currently. DATABASE_URL={db_url}"
        )));
    }

    // Connect to database
    let mut opt = ConnectOptions::new(db_url.to_string());
    opt.max_connections(5)
        .min_connections(1)
        .sqlx_logging(false);
    
    let db = Database::connect(opt).await?;
    info!("Database connected: {}", db_url);

    // Run migrations
    info!("Running database migrations...");
    migrations::run_migrations(&db).await?;
    
    // Log current version
    if let Ok(Some(version)) = migrations::get_db_version(&db).await {
        info!("Database version: {}", version);
    }

    Ok(db)
}
