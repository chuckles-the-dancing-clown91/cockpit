# Build/Deployment Dependency Notes

This file tracks platform dependencies and setup steps to be used by future install/build scripts (e.g., apt/deb packaging).

## System packages (Ubuntu)
- build-essential
- curl
- libgtk-3-dev
- libayatana-appindicator3-dev
- libwebkit2gtk-4.1-dev
- pkg-config
- libssl-dev

## Toolchains
- Rust toolchain (via rustup)
- tauri-cli (cargo install tauri-cli)
- Node.js >= 20 (nvm recommended)

## Rust/Backend crates in use
- tauri 2.x (current pinned 2.5.3)
- tokio (rt-multi-thread, macros, time)
- tokio-cron-scheduler
- sea-orm (sqlx-sqlite runtime; swappable via DATABASE_URL)
- serde/serde_json
- chrono
- whoami

## Frontend dependencies
- Vite + React + TS + Tailwind + Radix UI stack (see frontend/package.json)

## Database
- Default: SQLite via SeaORM (`DATABASE_URL` defaults to sqlite:.../cockpit.sqlite)
- Keep `DATABASE_URL` configurable to point at other DBs (future-proof).
- Runtime needs a writable DB path; `COCKPIT_DB_PATH` can be set, otherwise build script ensures `cockpit.sqlite` under project root. Create parent dir before launch.

## Icons/Assets
- App icon at backend/icons/icon.png (ensure valid RGBA PNG when packaging).

## Packaging considerations
- Ensure build script installs system deps, Rust toolchain, tauri-cli, Node deps.
- Build frontend first, then cargo tauri build.
- For apt/deb: include desktop entry, icon, and set data dir permissions for SQLite file.
- Include `.env` with `COCKPIT_MASTER_KEY` (32-byte hex) in runtime environment or set env in service/launcher. Build script sources `.env` if present.
