# Frontend Agent Notes

## Non-negotiables
- Use `@/` imports (no deep relative imports unless you’re already in the same folder).
- Keep **Radix Themes** for layout + tokens, **Radix Primitives** for interactive pieces.
- Data fetching/mutations go through **TanStack Query** hooks in `features/`.

## Tauri API usage
- Only call backend via `frontend/src/core/api/tauri.ts`.
- If a backend command is missing, add it there first (typed wrapper), then consume it in a feature hook.

## “Don’t drift” checklist
Before you create a new file:
1) Search for an existing component/hook in `features/` or `components/`
2) If it’s screen-specific, put it in `domains/`
3) If it’s reusable, put it in `features/` (logic) or `components/` (UI)

## Common gotchas
- Modals in Radix can appear “blank” if the content container has `pointer-events: none` or height/overflow is wrong.
- For split panes, ensure the middle editor has a parent with `min-height: 0` and the correct flex/grid constraints.

## Radix Themes notes
- `TextField` in Radix Themes is controlled via `TextField.Root` props (avoid `TextField.Input` which is not exported).

## Tauri invoke args
- Don’t pass `undefined` fields in invoke payloads; omit keys entirely (Tauri arg deserialization can fail silently).
