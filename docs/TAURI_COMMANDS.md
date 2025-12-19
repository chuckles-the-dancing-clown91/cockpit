# Tauri API (Commands)

The frontend talks to the backend exclusively through **Tauri commands** (`#[tauri::command]`).

- Commands are registered in `backend/src/main.rs` via `tauri::generate_handler![...]`.
- Frontend calls them using `invokeTauri()` in `frontend/src/core/api/tauri.ts`.

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

The following commands are currently registered in `backend/src/main.rs`.

### System / settings

- `get_settings` / `update_settings`
- `get_app_version`

### Ideas

- `list_ideas`, `create_idea`, `update_idea`, `delete_idea`

### Research / references

- `list_references_for_idea`, `add_reference`, `update_reference`, `delete_reference`

### Notes

- `create_note`, `update_note`, `delete_note`, `list_notes_for_idea`, `list_notes_for_reference`

### Writing

- `list_writings`, `get_writing`, `create_writing`, `update_writing`, `delete_writing`
- `list_writing_ideas`, `add_idea_to_writing`, `remove_idea_from_writing`

### Knowledge graph (advanced)

- `kg_create_writing`, `kg_get_writing`
- `kg_list_writings`, `kg_update_writing`, `kg_delete_writing`
- `kg_link_writing_idea`, `kg_unlink_writing_idea`
- `kg_list_writing_ideas`
- `kg_upsert_reference`, `kg_list_references_for_idea`, `kg_add_reference`, `kg_update_reference`, `kg_delete_reference`
- `kg_create_note`, `kg_update_note`, `kg_delete_note`, `kg_list_notes_for_idea`, `kg_list_notes_for_reference`

> Note: there is some intentional overlap between the “simple” commands and the `kg_*` commands while the UI migrates. New UI code should prefer one path consistently (recommended: the non-`kg_*` set unless you specifically need KG behavior).

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

- Add a function in `frontend/src/features/<feature>/api.ts` (preferred) or `frontend/src/core/api/index.ts`.
- Call it via `invokeTauri<Out>("your_new_command", { ... })`.

4) Add a React Query hook (recommended): `useYourThing()` / `useCreateYourThing()` etc.

## Error handling

Backend commands return `Result<T, String>`. The frontend should treat failures as user-visible:

- show a toast (or inline error)
- avoid swallowing exceptions silently
