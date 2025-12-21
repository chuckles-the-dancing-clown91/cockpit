# Feature Conventions (Copilot-Proofing)

This file exists for one reason: **stop drift**.

When you add functionality, it should land in a predictable place so every other screen can reuse it.

## 1) Feature-first is the rule

✅ New code goes in:

```
frontend/src/features/<feature>/...
backend/src/<feature>/...
```

🚫 Avoid adding new top-level categories (`domains2/`, `shared2/`, `utils2/`, etc.). If you need a shared utility, put it in `frontend/src/core/...`.
`frontend/src/domains/*` is used for routing targets and screen composition (domains compose; features implement).

## 2) Standard feature module shape

For most features, prefer this layout:

```
features/<feature>/
  hooks/          # react-query queries + mutations
  components/     # UI
  types.ts
  index.ts        # barrel exports
```

If a feature needs UI state, add `state.ts` using Zustand (but keep it scoped to that feature).

## 3) Backend module shape

```
backend/src/<feature>/
  mod.rs          # exports
  commands.rs     # #[tauri::command] entrypoints
  dto.rs          # serde types for I/O
  service.rs      # logic + DB
  model.rs        # SeaORM entities (if needed)
```

## 4) Command naming and "one source of truth"

- Command names are the Rust function names (`writing_create`, `ideas_list`, …).
- Frontend calls should be centralized in `frontend/src/core/api/tauri.ts`.
- UI components should call hooks, not `invoke()` directly.

## 5) Don’t rebuild existing primitives

Before creating a new list/detail dialog, check for an existing component:

- Idea cards + detail dialog already exist in the Ideas feature.
- Reference cards and “add reference” patterns already exist.

If the Writing screen needs an Ideas list, import the Ideas feature component/hook instead of duplicating.

## 6) Styling rules (Radix)

- Use Radix Themes tokens (`var(--color-*)`) instead of hard-coded colors.
- Keep layouts CSS-grid based; avoid nested scroll containers unless you set `min-height: 0`.
- If a dialog appears but is blank/un-clickable, check for accidental `pointer-events: none` on wrappers.

## 7) “Ban list” (things we keep deleting)

If you see these patterns in PRs or Copilot output, reject them:

- New API layer that wraps `fetch()` instead of using Tauri commands
- New folder trees like `frontend/src/domains2/*` or `frontend/src/pages/*` that duplicate routing
- Duplicated types (copy/pasted DTOs instead of importing from `features/<feature>/types`)
- Untracked one-off CSS colors instead of Radix tokens
