---
applyTo: "backend/**"
---

# Backend Instructions (Tauri v2 + SeaORM)

## Commands
- Commands are `#[tauri::command]` and return `Result<T, String>`.
- Keep command signatures JSON-friendly: primitives, strings, vecs, and serde structs.

## Database
- Use SeaORM entities and the SeaORM migration crate.
- Migrations are Rust-only; do not add raw SQL migration files.

## Editor storage
- Writing content is TipTap JSON stored in a JSON column.
- Versions are stored as immutable version rows.
- Use DB transactions for multi-write operations.
