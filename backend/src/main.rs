// Core infrastructure
mod core;

// Domain modules
mod bridge;
mod connectors;
mod notes;
mod research;
mod system;
mod util;
mod writing;

use crate::core::components::events::{EventEmitter, NoopEventEmitter};
use bridge::dispatch::BridgeContext;
use reqwest::Client;
use sea_orm::DatabaseConnection;
use std::collections::HashSet;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use system::scheduler::start_scheduler;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub running: Arc<Mutex<HashSet<i64>>>,
    pub config: Arc<core::config::AppConfig>,
    pub http_client: Client,
}

// ========== Main Application Setup ==========

#[tokio::main]
async fn main() {
    // Perform first-run setup (creates ~/.cockpit, generates master key, etc.)
    let is_first_run = match core::components::setup::ensure_first_run_setup() {
        Ok(first_run) => first_run,
        Err(e) => {
            eprintln!("❌ Failed to initialize Cockpit: {}", e);
            eprintln!("Please check permissions and try again.");
            std::process::exit(1);
        }
    };

    // Load .env file from ~/.cockpit first (for production) or current directory (for development)
    if let Some(home) = dirs::home_dir() {
        let prod_env = home.join(".cockpit/.env");
        if prod_env.exists() {
            let _ = dotenvy::from_path(&prod_env);
        }
    }
    // Fallback to current directory .env for development
    let _ = dotenvy::dotenv();

    // Load and validate configuration
    let config = match core::config::AppConfig::from_env() {
        Ok(cfg) => cfg,
        Err(e) => {
            error!(target: "config", "Configuration error: {}. Please check your .env file or environment variables.", e);
            std::process::exit(1);
        }
    };

    // Ensure required directories exist
    if let Err(e) = core::config::ensure_directories(&config) {
        error!(target: "storage", "Failed to create directories: {}", e);
        std::process::exit(1);
    }

    core::logging::init_logging(&config.logging);

    // Initialize storage management
    if let Err(e) = core::storage::initialize_storage(&config) {
        warn!(target: "storage", "Storage initialization warning: {}", e);
        // Don't exit - this is not critical
    }
    let config_arc = Arc::new(config);

    let db = match core::db::init_db_from_env().await {
        Ok(db) => db,
        Err(e) => {
            error!(target: "db", "Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    // Initialize default settings on first run
    if is_first_run {
        info!(target: "setup", "First run detected, initializing default settings...");
        if let Err(e) = core::components::setup::initialize_default_settings(&db).await {
            warn!(target: "setup", "Failed to initialize default settings: {}", e);
        }
    }

    // Configure shared HTTP client with connection pooling and timeouts
    let http_client = Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(5)
        .pool_idle_timeout(Duration::from_secs(90))
        .build()
        .expect("failed to build http client");

    let state = Arc::new(AppState {
        db,
        running: Arc::new(Mutex::new(HashSet::new())),
        config: config_arc.clone(),
        http_client,
    });

    let emitter: Arc<dyn EventEmitter> = Arc::new(NoopEventEmitter);

    // Kick off scheduler
    let scheduler_state = state.clone();
    let scheduler_emitter = emitter.clone();
    tokio::spawn(async move {
        if let Err(err) = start_scheduler(scheduler_state, scheduler_emitter).await {
            error!(target: "scheduler", "Failed to start: {}", err);
        }
    });

    // Start Axum command bridge
    let port = std::env::var("COCKPIT_HTTP_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(1420);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let router = bridge::http::router(BridgeContext {
        state: state.clone(),
        emitter,
    });
    info!(target: "api", "HTTP bridge listening on http://{}", addr);
    axum::Server::bind(&addr)
        .serve(router.into_make_service())
        .await
        .expect("failed to run HTTP bridge");
}
