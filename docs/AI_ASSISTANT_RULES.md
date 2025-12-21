# AI Assistant Rules (Copilot / GPT)

If you use an AI assistant on this repo, paste these rules into your instructions file (or keep this doc open while prompting).

This is not about style. It’s about preventing **structural drift**.

## Non-negotiables

1) **Feature-first**

   - New frontend code goes in `frontend/src/features/<feature>/...`
   - New backend code goes in `backend/src/<feature>/...`
   - `frontend/src/domains/*` is for routing targets and screen composition (domains compose; features implement).

2) **Reuse before build**

   If a feature already has UI (cards, dialogs) and data hooks, reuse them. Do not copy/paste a “similar” component into another folder.

3) **One command, one wrapper, one hook**

   - Backend: add a `#[tauri::command]` function in a feature’s `commands.rs`
   - Frontend: add a typed wrapper in `frontend/src/core/api/tauri.ts`
   - Frontend: add a query/mutation hook in the feature’s `hooks/*`

4) **Radix is the design system**

   - Use Radix Themes + tokens (`var(--color-...)`)
   - Prefer Radix Primitives for interactive UI (Dialog, Toolbar, Tabs, Accordion)
   - Avoid ad-hoc CSS that fights Radix layout/overflow rules

5) **SeaORM migrations only**

   - No raw `.sql` migration files
   - Schema changes happen in `backend/migration`

## Anti-pattern ban list

Tell the assistant **not** to do these:

- Create a new `domains2/`, `services/`, `utils/api2` folder because “it feels cleaner”
- Introduce a second query library or state manager “just for this screen”
- Store rich text in multiple competing formats unless a migration is included (choose one canonical format)
- Change command names without updating the frontend wrappers and hooks

## Good prompt template

When you want work done, lead with constraints:

> “Implement X as a feature-first change. Reuse existing components/hooks. Backend: add a Tauri command in `backend/src/<feature>/commands.rs`. Frontend: add a typed wrapper in `frontend/src/core/api/tauri.ts` and a TanStack Query hook. Use Radix for UI.”

Then provide: the file(s) to modify, expected UI behavior, and expected command inputs/outputs.
