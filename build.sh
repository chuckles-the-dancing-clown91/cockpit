#!/usr/bin/env bash
set -euo pipefail

# Build orchestrator with prerequisites check (Ubuntu-focused).
# - Installs missing system packages via sudo/apt-get.
# - Avoids running cargo/npm as root; reuses SUDO_USER when invoked with sudo.
# - Builds frontend (Vite) then backend (Tauri).

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
RUN_AS_USER="${SUDO_USER:-$USER}"
DB_PATH_DEFAULT="$ROOT_DIR/cockpit.sqlite"

APT_PACKAGES=(
  build-essential
  curl
  libgtk-3-dev
  libayatana-appindicator3-dev
  libwebkit2gtk-4.1-dev
  pkg-config
  libssl-dev
)

need_sudo() {
  if [ ! -x "$(command -v sudo)" ]; then
    echo "[prereq] sudo not available; install required packages manually." >&2
    return 1
  fi
}

ensure_apt_packages() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "[prereq] apt-get not found; skipping system package install." >&2
    return
  fi

  missing=()
  for pkg in "${APT_PACKAGES[@]}"; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    need_sudo || exit 1
    echo "[prereq] Installing system packages: ${missing[*]}"
    sudo apt-get update
    sudo apt-get install -y "${missing[@]}"
  else
    echo "[prereq] System packages already installed."
  fi
}

ensure_tauri_cli() {
  if cargo tauri -V >/dev/null 2>&1; then
    return
  fi
  echo "[backend] tauri-cli not found; installing for user $RUN_AS_USER"
  if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ]; then
    sudo -u "$RUN_AS_USER" cargo install tauri-cli
  else
    cargo install tauri-cli
  fi
}

frontend_build() {
  pushd "$FRONTEND_DIR" >/dev/null
  if [ ! -d node_modules ]; then
    echo "[frontend] installing dependencies as $RUN_AS_USER..."
    if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ]; then
      sudo -u "$RUN_AS_USER" npm install
    else
      npm install
    fi
  fi
  echo "[frontend] building Vite bundle..."
  npm run build
  popd >/dev/null
}

backend_build() {
  ensure_tauri_cli
  # Ensure DB path directory exists (for sqlite default).
  DB_PATH="${COCKPIT_DB_PATH:-$DB_PATH_DEFAULT}"
  mkdir -p "$(dirname "$DB_PATH")"
  export COCKPIT_DB_PATH="$DB_PATH"
  # Export master key from .env if present.
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ROOT_DIR/.env"
    set +a
  fi
  echo "[backend] building Tauri app..."
  pushd "$BACKEND_DIR" >/dev/null
  cargo tauri build
  popd >/dev/null
}

ensure_apt_packages
frontend_build
backend_build

echo "Build complete."
