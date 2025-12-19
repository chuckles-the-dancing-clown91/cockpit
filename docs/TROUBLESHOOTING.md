# Troubleshooting (Dev)

This is a “save future-me time” list.

## Tauri dev won’t start / tries to run a command from someone else’s machine

Check `backend/tauri.conf.json` → `build.beforeDevCommand`.

If you see an absolute path (e.g. `/home/.../proj/frontend`) replace it with a relative command that works on any machine:

```json
{
  "build": {
    "beforeDevCommand": "pnpm -C ../frontend dev",
    "beforeBuildCommand": "pnpm -C ../frontend build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../frontend/dist"
  }
}
```

## “Failed to link ideas” but no console error

This almost always means the frontend invoked a command that the backend didn’t recognize (or the DTO shape didn’t match).

Checklist:

1. Verify the command exists in `backend/src/main.rs` `generate_handler![...]` (source of truth).
2. Confirm the frontend is calling the exact string name:
   - Example: `kg_link_writing_idea` (knowledge graph)
   - Example: `writing_link_idea` (writing module convenience)
3. Ensure the invoke payload matches the Rust command signature.
4. Temporarily log the invoke error:

   ```ts
   try {
     await invokeTauri('kg_link_writing_idea', { writingId, ideaId });
   } catch (e) {
     console.error('link failed', e);
     throw e;
   }
   ```

## UI becomes unclickable after opening/closing dialogs

If the `<body>` ends up with `pointer-events: none` and never recovers, a dialog/overlay is not unmounting cleanly.

Things to check:

- Ensure you only render **one** Radix Dialog root per modal instance.
- Don’t nest Dialogs unless the inner uses `modal={false}` or you intentionally manage stacking.
- If you conditionally render the dialog content, keep the `Dialog.Root` mounted and only toggle `open`.

## Database looks “reset” between runs

The database file lives in the OS app data dir by default.

- Override with `DB_URL=sqlite:/absolute/path/to/dev.db` when you want a stable dev DB.
- The backend will run migrations on startup; deleting the DB file recreates it.

## Schema changed but app crashes

You likely added/edited a migration but didn’t include it in the migrator list.

- Update `backend/migration/src/lib.rs` to include the new migration.
- Re-run the app; migrations run automatically.

## Copilot keeps rebuilding the same UI logic

Point it at `docs/FEATURE_CONVENTIONS.md` and tell it:

> “Reuse existing feature modules/hooks/components. Don’t add new ‘domains’ folders.”
