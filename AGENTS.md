# Cockpit — Agent Instructions (Codex / Copilot / any coding agent)

**Read this file first.** If this conflicts with generated code or older patterns, **this file wins**.

## Mission
Cockpit is a Tauri v2 desktop app for turning *Ideas → Writing (articles/books)* with references, notes, and versioning.
We prioritize:
- Reuse over rebuild (use existing feature modules, hooks, components)
- Consistent UX (Radix Themes + Radix Primitives)
- One backend pathway (Tauri invoke → Rust command → service → SeaORM)
- JSON-first content (TipTap JSON / structured metadata)

## Stack
- **Frontend:** React + TypeScript + Vite, Radix Themes/Primitives, TanStack Query
- **Backend:** Rust + Tauri v2, SeaORM (ORM), SeaORM Migration (no raw SQL files)
- **DB:** SQLite (via SeaORM), with JSON stored as TEXT (serialized) where needed

## Source of truth for patterns (do not invent new ones)
- Frontend Tauri API wrapper: `frontend/src/core/api/tauri.ts`
- Backend invoke registration: `backend/src/main.rs` (`tauri::generate_handler![...]`)
- Backend command modules: `backend/src/*/commands.rs`
- Migrations: `backend/migration/src/m*_*.rs` (SeaORM Migration)
- UI primitives: Radix Themes/Primitives, plus existing shared components in `frontend/src/components`

## Directory model
### Frontend (`frontend/src`)
- `core/` — app-wide providers, api wrappers, shared stores (only if truly cross-cutting)
- `features/` — reusable feature modules (hooks, api helpers, components)
- `domains/` — screen/workspace composition (views, page layouts, routing targets)
- `components/` — shared UI components (generic, reusable)
- `styles/` — global css

**Rule:** *Domains compose; Features implement.*  
If something is reusable across screens, it belongs in `features/` or `components/`.

### Backend (`backend/src`)
- Each domain (ideas, writing, notes, references, etc) is a module with:
  - `commands.rs` — tauri command handlers (thin)
  - `service.rs` — business logic (real work)
  - `models.rs` / `dto.rs` as needed
- Shared DB + app state in the existing patterns (do not create new global singletons).

## “Golden path” for any new feature
1. **DB**: add/update SeaORM Migration (`backend/migration/...`)
2. **Entity/Model**: update SeaORM entities if needed
3. **Service**: implement logic in `backend/src/<module>/service.rs`
4. **Command**: expose via `backend/src/<module>/commands.rs`
5. **Register**: add command to `backend/src/main.rs` `generate_handler![]`
6. **Frontend API**: add typed wrapper in `frontend/src/core/api/tauri.ts`
7. **Feature hook**: add TanStack Query hook in `frontend/src/features/<feature>/hooks.ts`
8. **UI**: update domain workspace/view to use existing feature components

## Strict rules (ban list)
- ❌ Do **not** add raw `*.sql` migrations. Use SeaORM migration Rust files only.
- ❌ Do **not** call `invoke()` directly from random components. Use `frontend/src/core/api/tauri.ts`.
- ❌ Do **not** create duplicate “mini APIs” in each feature unless there’s a clear reason.
- ❌ Do **not** introduce a new UI library (keep Radix).
- ❌ Do **not** add a second state-management pattern (keep existing stores/hooks).
- ❌ Do **not** rebuild existing components (search `features/` + `components/` first).

## UX/Layout conventions
- Workspaces follow the **1/4 – 1/2 – 1/4** model when applicable:
  - Left: attached ideas + reference accordion
  - Center: editor
  - Right: title/meta/settings
- Dialogs/Overlays: Radix Dialog. Keep focus + scroll lock correct.
- Toolbar: Radix Toolbar; include headings (H1/H2/H3), word count, version selector.

## Writing system content
- Editor content is **TipTap JSON** (stored as JSON string)
- Writing metadata: title, subtitle, tags, type (article/book/etc), active_version_id
- Version history: immutable snapshots (content_json + metadata_json + created_at)

## If you’re unsure
- Prefer editing existing code over adding new files.
- Ask: “Where does this already exist?” then reuse it.
- Keep changes small and composable.

_Last updated: 2025-12-19_
