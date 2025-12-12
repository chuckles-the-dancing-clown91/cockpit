//! Database initialization using migration system
//!
//! Simplified database setup that delegates schema management to migrations.
//! All schema changes should be done through migrations going forward.

use super::errors::AppError;
use super::migrations;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, Statement, ConnectionTrait};
use std::path::PathBuf;
use std::time::Duration;
use tracing::{info, warn};

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

    // Connect to database with optimized pool settings
    let mut opt = ConnectOptions::new(db_url.to_string());
    opt.max_connections(5)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(300))  // 5 minutes
        .max_lifetime(Duration::from_secs(1800)) // 30 minutes
        .sqlx_logging(false)
        .sqlx_logging_level(tracing::log::LevelFilter::Debug)
        .sqlx_slow_statements_logging_settings(
            tracing::log::LevelFilter::Warn,
            Duration::from_secs(1),
        );
    
    let db = Database::connect(opt).await?;
    info!("Database connected: {}", db_url);

    // Configure SQLite PRAGMAs for better performance and data integrity
    if is_sqlite {
        info!("Configuring SQLite PRAGMAs...");
        
        // Enable WAL mode for concurrent reads
        if let Err(e) = db.execute(Statement::from_string(
            db.get_database_backend(),
            "PRAGMA journal_mode=WAL;".to_owned(),
        )).await {
            warn!("Failed to enable WAL mode: {}", e);
        }
        
        // Set synchronous to NORMAL for better write performance
        if let Err(e) = db.execute(Statement::from_string(
            db.get_database_backend(),
            "PRAGMA synchronous=NORMAL;".to_owned(),
        )).await {
            warn!("Failed to set synchronous mode: {}", e);
        }
        
        // Enable foreign keys for referential integrity
        if let Err(e) = db.execute(Statement::from_string(
            db.get_database_backend(),
            "PRAGMA foreign_keys=ON;".to_owned(),
        )).await {
            warn!("Failed to enable foreign keys: {}", e);
        }
        
        // Set busy timeout to avoid immediate failures on lock
        if let Err(e) = db.execute(Statement::from_string(
            db.get_database_backend(),
            "PRAGMA busy_timeout=5000;".to_owned(),
        )).await {
            warn!("Failed to set busy timeout: {}", e);
        }
        
        info!("SQLite PRAGMAs configured");
    }

    // Run migrations
    info!("Running database migrations...");
    migrations::run_migrations(&db).await?;
    
    // Log current version
    if let Ok(Some(version)) = migrations::get_db_version(&db).await {
        info!("Database version: {}", version);
    }

    Ok(db)
}
