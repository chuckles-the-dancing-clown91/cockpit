pub fn load_env() {
    let _ = dotenvy::dotenv();
}

pub fn log_path_from_env() -> String {
    std::env::var("LOG_PATH").unwrap_or_else(|_| "cockpit.log".into())
}

pub fn dev_mode() -> bool {
    std::env::var("DEV_MODE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}
