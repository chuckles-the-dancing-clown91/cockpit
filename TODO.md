# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🎯 Current Sprint: Research Mode - Feed Management System

**Goal**: Build modular, plugin-ready feed system with stream view  
**Timeline**: December 15-18, 2025  
**Status**: Planning  

### Vision

Transform Research mode into a powerful, extensible feed aggregation platform where:
- **Feed sources are plugins** - NewsData.io, Reddit, RSS, Twitter/X, etc.
- **API keys managed per-source** - Encrypted, with test connection functionality
- **Stream view** - Real-time feed with filtering, sorting, starring, dismissal
- **Unified interface** - All feeds conform to common article schema

### Architecture Goals

1. **Plugin System Foundation**
   - Each feed source is a self-contained module
   - Common trait/interface for all sources
   - Hot-pluggable (enable/disable without restart)
   - Independent API key management
   - Per-source configuration (fetch interval, filters, etc.)

2. **Database Schema**
   - NEW: `feed_sources` table - Plugin metadata, API keys, enabled status, task_id
   - `news_articles` table - Unified article storage (already exists)
   - `system_tasks` table - Links each feed source to a scheduled sync task
   - Source types: NewsData, Reddit, RSS, Twitter, Custom
   - Each feed source has its own scheduled task for independent sync intervals

3. **Task System Integration** ⭐ NEW
   - Each feed source creates a corresponding system_task
   - Task type: `feed_sync_{source_id}` (e.g., `feed_sync_1`, `feed_sync_2`)
   - Independent cron schedules per source
   - "Sync All" button triggers all enabled source tasks
   - Task history shows per-source sync results

4. **Frontend Organization**
   - **Feed Sources** - Configure and manage feed plugins (with sync controls)
   - **Stream** - View aggregated feed with filters
   - **Articles** (existing) - Individual article view

---

## 📋 Sprint Tasks

### Phase 1: Database Schema & Backend Foundation

#### Task #1: Feed Sources Table & Migration 🔴
**Priority**: HIGH - New table for feed plugins  
**Estimated Effort**: 1 hour

**Action**: Create new `feed_sources` table (distinct from existing `news_sources`)

- [ ] **Create migration 004_feed_sources_up.sql**:
  - [ ] Create `feed_sources` table with fields:
    - `id` - Primary key
    - `name` - Display name (e.g., "NewsData.io Tech News")
    - `source_type` - Enum: NewsData, Reddit, RSS, Twitter, Custom
    - `enabled` - Boolean (0/1)
    - `api_key_encrypted` - BLOB (encrypted API key)
    - `config` - TEXT (JSON config: fetch_interval, categories, filters)
    - `task_id` - Foreign key to system_tasks (nullable)
    - `last_sync_at` - DATETIME
    - `article_count` - INTEGER (cached count)
    - `error_count` - INTEGER
    - `created_at`, `updated_at` - DATETIME
  - [ ] Create indexes on source_type, enabled, task_id

- [ ] **Update `news_articles` table**:
  - [ ] Add `feed_source_id` column (foreign key to feed_sources)
  - [ ] Keep existing `provider` and `source_name` for backward compatibility

- [ ] **Note**: Existing `news_sources` table tracks individual news outlets (CNN, BBC, etc.) - keep as-is

#### Task #2: Source Types & Plugin Trait 🔴
**Priority**: HIGH - Foundation for plugin system  
**Estimated Effort**: 2-3 hours

Create the plugin architecture:

- [ ] **backend/src/research/components/feed/plugin.rs**:
  - [ ] Define `FeedSource` trait with methods:
    - `fetch_articles()` - Fetch articles from source
    - `test_connection()` - Verify API key and connectivity
    - `get_metadata()` - Return source name, type, description
    - `parse_article()` - Convert source format to common Article schema
  - [ ] Define `SourceType` enum: NewsData, Reddit, RSS, Twitter, Custom
  - [ ] Define `SourceConfig` struct for per-source settings

- [ ] **backend/src/research/components/feed/sources/mod.rs**:
  - [ ] Create sources directory for plugin implementations
  - [ ] Re-export all source plugins

#### Task #3: NewsData.io Plugin Implementation 🔴
**Priority**: HIGH - Migrate existing integration  
**Estimated Effort**: 2 hours

Extract NewsData.io to plugin:
3 hours

Backend commands for source management:

