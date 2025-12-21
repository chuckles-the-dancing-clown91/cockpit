# Backend Agent Notes

## Non-negotiables
- Migrations are Rust (SeaORM Migration) in `backend/migration/src/`.
- Commands should be thin: validate input → call service → return DTO.
- Services own business logic and DB writes.

## Command registration
- Add new commands to the `tauri::generate_handler![...]` list in `backend/src/main.rs`.
- Keep command names consistent with `frontend/src/core/api/tauri.ts`.

## JSON strategy
- Prefer storing structured blobs as JSON strings (TEXT) with serde serialization.
- Use explicit DTO structs; don’t leak DB entity structs to the UI.

## Research feed notes
- Feed sources + news stream live in `backend/src/research/components/feed/`.
- Article rows are currently associated to a feed source via `news_articles.added_via = feed_source:{id}` for filtering; prefer a real FK column in a future migration.
