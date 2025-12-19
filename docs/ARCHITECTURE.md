# Architecture

Cockpit is a local-first Tauri application:

- **Frontend:** React/TypeScript (Vite) + Radix UI
- **Backend:** Rust (Tauri commands) + SQLite (SeaORM)

The guiding rule is simple:

> Build new capability as a **feature** and reuse it everywhere.

If Copilot (or a human) starts rebuilding the same list/detail dialogs, query hooks, or API wrappers inside a new screen, that’s drift — and it will bite you.

## Repository layout

```
proj/
  frontend/        # React app (Vite)
  backend/         # Tauri app (Rust)
    migration/     # SeaORM migrations (Rust)
  docs/            # Developer docs (this folder)
```

## Frontend architecture

### Feature-first

New work should live in `frontend/src/features/<feature>`.

```
features/<feature>/
  api/            # Tauri wrapper functions for this feature
  hooks/          # TanStack Query hooks (useQuery/useMutation)
  components/     # Reusable UI for the feature
  types.ts        # Public types for the feature
  index.ts        # Public barrel exports
```

There is also a `frontend/src/domains/*` directory in this repo. Treat it as **legacy** (migration in progress). Don’t add new code there unless you’re explicitly moving it into `features/`.

### Data flow

1. **UI components** call feature **hooks**.
2. Hooks call feature **API wrappers**.
3. API wrappers call `invokeTauri()` with a command name + payload.
4. Backend command returns JSON → TanStack Query caches + normalizes.

### State boundaries

- **Server-ish data:** TanStack Query only (ideas, writings, references, links…)
- **UI state:** local component state, or small Zustand stores if multiple components need it

Avoid sprinkling ad-hoc fetch/mutation logic directly in screens.

## Backend architecture

### Command surface

Commands are plain Rust functions annotated with `#[tauri::command]` and registered in `backend/src/main.rs` via `tauri::generate_handler![...]`.

Conventions:

- Keep commands thin: validate → call service → return DTO
- Return `Result<T, String>` (and map errors to strings consistently)
- Group commands by feature module (`ideas`, `writing`, `research`, `system`)

### Database

- SQLite database file is created in the Tauri app data directory by default
- SeaORM handles queries and relations
- Schema is managed by `backend/migration` using SeaORM Migration
- Migrations run automatically at startup (see `core/components/db/migrations.rs`)

## “Knowledge graph” links

The data model supports linking:

- writings ↔ ideas
- ideas ↔ references
- notes ↔ (idea/reference/writing) (depending on the feature path)

These links are a core reason to keep things feature-first: once a relationship exists, it should be usable across the app without recreating UI or API glue.

## How to avoid Copilot drift

1. **No new “mini-APIs” in screens.** Add API + hooks inside the feature.
2. **No duplicate Idea card/dialog implementations.** Reuse `features/ideas/components/*`.
3. **No new folders like `modules/`, `services/`, `domains2/`.** Use the existing convention.
4. If you need to “quickly hack something,” put it behind a TODO and immediately refactor into a feature module.

For detailed conventions, see:

- `docs/Frontend_Development.md`
- `docs/Backend_Development.md`
- `docs/FEATURE_CONVENTIONS.md`
