# Tauri API (Commands)

The frontend talks to the backend exclusively through **Tauri commands** (`#[tauri::command]`).

- Commands are registered in `backend/src/main.rs` via `tauri::generate_handler![...]`.
- Frontend calls them via typed wrappers in `frontend/src/core/api/tauri.ts` (which uses `@tauri-apps/api/core`).

## Naming

Commands follow a simple pattern:

- `list_*`, `get_*`, `create_*`, `update_*`, `delete_*` for standard CRUD
- Prefix groups for larger aggregates (e.g. `kg_*` for “knowledge graph” operations)

Keep command names stable. Renaming a command breaks the frontend silently until runtime.

## Where commands live

Backend modules usually have:

```
backend/src/<feature>/
  commands.rs    # #[tauri::command] entrypoints
  dto.rs         # request/response types
  service.rs     # database logic
```

Example: `backend/src/writing/commands.rs`.

## Current command surface (registered)

The source of truth is always `backend/src/main.rs` → `tauri::generate_handler![...]`.

If you need to quickly inspect what’s available:

```bash
rg -n "generate_handler!\\[" backend/src/main.rs
```

## Adding a new command

1) Add the Rust function:

```rust
#[tauri::command]
pub async fn your_new_command(
  state: tauri::State<'_, AppState>,
  input: YourInput
) -> Result<YourOutput, String> {
  // ...
}
```

2) Register it in `backend/src/main.rs` inside `tauri::generate_handler![ ... ]`.

3) Add a typed frontend wrapper:

- Add a function in `frontend/src/core/api/tauri.ts`.

4) Add a React Query hook (recommended): `useYourThing()` / `useCreateYourThing()` etc.

## Error handling

Backend commands return `Result<T, String>`. The frontend should treat failures as user-visible:

- show a toast (or inline error)
- avoid swallowing exceptions silently

## Common gotcha: `undefined` invoke args

Tauri command argument deserialization is strict; avoid passing `{ someKey: undefined }`.

- Prefer building args objects conditionally and omitting keys entirely when a value is not provided.
