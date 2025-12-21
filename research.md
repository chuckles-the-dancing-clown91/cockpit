# Research Connectors — Layout, Functionality, Logic

This doc covers two tracks:

1) **Current:** Feed Sources + News Stream (NewsData.io) built on the `feed_sources` + `news_articles` tables.
2) **Future:** “Connectors” pipeline (accounts/streams/items/publish) for Reddit/RSS/X/etc.

---

## Current: Feed Sources + News Stream

**Backend**
- Single pathway: `backend/src/research/components/feed/` (plugins + sync + CRUD)
- Commands: `list_feed_sources`, `create_feed_source`, `update_feed_source`, `toggle_feed_source`, `sync_feed_source_now`, `list_news_articles`, `toggle_star_news_article`, `mark_news_article_read`, `dismiss_news_article`

**Frontend**
- `frontend/src/domains/research/ResearchSourcesView.tsx` — manage feed sources
- `frontend/src/domains/research/ResearchStreamView.tsx` — browse articles (filters + actions)

**Known gaps**
- Article actions are currently one-way (dismiss/read don’t have undo yet).
- Per-source filtering currently relies on `news_articles.added_via = feed_source:{id}`; plan to replace with a real `feed_source_id` column.

## Mental Model
- **Research is an ingestion + routing pipeline**, not “social UI.”
- External platforms are **connectors** that feed/consume internal primitives (Reference, Snippet, Note, ResearchItem).
- All external HTTP happens in backend connectors; frontend talks to Tauri commands only.

---

## UI Layout (1/4 – 1/2 – 1/4)
**Left (1/4): Integrations**
- Accounts list (provider icon, display name).
- Toggles: downstream (feed) and upstream (posting) mapped to allowed capabilities.
- “Test connection” + “Manage streams” actions.
- Streams table per account: name, schedule, filters, enabled, “Sync now.”

**Center (1/2): Stream / Items**
- Filters: provider, account, stream, status (new/saved/dismissed/converted), tags, date range, search.
- Items list (ResearchItem) with status chips and source/provider badges.
- Bulk actions: mark saved/dismissed, convert to reference.

**Right (1/4): Item Detail**
- Preview: title, excerpt, url, published date, provider, stream.
- Actions: Convert to Reference, Attach to Idea, Append snippet to Notes, Open externally, Dismiss/Save.
- Raw metadata viewer (payload_json) for debugging.

---

## Capability Model (up/down)
**Capability enum** (backend + shared):
- `ReadStream` (ingest/list)
- `Search`
- `PublishPost`
- `PublishReply`
- `ReactVote`
- (Implicit) `IngestUrl` is always allowed (not provider-specific)

**Per-account allowed capabilities (downstream/upstream toggles)**:
- Stored as JSON array `allowed_caps_json` on `research_accounts`.
- `enabled` is master switch.
- Feed ON = enabled && allows `ReadStream` (optionally `Search`).
- Post ON = allows `PublishPost` (and others).

**Enforcement guard** (backend command helper):
```rust
fn require_cap(source: &ResearchAccount, cap: ResearchCapability) -> AppResult<()> {
    if !source.enabled { bail!("Source disabled"); }
    if !source.allowed_caps.contains(&cap) { bail!("Capability not allowed"); }
    Ok(())
}
```

**Adapters**:
- Each connector exposes `supported_capabilities() -> Vec<Capability>` and `validate_config(config, allowed_caps)`.
- Optional: `capability_requirements(cap)` for scopes (e.g., publish needs `tweet.write`).
- Commands check both “supported” and “allowed” before execution.

**UI toggles**:
- Two top-level switches in account editor: “Enable Feed (ingest)” and “Allow Posting (upstream).”
- Show capability checkboxes only for supported caps; warn when enabling publish.
- Hide/disable publish buttons if not allowed/supported.

---

## Data Model (aligned to migrations)
- `research_accounts`: provider, display_name, enabled, allowed_caps_json, permissions_json, auth_encrypted, timestamps.
- `research_streams` (downstream jobs): account_id, name, provider, enabled, config_json (filters), schedule_json, last_sync_at/error, timestamps.
- `research_items`: account_id, stream_id, source_type, external_id, url, title, excerpt, author, published_at, status (`new|saved|dismissed|converted`), tags_json, payload_json, timestamps. Unique index on `(source_type, external_id)`.
- Future publish audit: `research_actions` or reuse `writing_exports` (provider, account_id, payload summary, external_id, status, error, writing_id).

---

## Backend Structure
- `backend/src/connectors/{provider}.rs`: implements adapter trait (supported_capabilities, sync_feed, publish, validate_config).
- Commands in `backend/src/research/commands.rs` use guards + route to adapters.
- DTOs in `backend/src/research/dto.rs` (accounts, streams, items, inputs/filters, Capability).
- Capability guard used in sync/search/publish commands.
- Scheduler enqueues streams where `enabled && allowed_caps` contains `ReadStream`; retries/backoff on auth errors.

### Command Shapes (camelCase input)
- Accounts: `research_list_accounts()`, `research_upsert_account({ input })`, `research_delete_account({ id })`, `research_test_account({ id })`, `research_update_permissions({ input })`
- Streams: `research_list_streams({ accountId? })`, `research_upsert_stream({ input })`, `research_delete_stream({ id })`, `research_sync_stream_now({ streamId })`
- Items: `research_list_items({ filters })`, `research_set_item_status({ itemId, status })`, `research_convert_to_reference({ itemId, ideaId? })`
- Publish: `research_publish({ accountId, payload })` (guarded by capabilities)

### Ingestion helpers
- `research_ingest_url({ url, ideaId? })` → normalize URL, create Reference, optionally attach to Idea, append snippet to notes.

---

## Frontend Structure
- Feature: `frontend/src/features/research/`
  - Hooks live under `frontend/src/features/research/hooks/*` and call typed wrappers in `frontend/src/core/api/tauri.ts`
  - Components are optional; prefer shared components in `frontend/src/components/` when truly generic
- Domain: `frontend/src/domains/research/ResearchView.tsx` composes the feature (tabs: Feed, Integrations, Publish if/when enabled).
- UI rules: Radix Themes/Primitives; hide publish actions if not allowed; show capability checkboxes based on adapter-supported caps from API.

---

## Flows (scenarios)
**Ingest URL**
1) User pastes URL → `research_ingest_url`
2) Backend fetches metadata → Reference row; optionally link to Idea; append snippet to notes.

**Sync stream**
1) Scheduler or “Sync now” → command `research_sync_stream_now`
2) Guard: account enabled + allows `ReadStream`; adapter supports it
3) Adapter fetches → normalize to ResearchItem → upsert by (source_type, external_id)

**Convert item to Reference**
1) Item detail → “Convert to Reference”
2) Creates Reference and links Idea (if provided); mark item status `converted`.

**Publish (later)**
1) From Writing → `research_publish` with accountId/payload
2) Guard: account allows `PublishPost`; adapter supports it; scopes valid
3) Store external_id/status in publish audit table; surface in UI.

---

## Design Guardrails
- No per-platform tables for posts; use `research_items`.
- Adapters only normalize/act; UI never calls external APIs.
- Capability-driven: adapter supports X; account allows X; command enforces both.
- Idempotent sync via unique `(source_type, external_id)`.
- Explicit conversion to Reference; don’t auto-create references for all items.
- Webview browsing is optional; ingestion-first.
