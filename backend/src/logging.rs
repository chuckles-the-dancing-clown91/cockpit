use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use std::io::Write;
use tracing_subscriber::{fmt, EnvFilter};
use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;

use crate::config;

fn sanitize_url(raw: &str) -> String {
  if let Some(idx) = raw.find('?') {
    let (base, query) = raw.split_at(idx + 1);
    let mut pairs = Vec::new();
    for part in query.split('&') {
      let mut split = part.splitn(2, '=');
      let key = split.next().unwrap_or_default();
      let val = split.next().unwrap_or_default();
      let redacted = matches!(key.to_ascii_lowercase().as_str(), "apikey" | "api_key" | "token" | "key");
      pairs.push(format!("{}={}", key, if redacted { "[REDACTED]" } else { val }));
    }
    format!("{}{}", base, pairs.join("&"))
  } else {
    raw.to_string()
  }
}

fn sanitize_body(raw: &str) -> String {
  let mut s = raw.to_string();
  for marker in ["apikey\":\"", "api_key\":\"", "token\":\""] {
    if let Some(idx) = s.find(marker) {
      let start = idx + marker.len();
      if let Some(end) = s[start..].find('"') {
        s.replace_range(start..start + end, "[REDACTED]");
      }
    }
  }
  for marker in ["apikey=", "api_key=", "token="] {
    if let Some(idx) = s.find(marker) {
      let start = idx + marker.len();
      let end = s[start..]
        .find(|c: char| c == '&' || c == ' ' || c == '\n')
        .map(|e| start + e)
        .unwrap_or_else(|| s.len());
      s.replace_range(start..end, "[REDACTED]");
    }
  }
  s
}

pub fn init_logging() {
  let log_path: PathBuf = config::log_path_from_env().into();
  let dev = config::dev_mode();

  if let Some(parent) = log_path.parent() {
    let _ = fs::create_dir_all(parent);
  }

  let file = OpenOptions::new()
    .create(true)
    .write(true)
    .append(true)
    .open(&log_path)
    .ok();

  let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

  let file_layer = fmt::layer()
      .with_writer(move || match file.as_ref() {
        Some(f) => Box::new(f.try_clone().expect("log file clone failed")) as Box<dyn std::io::Write + Send + Sync>,
        None => Box::new(std::io::stdout()) as Box<dyn std::io::Write + Send + Sync>,
      })
      .with_ansi(false);

  let console_layer = fmt::layer().with_writer(std::io::stdout).with_ansi(dev);

  let subscriber = tracing_subscriber::registry()
      .with(env_filter)
      .with(file_layer)
      .with(console_layer);

  let _ = tracing::subscriber::set_global_default(subscriber);
}

pub fn log_api_call(name: &str, url: &str, status: reqwest::StatusCode, body_preview: &str) {
  let path: PathBuf = config::call_log_path_from_env().into();
  if let Some(parent) = path.parent() {
    let _ = fs::create_dir_all(parent);
  }
  if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
    let safe_url = sanitize_url(url);
    let safe_body = sanitize_body(body_preview);
    let _ = writeln!(
      f,
      "[{}] {} {} - {}",
      chrono::Utc::now().to_rfc3339(),
      name,
      status.as_u16(),
      safe_url
    );
    let _ = writeln!(f, "body: {}", safe_body);
    let _ = writeln!(f, "----------------------------------------");
  }
}
