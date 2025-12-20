# Cockpit Roadmap (Cleaned)

High-level view of what’s active and what’s next. Completed/obsolete phases are removed.

## Current Focus
- **Research Connectors & Stream**: Unified ingestion/publish pipeline with pluggable adapters (RSS, Reddit, X, FB), normalized storage, and per-connector capability toggles.
- **Backend Modernization (remaining items)**: Medium-priority refactors from the audit (SeaORM patterns, scheduler/http patterns, tracing/thiserror upgrades, column optimizations).
- **Integration & Testing**: Wire remaining system views to backend, add end-to-end tests across domains.

## Active Initiatives

### Research Connectors & Stream
Goal: Single ingestion layer with adapter trait; commands accept camelCase `input` DTOs; UI built in `features/research/`.

- Migrations: `research_accounts` (provider/auth/permissions), streams linked to accounts (filters + schedule), `research_items` (source_type/external_id unique, payload_json).
- Commands: accounts (`research_list_accounts`, `research_upsert_account`, `research_delete_account`, `research_test_account`, `research_update_permissions`); streams (`research_list_streams`, `research_upsert_stream`, `research_delete_stream`, `research_sync_stream_now`); items (`research_list_items`, `research_set_item_status`); publish (`research_publish`) gated by capabilities.
- Capabilities: adapter advertises supported_capabilities; per-account allowed_caps_json enforced server-side for ingest/publish; scheduler only runs when enabled and ReadStream is allowed.
- Frontend: Accounts/streams UI with ingest/publish toggles + capability checkboxes; sync/test actions; stream list with provider/date/tag/status/search filters; item detail actions (Convert to Reference, Attach to Idea, Append to Notes); publish actions hidden when not allowed.
- Structure: Backend `connectors/` per-provider + guards in `research` commands; DTOs in `backend/src/research/dto.rs`; Frontend feature in `frontend/src/features/research`.
- Guard pattern:
  ```rust
  fn require_cap(source: &ResearchAccount, cap: ResearchCapability) -> AppResult<()> {
      if !source.enabled { bail!("Source disabled"); }
      if !source.allowed_caps.contains(&cap) { bail!("Capability not allowed"); }
      Ok(())
  }
  ```

### Backend Modernization (remaining)
- Apply sea-orm 1.1 patterns where missing.
- Refresh scheduler/http client patterns.
- Improve tracing + thiserror usage.
- Column/index optimization where hot paths need it.

### Integration & Testing
- Wire System views (Settings, Storage, Logs, Tasks) fully to Tauri commands.
- Add end-to-end smoke tests across Writing/Ideas/Research flows.

## Near-Future
- Publishing expansion: enable outbound publish per connector once ingestion is stable; persist publish metadata linked to writings.
- DB portability follow-ups (Postgres readiness) after connector work stabilizes.