- [ ] **backend/src/research/commands.rs**:
  - [ ] `list_feed_sources` - Get all sources with metadata (includes task info)
  - [ ] `get_feed_source` - Get single source by ID
  - [ ] `create_feed_source` - Add new source + create system_task
    - Creates feed source record
    - Creates corresponding system_task with cron schedule
    - LiAdd `sync_single_source(source_id)` function
    - Query feed source by ID
    - Instantiate appropriate plugin
    - Call plugin.fetch_articles()
    - Save articles with feed_source_id
    - Update source last_sync_at and article_count
    - Log success/errors
  - [ ] Add `sync_all_sources()` function
    - Query all enabled sources
    - Iterate and call sync_single_source()
    - Return summary (sources synced, articles added, errors) config, API key, enabled status
    - Updates feed source
    - Updates corresponding system_task schedule if changed
  - [ ] `delete_feed_source` - Remove source + cleanup
    - Soft deletes associated articles (set feed_source_id = NULL)
    - Deletes corresponding system_task
    - Deletes feed source record
  - [ ] `test_feed_source_connection` - Test API key validity
  - [ ] `toggle_feed_source` - Enable/disable source + task
    - Updates feed source enabled status
    - Updates system_task enabled status
  - [ ] `sync_feed_source_now` - Manual trigger for single source
  - [ ] `sync_all_feed_sources` - Trigger all enabled sources ⭐es()`
  - [ ] Handle per-source errors gracefully

#### Task #4: Source Management Commands 🔴
**Priority**: HIGH - CRUD for feed sources  
**Estimated Effort**: 2 hours

Backend commands for source management:

- [ ] **Header with actions:
    - **"Sync All" button** ⭐ - Triggers all enabled sources
    - "Add Source" button → opens modal/drawer
    - Filter by source type dropdown
    - Search by source name
  - [ ] Sources list with cards showing:
    - Source name, type badge (NewsData, Reddit, etc.)
    - Enabled toggle switch
    - Last sync time, article count
    - Sync schedule (cron expression in human readable)
    - "Sync Now" button per source ⭐
    - Edit and delete buttons
  - [ ] Loading states during sync operations
  - [ ] Toast notifications for sync results- Enable/disable source
  - [ ] Register all commands in main.rs

---

### Phase 2: Frontend - Feed Sources View

#### Task #5: Feed Sources Management Page 🔴
**Priority**: HIGH - Primary configuration interface  
**Estimated Effort**: 3-4 hours

Create dedicated sources management:
syncing, error, disabled)
  - [ ] Stats: articles fetched today, total, errors
  - [ ] Sync schedule display (e.g., "Every 45 minutes")
  - [ ] Last sync timestamp (relative: "2 hours ago")
  - [ ] Quick actions: Sync Now ⭐, Edit, Test Connection, Delete
  - [ ] Sync progress spinner when syncing
    - Source name, type badge (NewsData, Reddit, etc.)
    - Enabled toggle switch
    - Last fetch time, article count
    - Edit and delete buttons
  - [ ] "Add Source" button → opens modal/drawer
  - [ ] Filter by source type dropdown
  - [ ] Search by source name

- [ ] **frontend
    - name (text input)
    - source type dropdown (NewsData, Reddit, RSS, etc.)
    - API key input (show/hide with eye icon)
    - **Sync schedule** ⭐ (cron expression builder or preset intervals)
  - [ ] Config section (source-specific settings):
    - Fetch inteFeedSources()` query hook
  - [ ] `useGetFeedSource(id)` query hook
  - [ ] `useCreateFeedSource()` mutation
  - [ ] `useUpdateFeedSource()` mutation
  - [ ] `useDeleteFeedSource()` mutation
  - [ ] `useTestSourceConnection()` mutation
  - [ ] `useToggleFeedSource()` mutation
  - [ ] `useSyncFeedSourceNow(id)` mutation ⭐
  - [ ] `useSyncAllFeedSources()` mutation ⭐sk)cators (active, error, disabled)
  - [ ] Stats: articles fetched today, total, errors
  - [ ] Quick actions: Edit, Test Connection, Delete

- [ ] **frontend/src/components/research/SourceFormDialog.tsx**:
  - [ ] Form for create/edit source
  - [ ] Fields: name, source type dropdown, API key input (show/hide)
  - [ ] Config section (fetch interval, categories, filters)
  - [ ] "Test Connection" button with loading state
  - [ ] Save button

