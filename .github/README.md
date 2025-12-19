# Copilot Instructions (Cockpit monorepo)

These are **hard rules**. If a request conflicts with these, do the *minimum change* that obeys them.

---

## Repo layout (do not invent new top-level folders)

```
/backend        Rust + Tauri commands + SeaORM
/frontend       React + Radix Themes + TanStack Query + Zustand
```

### Frontend key folders (canonical)
```
/frontend/src
  /core                 app shell + shared infra (tauri API, query client, routing)
  /features             ALL product features live here (ideas, writing, notes, references, research, system)
  /domains              thin "screens" only (compose features; no business logic)
  /shared               shared types, utils, constants, theme glue
```

**Rule:** New feature work goes in `/features/<feature>/...`.  
`/domains/*` should stay as *thin wrappers* (layout + wiring), not places where logic or duplicate UI is built.

---

## The “stop drifting” rules (read twice)

### 1) Do not rebuild UI that already exists
If an Idea list/card/dialog exists in `features/ideas`, **import it**.
- ✅ `import { IdeaCard } from '@/features/ideas/components/IdeaCard'`
- ❌ Re-implementing Idea cards inside writing/research/system

### 2) Do not call `invoke()` directly inside features
All Tauri calls must be centralized.
- ✅ Add/modify commands in: `frontend/src/core/api/tauri.ts`
- ✅ Feature API files call **core/api/tauri.ts** functions
- ❌ `import { invoke } from '@tauri-apps/api/core'` anywhere outside `core/api/tauri.ts`

This prevents “frontend thinks it returns X / backend returns Y” mismatches.

### 3) Shared types are single-source-of-truth
All shared DTOs/interfaces/types live in:
- `frontend/src/shared/types/*` (and re-export from `frontend/src/shared/types/index.ts`)

Do **not** define duplicate “Idea”, “Writing”, “Reference” types inside feature folders.

### 4) Server state vs UI state
- **TanStack Query** = server state (lists, detail, mutations)
- **Zustand** = UI state (selection, panel open/closed, filters) only

No local caches that shadow query state.

### 5) No SQL files
Backend schema changes must use **SeaORM migrations** (`backend/migration/src/m0xx_*.rs`), not raw `.sql`.

---

## UI/Theme rules (Radix Themes first)

- Prefer Radix Themes components (`@radix-ui/themes`) for layout primitives: `Box`, `Flex`, `Card`, `Text`, `Button`, `TextField`, `Tabs`, etc.
- Tailwind utility classes are allowed for layout/spacing **only when Radix doesn’t cover it cleanly**.
- Use CSS variables from Radix Themes (no hard-coded hex colors).
- Icons: `lucide-react`.

### Layout standards
- Screen layouts should be `Flex`/`Grid` with `minHeight: 0` in nested panes.
- Dialogs/Drawers must preserve pointer-events and focus trapping:
  - Don’t set `pointer-events: none` on the dialog content.
  - If you use Radix Dialog primitives, ensure overlay/content stacking is correct.

---

## Writing Workspace (product spec)

The writing workspace is a 3-pane layout:
- **Left (1/4):** linked ideas (small cards) + references accordion (for quick lookup)
- **Center (1/2):** editor (TipTap)
- **Right (1/4):** metadata panel (title, subtitle, type, tags, status, etc.)

### Editor toolbar (Radix Toolbar)
Toolbar includes:
- Bold/Italic/Strike
- Bullet/Numbered list
- Link
- **Heading level dropdown:** Normal / H1 / H2 / H3
- Code block + LaTeX block (as separate node types)
- Image insert
- Word count (read-only)
- Version dropdown (opens version history dialog)

**Rule:** Use Radix Toolbar primitives for the toolbar. Don’t build a random div-toolbar.

---

## Backend rules (Tauri + SeaORM)

### Tauri command naming
New commands must follow:
```
<feature>_<verb>[_<noun>]
examples:
writing_create
writing_update
writing_list
writing_list_versions
writing_restore_version
writing_link_idea
writing_unlink_idea
writing_list_linked_ideas
```

### Input/Output consistency
- If the UI needs an object, the backend returns an object DTO.  
  Do not return a list of IDs and make the UI guess.
- Use `serde` DTO structs in the feature module, not anonymous maps.

### Migrations
- Add new migration file: `migration/src/m0xx_<name>.rs`
- Register it in `migration/src/lib.rs` in order.
- Use SeaORM `Table::create()` / `ColumnDef` / `ForeignKey` etc.
- Use JSON columns where appropriate (`JSON`/`JSONB` depending on DB), but be consistent with existing schema.

---
## Development workflow

### First-time setup
```bash
cd frontend && npm install
```

**Encryption key**: Auto-generated on first app run. The app will create `COCKPIT_MASTER_KEY` in `backend/.env` automatically. No manual setup needed.

### Development
```bash
cd backend && cargo tauri dev
```

This command:
- Builds the Rust backend
- Starts the frontend dev server (Vite at localhost:5173)
- Opens the Tauri window with hot-reload

### Production build
```bash
cd backend && cargo tauri build
```

Generates `.deb` and `.rpm` packages in `backend/target/release/bundle/`.

For advanced build options, see `scripts/build/` directory.

---
## Anti-drift “ban list” (Copilot: do NOT do this)

**Never introduce:**
- `/frontend/src/domains/*/components/*` that duplicates feature components
- A second API layer like `apiClient.ts`, `tauriClient.ts`, `invoke.ts` outside `core/api/tauri.ts`
- Ad-hoc “types.ts” inside a feature folder for cross-feature DTOs
- A new theming system (no Chakra/MUI/styled-components)
- Direct DOM manipulation or `document.querySelector` hacks
- Random new state management libraries
- “Quick fix” CSS like `position: fixed` overlays without Radix Dialog/Portal rules
- SQL migrations or schema changes in `.sql`

---

## Coding conventions

### File naming
- React components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Feature API: `features/<feature>/api/<feature>.ts` (thin wrappers around core/api/tauri.ts)
- Exports: each feature has `features/<feature>/index.ts` that re-exports public surface area

### Imports
- Use the `@/` alias.
- Avoid relative import chains like `../../../../`.

### Error handling UX
- Mutations use toast for user-facing errors.
- Log underlying error details in dev with `console.error(err)` once.

---

## Checklist before you finish a change

1) Did you reuse an existing feature component instead of duplicating UI?  
2) Did you avoid calling `invoke()` directly outside `core/api/tauri.ts`?  
3) Are shared types updated (and not duplicated)?  
4) Do backend commands return the shape the UI renders (IDs vs objects)?  
5) Did you preserve Radix Themes styling + layout (minHeight: 0, overflow)?  
6) Did you avoid adding a new architecture pattern or folder?

---

## Quick examples

### Add a new backend command
- Create `backend/src/<feature>/commands.rs` function with `#[tauri::command]`
- Register it in the Tauri builder command list (where commands are collected)
- Add a typed wrapper in `frontend/src/core/api/tauri.ts`
- Use it from feature hooks with TanStack Query

### Add a new feature view
- Add components/hooks in `frontend/src/features/<feature>/...`
- Compose the screen in `frontend/src/domains/<domain>/<Domain>View.tsx` by importing feature components
