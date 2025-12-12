use std::path::PathBuf;

mod config;
mod logging;
mod errors;

fn main() {
    let config = config::LoggingConfig {
        level: "info".to_string(),
        app_log_path: PathBuf::from("storage/logs/app.log"),
        api_log_path: PathBuf::from("storage/logs/api_calls.log"),
        error_log_path: PathBuf::from("storage/logs/errors.log"),
        max_file_size_mb: 10,
        max_files: 5,
        structured_json: false,
        console_output: false,
    };
    
    logging::check_log_rotation(&config);
    println!("Rotation check complete");
}