- [ ] **frontend/src/hooks/queries.ts**:
  - [ ] `useListNewsSources()` query hook
  - [ ] `useGetNewsSource(id)` query hook
  - [ ] `useCreateNewsSource()` mutation
  - [ ] `useUpdateNewsSource()` mutation
  - [ ] `useDeleteNewsSource()` mutation
  - [ ] `useTestSourceConnection()` mutation
  - [ ] `useToggleNewsSource()` mutation

#### Task #6: Update Navigation 🔴
**Priority**: MEDIUM - User discoverability  
**Estimated Effort**: 30 minutes

Add Feed Sources to Research navigation:

- [ ] **frontend/src/components/navigation/ResearchNav.tsx**:
  - [ ] Add "Feed Sources" nav item (icon: Rss or Plug)
  - [ ] Update routing in App.tsx
  - [ ] Reorder: Stream → Feed Sources → Articles

- [ ] **frontend/src/App.tsx**:
  - [ ] Add route for `/research/sources`
  - [ ] Import and render `FeedSourcesView`

---

### Phase 3: Frontend - Stream View

#### Task #7: Stream View - Article Feed 🔴
**Priority**: HIGH - Core reading experience  
**Estimated Effort**: 3-4 hours

Build real-time article stream:

- [ ] **frontend/src/views/StreamView.tsx**:
  - [ ] Infinite scroll feed of articles
  - [ ] Article cards with:
    - Title, description, source badge
    - Read/unread indicator
    - Star button
    - Dismiss button (archive)
    - "Open in Articles" link
  - [ ] Filters toolbar:
    - Source dropdown (show only from source X)
    - Date range picker
    - Starred only toggle
    - Unread only toggle
  - [ ] Sort dropdown: Latest, Oldest, Starred
  - [ ] Empty state: "No articles yet - configure sources"

- [ ] **frontend/src/components/research/StreamArticleCard.tsx**:
  - [ ] Compact card design for stream
  - [ ] Source badge with color/icon
  - [ ] Quick actions: star, dismiss, open
  - [ ] Published time (relative: "2h ago")
  - [ ] Read status visual indicator

- [ ] **Update frontend/src/hooks/queries.ts**:
  - [ ] Enhance `useNewsArticles()` with filters:
    - `source_id?: number`
    - `starred?: boolean`
    - `dismissed?: boolean`
    - `start_date?: string`
    - `end_date?: string`
    - `limit?: number` (pagination)
    - `offset?: number`
  - [ ] Update backend command to support filters

#### Task #8: Backend - Enhanced Article Filtering 🔴
**Priority**: HIGH - Support stream filters  
**Estimated Effort**: 1-2 hours

Enhance article queries:

- [ ] **backend/src/research/components/feed/articles.rs**:
  - [ ] Update `get_news_articles_handler` to support:
    - Filter by source_id
    - Filter by date range
    - Filter by starred status
    - Filter by dismissed status
    - Pagination (limit/offset)
    - Sorting (latest, oldest, starred)
  - [ ] Return total count for pagination

- [ ] **backend/src/research/commands.rs**:
  - [ ] Update `get_news_articles` command signature
  - [ ] Add validation for filter parameters

---

### Phase 4: Migration & Cleanup

#### Task #9: Move NewsData Toggle from Settings 🔴
**Priority**: MEDIUM - Better organization  
**Estimated Effort**: 1 hour

Clean up Settings page:

- [ ] **frontend/src/vicheduler for Per-Source Tasks 🔴
**Priority**: HIGH - Dynamic task execution  
**Estimated Effort**: 2 hours

Update scheduler to handle per-source sync tasks:

- [ ] **backend/src/system/components/scheduler/executor.rs**:
  - [ ] Add new task type handler: `feed_sync_{source_id}`
    - Parse source_id from task_type
    - Call sync_single_source(source_id)
    - Log results with source name
    - Update task run history
  - [ ] Update `TaskType` enum to support dynamic feed sync tasks
  - [ ] Remove old `news_sync` task type (replaced by per-source tasks)
  
- [ ] **backend/src/system/components/scheduler/init.rs**:
  - [ ] Remove hardcoded news_sync task seed
  - [ ] On app start, query all feed_sources
  - [ ] Ensure each enabled feed source has corresponding system_task
  - [ ] Create missing tasks if needed (repair function)reate NewsData source
  - [ ] Mark as enabled if news fetching was enabled

#### Task #10: Update Sync Task 🔴
**Priority**: HIGH - Use plugin system  
**Estimated Effort**: 1 hour

Update scheduler to use plugins:

