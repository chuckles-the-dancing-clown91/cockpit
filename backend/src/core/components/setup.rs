use std::path::PathBuf;
use std::fs;
use tracing::{info, warn};
use crate::core::components::errors::AppError;

/// Performs complete first-run setup including master key generation
pub fn ensure_first_run_setup() -> Result<bool, AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Other { 
            message: "Could not determine home directory".to_string(),
            source: None,
        })?;
    
    let cockpit_home = home.join(".cockpit");
    let env_file = cockpit_home.join(".env");
    
    // Check if this is truly first run (no .cockpit directory at all)
    let is_first_run = !cockpit_home.exists();
    
    if is_first_run {
        info!("🚀 First run detected! Setting up Cockpit...");
        
        // Create directory structure
        info!("📁 Creating directory structure...");
        create_directory_structure(&cockpit_home)?;
        
        // Generate master key and create .env file
        info!("🔐 Generating master encryption key...");
        generate_env_file(&env_file, &cockpit_home)?;
        
        info!("✓ First-run setup complete!");
    } else {
        // Verify directories exist
        verify_directories(&cockpit_home)?;
        
        // Check if .env exists, if not create it
        if !env_file.exists() {
            warn!("⚠️  No .env file found, creating one with new master key...");
            generate_env_file(&env_file, &cockpit_home)?;
        }
    }
    
    Ok(is_first_run)
}

/// Generates a secure .env file with master key
fn generate_env_file(env_file: &PathBuf, cockpit_home: &PathBuf) -> Result<(), AppError> {
    use rand::RngCore;
    
    // Generate 256-bit master key
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    let master_key = hex::encode(bytes);
    
    // Build .env content
    let env_content = format!(
r#"# Cockpit Configuration
# Auto-generated on first run

# Storage Paths
COCKPIT_HOME={}
DATABASE_URL=sqlite:{}/data/db.sql
STORAGE_ROOT={}
LOGS_DIR={}/logs

# Security (AUTO-GENERATED - Keep secure!)
COCKPIT_MASTER_KEY={}

# API Keys (Optional - configure in Settings UI)
# NEWSDATA_API_KEY=your_key_here

# Logging Configuration
LOG_LEVEL=info
LOG_JSON=true
LOG_CONSOLE=true
LOG_MAX_SIZE_MB=10
LOG_MAX_FILES=5

# Database Configuration
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1

# Storage Limits
STORAGE_MAX_SIZE_GB=50

# News API Configuration
NEWSDATA_DAILY_LIMIT=180
"#,
        cockpit_home.to_string_lossy(),
        cockpit_home.to_string_lossy(),
        cockpit_home.to_string_lossy(),
        cockpit_home.to_string_lossy(),
        master_key
    );
    
    // Write .env file
    fs::write(env_file, env_content)
        .map_err(|e| AppError::FileOperation {
            operation: "write .env file".to_string(),
            path: env_file.to_string_lossy().to_string(),
            source: e,
        })?;
    
    // Set secure permissions (600 - user read/write only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(env_file)
            .map_err(|e| AppError::FileOperation {
                operation: "get file permissions".to_string(),
                path: env_file.to_string_lossy().to_string(),
                source: e,
            })?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(env_file, perms)
            .map_err(|e| AppError::FileOperation {
                operation: "set file permissions".to_string(),
                path: env_file.to_string_lossy().to_string(),
                source: e,
            })?;
    }
    
    info!("✓ Configuration file created at {:?}", env_file);
    info!("✓ Master key: {} ({}...{})", 
        master_key.len(), 
        &master_key[..8], 
        &master_key[master_key.len()-8..]
    );
    
    Ok(())
}

/// Creates the full directory structure
fn create_directory_structure(cockpit_home: &PathBuf) -> Result<(), AppError> {
    let directories = vec![
        cockpit_home.clone(),
        cockpit_home.join("data"),
        cockpit_home.join("logs"),
        cockpit_home.join("cache"),
        cockpit_home.join("backups"),
        cockpit_home.join("exports"),
        cockpit_home.join("icons"),
    ];
    
    for dir in directories {
        fs::create_dir_all(&dir)
            .map_err(|e| AppError::FileOperation {
                operation: "create directory".to_string(),
                path: dir.to_string_lossy().to_string(),
                source: e,
            })?;
    }
    
    info!("✓ Directory structure created");
    Ok(())
}

/// Verifies that all required directories exist
fn verify_directories(cockpit_home: &PathBuf) -> Result<(), AppError> {
    let required_dirs = vec!["data", "logs", "cache", "backups", "exports"];
    
    for dir_name in required_dirs {
        let dir = cockpit_home.join(dir_name);
        if !dir.exists() {
            warn!("Missing directory: {:?}, creating it", dir);
            fs::create_dir_all(&dir)
                .map_err(|e| AppError::FileOperation {
                    operation: "create directory".to_string(),
                    path: dir.to_string_lossy().to_string(),
                    source: e,
                })?;
        }
    }
    
    Ok(())
}

