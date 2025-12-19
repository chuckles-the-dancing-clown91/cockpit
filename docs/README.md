# Cockpit

> A local‑first desktop workspace for turning **ideas + references + notes** into finished writing.

Cockpit is a **Tauri v2** app: a **Rust backend** (SQLite + SeaORM) with a **React/TypeScript frontend** (Vite + Radix UI). The goal is simple: keep your research, drafts, and annotations in one place — on your machine — with fast search and clean UX.

## What’s in here

Current focus areas (some are still in-progress):

- **Ideas**: capture ideas with status/priority and quick metadata.
- **Writing**: create writing items (article / book / chapter) and link them to ideas.
- **References + Notes**: store sources and attach notes/annotations.
- **Knowledge graph helpers**: link entities (idea ↔ writing, idea ↔ reference, notes ↔ entities) via join tables.

> Note: an **embedded browser/webview** experiment exists in earlier iterations, but is currently not part of the core workflow.

## Tech stack

- **Desktop:** Tauri 2.x
- **Backend:** Rust, SeaORM, SQLite, Tokio
- **Migrations:** `backend/migration` (SeaORM Migration crate) — **no raw SQL migration files**
- **Frontend:** React 19, TypeScript, Vite
- **UI:** Radix Themes + Radix Primitives
- **Data fetching:** TanStack Query (React Query)

## Repository layout

```
proj/
  frontend/   # React app
  backend/    # Tauri app (Rust)
```

Frontend conventions:

- `src/features/*` is the **source of truth** for new work.
- `src/domains/*` is **legacy** and should not receive new code.

Backend conventions:

- Feature modules live in `backend/src/<feature>/` (e.g. `ideas/`, `writing/`, `research/`).
- All DB schema changes go through `backend/migration`.

## Quickstart

### Prereqs

- Rust (stable) + `cargo`
- Node.js (LTS recommended)
- Tauri prerequisites for your OS (WebView2 on Windows, etc.)

### Install frontend deps

```bash
cd frontend
npm install
```

### Run in dev (Tauri)

```bash
cd backend
cargo tauri dev
```

#### Important: `tauri.conf.json` path

`backend/tauri.conf.json` contains `build.beforeDevCommand` / `beforeBuildCommand`. Ensure these commands use **relative** paths (not a machine-specific absolute path), e.g.:

```json
"beforeDevCommand": "npm --prefix ../frontend run dev"
```

## Database + migrations

- Cockpit uses **SQLite**.
- On startup, the backend runs **SeaORM migrations automatically**.
- You can override the DB location via `DB_URL` (SQLite URL).

If you need to create a migration:

```bash
cd backend/migration
cargo run -- generate <name>
```

Then add your migration to `migration/src/lib.rs` (the `Migrator` list).

## Documentation

Start here:

- `docs/Frontend_Development.md`
- `docs/Backend_Development.md`
- `docs/ARCHITECTURE.md`
- `docs/DB_SCHEMA.md`
- `docs/TAURI_COMMANDS.md`
- `docs/TROUBLESHOOTING.md`

## Development rules (to prevent Copilot drift)

- **Do not add new code under `frontend/src/domains/`**.
- Prefer **feature modules** (`frontend/src/features/<feature>/...`).
- Reuse existing components/hooks before creating new versions.
- Any new backend capability = **1 command + 1 service function + DTOs** (keep layers clean).
- Any schema change = **SeaORM migration** (never raw `.sql` files).

---

If you’re working with an AI assistant/Copilot, read: `docs/AI_ASSISTANT_RULES.md`.