- [ ] **backend/src/system/components/scheduler/executor.rs**:
  - [ ] Update `fetch_news` task execution
  - [ ] Query enabled sources from `news_sources`
  - [ ] Loop through sources and call plugin.fetch_articles()
  - [ ] Log per-source success/failure
  - [ ] Update task run history with source breakdown

---

### Phase 5: Testing & Polish

#### Task #11: Integration Testing 🔴
**Priority**: MEDIUM - Ensure reliability  
**Estimated Effort**: 2 hours

- [ ] Test source CRUD operations
- [ ] Test enable/disable source functionality
- [ ] Test connection validation (valid/invalid API keys)
- [ ] Test article fetching from multiple sources
- [ ] Test stream filters and sorting
- [ ] Test migration from old settings to new sources
- [ ] Test sync task with plugin system

#### Task #12: Documentation 🔴
**Priority**: LOW - User guidance  
**Estimated Effort**: 1 hour

- [ ] Update README.md with Feed Sources feature
- [ ] Create PLUGINS.md guide for adding new sources
- [ ] Document plugin trait implementation
- [ ] Add screenshots to docs

---

## 🔜 Future Enhancements (Post-Sprint)

### Additional Feed Plugins
- [ ] **Reddit Plugin** - Monitor subreddits, saved posts, mod queue
- [ ] **RSS Plugin** - Generic RSS/Atom feed parser
- [ ] **Twitter/X Plugin** - Timeline, lists, bookmarks
- [ ] **Hacker News Plugin** - Front page, user submissions
- [ ] **Dev.to Plugin** - Followed tags, bookmarks
- [ ] **Medium Plugin** - Reading list, publications
- [ ] **Custom Webhook Plugin** - Generic JSON webhook receiver

### Advanced Features
- [ ] **Source priorities** - Weight articles from certain sources
- [ ] **Duplicate detection** - Same article from multiple sources
- [ ] **Article tagging** - Auto-tag by source, category, keywords
- [ ] **Collections** - Group articles into custom collections
- [ ] **Export feeds** - Generate RSS feed from starred articles
- [ ] **Read later queue** - Separate view for bookmarked articles

---

## 🐛 Known Issues

### Task #13: Minor Error Handling Improvements (HIGH ⚠️)
**Priority**: HIGH - Prevent potential panics  
**Estimated Effort**: 1 hour  
**Status**: Not Started

- [ ] **Fix unwrap() in HTTP client cloning** (2 locations):
  - [ ] `research/components/feed/sync.rs` (Line 156)
    - Replace `client.try_clone().unwrap()` with proper error handling
    - Return AppError::Internal on clone failure
  - [ ] `research/components/feed/sources.rs` (Line 89)
    - Replace `client.try_clone().unwrap()` with proper error handling
    - Return AppError::Internal on clone failure

- [ ] **Improve error messages** (multiple locations):
  - [ ] Replace generic "Not found" errors with specific messages
  - [ ] Include entity ID/name in error messages
  - [ ] Add context to generic errors

- [ ] **Add transaction rollback logging**:
  - [ ] Add tracing::error! before rollback in all transactions
  - [ ] Include error context in rollback logs

### Task #14: System Mode - Integration Testing 🔴
- [ ] **Settings**: Test all setting updates persist correctly
- [ ] **Settings**: Test validation rules work (invalid intervals, limits)
- [ ] **Storage**: Test backup creates valid file, restore works
- [ ] **Storage**: Test export/import round-trip (no data loss)
- [ ] **Storage**: Test cleanup deletes correct files
- [ ] **Logs**: Test filtering returns correct results
- [ ] **Logs**: Test log export includes all data
- [ ] **Tasks**: Test manual task execution triggers correctly
- [ ] **Tasks**: Test enable/disable updates scheduler
- [ ] **Tasks**: Test task history shows accurate data
- [ ] **Error Handling**: Verify all error states display user-friendly messages
- [ ] **Performance**: Check all views load within 500ms

---

## 📋 Reference Documents

- **[DONE.md](./docs/DONE.md)** - Completed work archive (6 sprints completed!)
- **[ROADMAP.md](./docs/ROADMAP.md)** - Long-term planning
- **[BUILD_GUIDE.md](./docs/BUILD_GUIDE.md)** - Build instructions
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment
- **[scripts/README.md](./scripts/README.md)** - Build, install, and diagnostic scripts

---

**Last Updated**: December 15, 2025  
**Next Review**: After Phase 1 completion (Database schema verification)
