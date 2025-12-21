# Cockpit Roadmap (Cleaned)

High-level view of what’s active and what’s next. Completed/obsolete phases are removed.

## Current Focus
- **Research (Feed Sources + Stream)**: Make the new Stream experience reliable (listing + filters + actions) and polish the Sources configuration UI.
- **Ideas View Port**: Bring Ideas view up to parity with the new app shell + dialogs.
- **Integration & Testing**: Smoke tests across Writing/Research flows; tighten command/type contracts.

## Active Initiatives

### Research — Feed Sources + Stream (now)
Goal: Stable ingestion + reading loop for news articles using `feed_sources` + `news_articles`.

- Sources UI: create/update/delete/toggle + schedules + “Sync now”
- Stream UI: list articles, filter (search, starred, include dismissed, per-source), and basic actions (star/read/dismiss)
- Backend: keep plugin system under `backend/src/research/components/feed/` as the single pathway for ingest/sync

Next upgrades:
- Add undo actions (restore dismissed, mark unread) and wire UI
- Replace the current “feed source association via `added_via` string” with an explicit column (`news_articles.feed_source_id`) + migration/backfill
- Add in-app article viewer + “Convert to Reference” flow

### Research — Connectors + Publish (later)
Goal: Extend beyond NewsData to Reddit/RSS/X/etc. with capability-gated publish and normalized storage.

- Migrations: `research_accounts` + `research_streams` + `research_items`
- Adapter trait: supported capabilities + config validation + idempotent sync
- Commands: `research_*` accept camelCase `input` DTOs and enforce allowed capabilities server-side

### Backend Modernization (remaining)
- Apply sea-orm 1.1 patterns where missing.
- Refresh scheduler/http client patterns.
- Improve tracing + thiserror usage.
- Column/index optimization where hot paths need it.

### Integration & Testing
- Wire System views (Settings, Storage, Logs, Tasks) fully to Tauri commands.
- Add end-to-end smoke tests across Writing/Ideas/Research flows.

## Near-Future
- Publish expansion: enable outbound publish per connector once ingestion is stable; persist publish metadata linked to writings.
- DB portability follow-ups (Postgres readiness) after Research work stabilizes.
