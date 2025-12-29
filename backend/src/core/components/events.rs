//! Event bridge traits for headless and embedded runtimes.
//!
//! This abstraction replaces Tauri's event emitter so that background
//! services (scheduler, long-running tasks) can emit notifications without
//! requiring a GUI runtime. The HTTP/FFI bridge wires a concrete
//! implementation at startup; tests default to the no-op emitter.

use async_trait::async_trait;
use serde::Serialize;
use tracing::info;

/// Minimal async event emitter contract.
#[async_trait]
pub trait EventEmitter: Send + Sync {
    async fn emit<T: Serialize + Send + Sync>(&self, event: &str, payload: T)
        -> Result<(), String>;
}

/// No-op emitter that simply logs the event name and payload.
pub struct NoopEventEmitter;

#[async_trait]
impl EventEmitter for NoopEventEmitter {
    async fn emit<T: Serialize + Send + Sync>(
        &self,
        event: &str,
        payload: T,
    ) -> Result<(), String> {
        let payload = serde_json::to_string(&payload).unwrap_or_else(|_| "<unserializable>".into());
        info!(target: "events", "emit (noop): {} {}", event, payload);
        Ok(())
    }
}
