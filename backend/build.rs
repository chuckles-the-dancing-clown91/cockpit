use std::{
    env, fs, io,
    path::{Path, PathBuf},
    process::Command,
};

fn main() {
    println!("cargo:rerun-if-env-changed=FLUTTER_PROJECT_DIR");
    println!("cargo:rerun-if-env-changed=FLUTTER_BUILD_TARGET");
    println!("cargo:rerun-if-env-changed=FLUTTER_BUILD_ARGS");
    println!("cargo:rerun-if-env-changed=FLUTTER_DIST_DIR");

    if let Err(err) = build_flutter_assets() {
        eprintln!("❌ Flutter build failed: {err}");
        std::process::exit(1);
    }

    tauri_build::build();
}

fn build_flutter_assets() -> Result<(), String> {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR")
            .map_err(|e| format!("unable to read CARGO_MANIFEST_DIR: {e}"))?,
    );
    let project_root = manifest_dir
        .parent()
        .ok_or_else(|| "could not determine project root".to_string())?;

    let flutter_project_dir = env::var("FLUTTER_PROJECT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| project_root.join("flutter_app"));
    let dist_dir = env::var("FLUTTER_DIST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| manifest_dir.join("target/flutter-dist"));

    if !flutter_project_dir.join("pubspec.yaml").exists() {
        return Err(format!(
            "Flutter project not found at {} (missing pubspec.yaml). Set FLUTTER_PROJECT_DIR to the project path.",
            flutter_project_dir.display()
        ));
    }

    let flutter =
        which_flutter().map_err(|e| format!("{e}. Install Flutter and ensure it is on PATH."))?;
    let build_target = resolve_build_target();
    let extra_args = parse_extra_args();

    let mut pub_get_cmd = Command::new(&flutter);
    pub_get_cmd
        .arg("pub")
        .arg("get")
        .current_dir(&flutter_project_dir);
    run_cmd(&mut pub_get_cmd, "flutter pub get")?;

    let mut build_cmd = Command::new(&flutter);
    build_cmd
        .arg("build")
        .arg(&build_target)
        .args(&extra_args)
        .current_dir(&flutter_project_dir);
    run_cmd(&mut build_cmd, &format!("flutter build {build_target}"))?;

    if build_target != "web" {
        let mut web_build_cmd = Command::new(&flutter);
        web_build_cmd
            .arg("build")
            .arg("web")
            .args(&extra_args)
            .current_dir(&flutter_project_dir);
        run_cmd(&mut web_build_cmd, "flutter build web")?;
    }

    let web_dist = flutter_project_dir.join("build/web");
    if !web_dist.exists() {
        return Err(format!(
            "Flutter web bundle not found at {} after build",
            web_dist.display()
        ));
    }

    copy_dir(&web_dist, &dist_dir)
        .map_err(|e| format!("failed to copy web assets to {}: {e}", dist_dir.display()))?;

    println!(
        "cargo:warning=Flutter assets prepared at {} (target: {build_target})",
        dist_dir.display()
    );
    Ok(())
}

fn run_cmd(cmd: &mut Command, label: &str) -> Result<(), String> {
    let output = cmd
        .output()
        .map_err(|e| format!("failed to run {label}: {e}"))?;
    if output.status.success() {
        return Ok(());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!(
        "{label} failed (code {:?}).\nstdout: {}\nstderr: {}",
        output.status.code(),
        stdout.trim(),
        stderr.trim()
    ))
}

fn which_flutter() -> Result<PathBuf, io::Error> {
    Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("flutter")
        .output()
        .and_then(|output| {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or_default()
                    .trim()
                    .to_string();
                if path.is_empty() {
                    Err(io::Error::new(
                        io::ErrorKind::NotFound,
                        "flutter not found in PATH",
                    ))
                } else {
                    Ok(PathBuf::from(path))
                }
            } else {
                Err(io::Error::new(
                    io::ErrorKind::NotFound,
                    "flutter not found in PATH",
                ))
            }
        })
}

fn resolve_build_target() -> String {
    if let Ok(target) = env::var("FLUTTER_BUILD_TARGET") {
        if !target.trim().is_empty() {
            return target;
        }
    }

    match env::consts::OS {
        "linux" => "linux".to_string(),
        "macos" => "macos".to_string(),
        "windows" => "windows".to_string(),
        _ => "web".to_string(),
    }
}

fn parse_extra_args() -> Vec<String> {
    env::var("FLUTTER_BUILD_ARGS")
        .unwrap_or_default()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

fn copy_dir(src: &Path, dst: &Path) -> io::Result<()> {
    if dst.exists() {
        fs::remove_dir_all(dst)?;
    }
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
