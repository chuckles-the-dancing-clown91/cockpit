# Backend Development

Backend lives in `proj/backend`.

The backend is a **Tauri v2** Rust binary that exposes an API surface via `#[tauri::command]` functions. Data is stored locally in **SQLite**, accessed via **SeaORM**, with schema managed by the **SeaORM Migration** crate in `backend/migration`.

## Quick mental model

- `src/main.rs` wires up Tauri plugins, sets up state (DB connection), and registers commands via `tauri::generate_handler![...]`.
- Each domain module (ideas, writing, research, system, ...) typically has:
  - `dto.rs` – request/response shapes for commands
  - `service.rs` – DB logic (SeaORM)
  - `commands.rs` – Tauri commands that call the service

## Database + migrations

### Where the database lives

On app startup, we create/connect to a SQLite database and run migrations automatically:

- DB URL env override: `DB_URL=sqlite://...` (see `src/core/components/db/init.rs`).
- Default: an app‑local SQLite file resolved by Tauri (not committed to the repo).

### Running migrations

Migrations run automatically at app startup (`run_migrations(...)`).

If you want to run them manually:

```bash
cd backend
cargo run -p migration -- up
```

### Adding a new migration

1) Create a new migration file in `backend/migration/src/` (follow the `m00x_*.rs` pattern).

2) Register it in `backend/migration/src/lib.rs` by adding it to `Migrator::migrations()`.

3) Add/adjust entities (if you keep generated entities) and update services.

> Rule: **No raw SQL migration files**. All schema changes go through SeaORM migrations.

## Adding a new command

1) Add your function in the relevant module’s `commands.rs`:

```rust
#[tauri::command]
pub async fn my_new_command(
  state: tauri::State<'_, AppState>,
  input: MyInput,
) -> Result<MyOutput, String> {
  my_service::do_thing(&state.db, input).await
}
```

2) Register it in `src/main.rs` inside `tauri::generate_handler![ ... ]`.

3) Add a frontend wrapper in `frontend/src/features/<feature>/api.ts`.

### Error handling conventions

- Commands return `Result<T, String>` for predictable serialization to the frontend.
- Prefer `map_err(|e| e.to_string())` at module boundaries.
- Log *context* where it’s helpful (command name, input IDs), but don’t log sensitive fields.

## Tauri command naming

Command names default to the Rust function name.

**Convention:** prefix by feature/area to avoid collisions:

- `ideas_*` (idea CRUD)
- `references_*` (reference CRUD)
- `writing_*` (writing CRUD)
- `kg_*` (knowledge graph links: writing↔idea, writing↔reference, notes, etc.)

You can see current registrations in `src/main.rs` and definitions in `src/*/commands.rs`.

## SeaORM service conventions

- Keep SQL-ish logic in `service.rs`.
- Keep command functions thin: validate input, call service, return DTO.
- Use transactions for multi-step writes (e.g., link/unlink operations) when data integrity matters.

## Useful files to know

- `src/core/components/db/init.rs` – connects to DB and sets up tables
- `src/core/components/db/migrations.rs` – runs SeaORM migrations on startup
- `backend/migration/src/m006_writing_knowledge_graph.rs` – writing tables + KG link tables

## Troubleshooting (backend)

### “Command not found” from frontend

- Verify the command is included in `tauri::generate_handler![...]` in `src/main.rs`.
- Verify the frontend invoke name matches exactly (Rust function name).

### “No such table” / schema mismatch

- Ensure migrations are registered in `backend/migration/src/lib.rs`.
- Delete the local DB file (dev only) and restart to re-run migrations.

See `docs/TROUBLESHOOTING.md` for a fuller checklist.
