# Active Tasks

Keep this lean. 
    Completed items live in `docs/DONE.md`. 
    Roadmap in `docs/ROADMAP.md`. 
    Sprint details in `docs/sprint_priorities.md`. 
    Patterns in `docs/references.md`.

---

## 🔥 Ideas View Port (from src-old)
- Fix IdeaDetailDialog visibility (BLOCKER)
- Multi-select (checkboxes + bulk ops)
- Inline status editing in cards
- NotesEditor integration (TipTap/markdown)
- Per-reference notes (inline)
- UI polish: badges, hover states, selection highlight

## 🔥 Research Connectors & Stream
- DTOs: ResearchSource/Item + filters; Capability enum (ReadStream, Search, PublishPost, PublishReply, React/Vote)
- Migrations: `research_accounts` (provider/auth/permissions); streams linked to accounts (filters + schedule); `research_items` (source_type + external_id unique, payload_json)
- Commands: accounts (`research_list_accounts`, `research_upsert_account`, `research_delete_account`, `research_test_account`, `research_update_permissions`); streams (`research_list_streams`, `research_upsert_stream`, `research_delete_stream`, `research_sync_stream_now`); items (`research_list_items`, `research_set_item_status`); publish (`research_publish`) gated by capabilities
- Adapters: provider trait with supported_capabilities + config validation; first adapter (RSS or Reddit) end-to-end with idempotent sync
- Scheduler: only sync when enabled and ReadStream allowed; per-stream schedules
- Frontend (`features/research/`): accounts/streams UI with ingest/publish toggles + capability checkboxes, sync/test actions; stream list with provider/date/tag/status/search filters; item detail actions (Convert to Reference, Attach to Idea, Append to Notes); hide publish if not allowed
- Audit: record upstream publish actions linked to writing_id
- Structure:
  - Backend: `backend/src/connectors/*` (per-provider) + guards in `research` commands; DTOs in `backend/src/research/dto.rs`
  - Frontend: `frontend/src/features/research/{api,hooks,components}`; domains compose only
  - Guard example:
    ```rust
    fn require_cap(source: &ResearchAccount, cap: ResearchCapability) -> AppResult<()> {
        if !source.enabled { bail!("Source disabled"); }
        if !source.allowed_caps.contains(&cap) { bail!("Capability not allowed"); }
        Ok(())
    }
    ```
  - Commands shape (camelCase input):
    `invoke("research_sync_stream_now", { input: { streamId } })`
    `invoke("research_publish", { input: { accountId, payload } })`
- Immediate fixups (backend scaffolding):
  - Convert remaining `Utc::now()` uses to `naive_utc()` in research commands (updated_at/created_at)
  - Fix NewsData connector partial move: clone fields before `json!(art)`
  - Remove unused imports (ensure_capability, QuerySelect) once guards wired

### Immediate steps (research/up/downstream)
- Finalize Capability enum + adapter trait signature (supported_capabilities, validate_config)
- Write migrations for `research_accounts` + link streams to account_id; add `allowed_caps_json` + `enabled`
- Scaffold commands for accounts/streams/items/publish with capability guard
- Implement first adapter (RSS or Reddit) with sync + idempotent upsert into `research_items`
- Frontend: build Accounts/Streams editor with ingest/publish toggles; stream list with filters; item detail actions wired to existing reference/idea/note flows