/// Gets the Cockpit home directory path
pub fn get_cockpit_home() -> Result<PathBuf, AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Other {
            message: "Could not determine home directory".to_string(),
            source: None,
        })?;
    Ok(home.join(".cockpit"))
}

/// Checks if the app is running in development mode
pub fn is_dev_mode() -> bool {
    // Check if we're running from a development directory structure
    // In dev: binary is in target/debug or target/release within project
    // In prod: binary is in /usr/local/bin or similar
    
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_path_buf()))
        .map(|parent| {
            parent.to_string_lossy().contains("target/debug") 
            || parent.to_string_lossy().contains("target/release")
            || parent.to_string_lossy().contains("build/target")
        })
        .unwrap_or(false)
}

/// Gets the appropriate storage root path (dev vs prod)
pub fn get_storage_root() -> Result<PathBuf, AppError> {
    if is_dev_mode() {
        // Development mode: use project directory
        let current = std::env::current_dir()
            .map_err(|e| AppError::FileOperation {
                operation: "get current directory".to_string(),
                path: ".".to_string(),
                source: e,
            })?;
        
        // Try to find backend/storage or just storage
        let backend_storage = current.join("backend").join("storage");
        let storage = current.join("storage");
        
        if backend_storage.exists() {
            Ok(backend_storage)
        } else if storage.exists() {
            Ok(storage)
        } else {
            // Create storage in current directory
            fs::create_dir_all(&storage)
                .map_err(|e| AppError::FileOperation {
                    operation: "create storage directory".to_string(),
                    path: storage.to_string_lossy().to_string(),
                    source: e,
                })?;
            Ok(storage)
        }
    } else {
        // Production mode: use ~/.cockpit
        get_cockpit_home()
    }
}

/// Initialize default settings in the database
pub async fn initialize_default_settings(db: &sea_orm::DatabaseConnection) -> Result<(), AppError> {
    use sea_orm::{EntityTrait, ActiveModelTrait, Set};
    use crate::core::components::settings::entities::{Entity as AppSettings, ActiveModel};
    use tracing::info;
    
    info!("Initializing default application settings...");
    
    // Check if settings already exist
    let existing = AppSettings::find().one(db).await
        .map_err(|e| AppError::DatabaseQuery {
            operation: "check existing settings".to_string(),
            source: e,
        })?;
    
    if existing.is_some() {
        info!("Settings already exist, skipping initialization");
        return Ok(());
    }
    
    // Create default settings (key, value, value_type, category, description)
    let default_settings = vec![
        // App settings
        ("app.theme", "dark", "string", "app", "Application theme"),
        ("app.language", "en", "string", "app", "Application language"),
        ("app.auto_save", "true", "boolean", "app", "Auto-save editor content"),
        
        // News settings
        ("news.fetch_interval", "3600", "number", "news", "News fetch interval in seconds (1 hour)"),
        ("news.max_articles", "100", "number", "news", "Maximum articles to keep"),
        ("news.auto_dismiss_days", "7", "number", "news", "Auto-dismiss articles older than N days"),
        
        // Logging settings
        ("logging.level", "info", "string", "logging", "Logging level (debug, info, warn, error)"),
        ("logging.max_size_mb", "10", "number", "logging", "Maximum log file size in MB"),
        ("logging.max_files", "5", "number", "logging", "Maximum number of log files to keep"),
        
        // Storage settings
        ("storage.max_size_gb", "50", "number", "storage", "Maximum storage size in GB"),
        ("storage.backup_retention_days", "30", "number", "storage", "Backup retention period in days"),
    ];
    
    for (key, value, value_type, category, description) in default_settings {
        let setting = ActiveModel {
            key: Set(key.to_string()),
            value: Set(value.to_string()),
            value_type: Set(value_type.to_string()),
            category: Set(category.to_string()),
            description: Set(Some(description.to_string())),
            is_encrypted: Set(0),
            ..Default::default()
        };
        
        setting.insert(db).await
            .map_err(|e| AppError::DatabaseQuery {
                operation: format!("insert default setting: {}", key),
                source: e,
            })?;
        
        info!("Created default setting: {} = {}", key, value);
    }
    
    info!("Default settings initialized successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_cockpit_home() {
        let result = get_cockpit_home();
        assert!(result.is_ok());
        
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains(".cockpit"));
    }
    
    #[test]
    fn test_dev_mode_detection() {
        // This will vary based on where tests are run
        let is_dev = is_dev_mode();
        println!("Running in dev mode: {}", is_dev);
    }
}
