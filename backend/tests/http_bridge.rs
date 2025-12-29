use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use cockpit::bridge::dispatch::{BridgeContext, CommandRequest};
use cockpit::core::components::config::types::{
    AppConfig, CryptoConfig, DatabaseConfig, LoggingConfig, NewsDataConfig, StorageConfig,
};
use cockpit::core::components::events::{EventEmitter, NoopEventEmitter};
use cockpit::system::scheduler::start_scheduler;
use cockpit::AppState;
use hyper::body;
use reqwest::Client;
use sea_orm::Database;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower::ServiceExt;

fn temp_root() -> PathBuf {
    let mut p = std::env::temp_dir();
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    p.push(format!("cockpit-http-{}", nanos));
    std::fs::create_dir_all(&p).unwrap();
    p
}

fn dummy_config(root: &PathBuf) -> AppConfig {
    AppConfig {
        database: DatabaseConfig {
            url: "sqlite::memory:".into(),
            path: root.join("db.sqlite"),
            max_connections: 5,
            min_connections: 1,
        },
        logging: LoggingConfig {
            level: "info".into(),
            app_log_path: root.join("app.log"),
            api_log_path: root.join("api.log"),
            error_log_path: root.join("error.log"),
            max_file_size_mb: 5,
            max_files: 2,
            structured_json: false,
            console_output: false,
        },
        newsdata: NewsDataConfig {
            api_key: None,
            daily_call_limit: 5,
            request_timeout: std::time::Duration::from_secs(5),
            max_retries: 1,
        },
        storage: StorageConfig {
            root: root.clone(),
            data_dir: root.join("data"),
            logs_dir: root.join("logs"),
            cache_dir: root.join("cache"),
            backup_dir: root.join("backups"),
            export_dir: root.join("exports"),
            max_total_size_gb: None,
        },
        crypto: CryptoConfig {
            master_key: "0000000000000000000000000000000000000000000000000000000000000000".into(),
        },
    }
}

async fn build_router() -> Router {
    let root = temp_root();
    let config = dummy_config(&root);
    let db = Database::connect(&config.database.url).await.unwrap();
    let state = Arc::new(AppState {
        db,
        running: Arc::new(Mutex::new(HashSet::new())),
        config: Arc::new(config),
        http_client: Client::new(),
    });
    let emitter: Arc<dyn EventEmitter> = Arc::new(NoopEventEmitter);

    // Scheduler should start but can fail silently in tests; keep detached.
    tokio::spawn(start_scheduler(state.clone(), emitter.clone()));

    cockpit::bridge::http::router(BridgeContext { state, emitter })
}

#[tokio::test]
async fn get_current_user_through_http_bridge() {
    let app = build_router().await;
    let payload = serde_json::to_vec(&CommandRequest {
        command: "get_current_user".into(),
        payload: None,
    })
    .unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/command")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(payload))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["result"]["username"].is_string(), true);
}
