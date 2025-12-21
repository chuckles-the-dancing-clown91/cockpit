# Frontend Development

Frontend lives in `frontend/`.

## Stack

- React 19 + TypeScript
- Vite
- Radix Themes (app theme) + Radix Primitives (dialogs, toolbar, etc.)
- TanStack Query (data fetching/caching)

## Folder layout

```
frontend/src/
  features/          # reusable feature modules (hooks + UI)
    ideas/
    writing/
    research/
    ...
  core/              # app-wide infrastructure (providers, typed Tauri API, utilities)
  components/        # shared UI building blocks
  domains/           # screen composition + routing targets
```

### The rule

- Domains compose; features implement.
- Screen-specific layout belongs in `domains/`.
- Reusable logic/components belong in `features/` or `components/`.

## Feature pattern (copy/paste mental model)

Each feature should own its UI + queries + API wrappers:

```
features/<feature>/
  hooks/             # useQuery/useMutation hooks (TanStack Query)
  components/        # feature UI components (optional)
  types.ts           # feature-local types (optional)
  index.ts           # barrel exports
```

### API calls (Tauri)

Use the shared typed wrappers:

- `frontend/src/core/api/tauri.ts` — typed wrappers around `@tauri-apps/api/core`.

**Conventions:**

- Keep API wrappers “dumb”: no React state, no caching — just call the Tauri command.
- Put caching + invalidation in hooks (`hooks/use...`).
- Don’t include `undefined` keys in command args; omit keys entirely.

## TanStack Query conventions

- Define stable query keys in `frontend/src/shared/queryKeys.ts`.
- Queries: use `useQuery`.
- Mutations: use `useMutation` and **invalidate** relevant keys.

Example pattern:

```ts
// features/ideas/keys.ts
export const ideasKeys = {
  all: ['ideas'] as const,
  list: (filters: unknown) => [...ideasKeys.all, 'list', filters] as const,
};
```

## UI conventions (Radix)

- The app uses Radix Themes tokens. Prefer CSS variables (e.g. `var(--color-surface)`) over hardcoded colors.
- Prefer Radix Primitives for overlay UI (Dialog/Popover/Dropdown/Toolbar) instead of custom div overlays.
- For dialogs: keep focus handling + scroll locking inside Radix Dialog; avoid manually setting `pointer-events` on `<body>`.

## Writing workspace layout

The writing screen layout is designed as **1/4 – 1/2 – 1/4**:

- **Left panel (≈25%)**: linked ideas + references accordion (quick lookup while writing).
- **Center (≈50%)**: the editor (TipTap) + toolbar.
- **Right panel (≈25%)**: metadata (title, subtitle, tags, type, status, etc.).

Implementation guidance:

- Reuse **existing** Ideas components (cards, dialogs, list hooks) inside the Writing feature rather than re‑creating a parallel “mini ideas system”.
- The linked‑ideas panel should call the *same* list endpoints/hooks as IdeasView; only the **filter** changes (linked vs unlinked).

## Editor toolbar

Tooling expectations:

- Radix `Toolbar` is the wrapper.
- Common formatting actions (bold/italic/list/link).
- Block controls: **H1 / H2 / H3 / paragraph**, code block, quote.
- Insert helpers: image, LaTeX, etc. (as they’re added).
- Live metadata: word count, current version selector (opens version dialog).

## Troubleshooting (frontend)

### “Dialog is hidden / content not clickable”

If you see `<body data-scroll-locked ... style="pointer-events: none;">`:

- You likely have multiple overlay systems fighting (two dialogs open, nested dialogs, or mixing Radix Themes Dialog + custom overlay).
- Ensure only one Dialog root is controlling scroll lock.
- Make sure the Dialog *content* isn’t styled with `pointer-events: none`.

### “Works in IdeasView, breaks in WritingView”

Common causes:

- The writing feature is importing legacy `domains/...` code while IdeasView uses `features/...` (or vice versa).
- Different React Query keys or providers (WritingView mounted outside the QueryClientProvider).
- A silent Tauri invoke failure (wrong command name or argument shape). Always surface `error.message` in the UI and log the invoke payload.

See `docs/TROUBLESHOOTING.md` for a broader checklist.
