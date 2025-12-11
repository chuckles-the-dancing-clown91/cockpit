use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use tracing_subscriber::{fmt, EnvFilter};
use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;

use crate::config;

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
