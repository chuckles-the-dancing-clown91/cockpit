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

#### Task #1: Feed Sources Table & Migration ✅
**Priority**: HIGH - New table for feed plugins  
**Estimated Effort**: 1 hour  
**Status**: COMPLETE

**Action**: Create new `feed_sources` table (distinct from existing `news_sources`)

- [x] **Create migration 004_feed_sources_up.sql**:
  - [x] Create `feed_sources` table with all fields
  - [x] Create indexes on source_type, enabled, task_id
  - [x] Add `feed_source_id` column to `news_articles`
  - [x] Create 004_feed_sources_down.sql rollback migration
  - [x] Register migration in migrations.rs
  - [x] Create FeedSource entity model
  - [x] Create SourceType, SourceConfig types
  - [x] Create FeedSourceDto and input types
  - [x] Backend compiles successfully

#### Task #2: Source Types & Plugin Trait ✅
**Priority**: HIGH - Foundation for plugin system  
**Estimated Effort**: 2-3 hours  
**Status**: COMPLETE

Create the plugin architecture:

- [x] **backend/src/research/components/feed/plugin.rs**:
  - [x] Define `FeedSource` trait with async methods:
    - `fetch_articles()` - Fetch articles with config & last_sync_at
    - `test_connection()` - Verify API key and return quota info
    - `get_metadata()` - Return source metadata for UI
    - `parse_config()` - Validate/normalize configuration
    - `default_config()` - Provide default config
    - `estimate_api_calls()` - For rate limit checking
  - [x] Define `FeedArticle` struct (common article format)
  - [x] Define `FetchResult` (articles + api_calls_used + warnings)
  - [x] Define `SourceMetadata` (for UI display)
  - [x] Define `ConnectionTestResult` (connection status)
  - [x] Create `PluginRegistry` for managing plugins
  - [x] Add async-trait dependency
  - [x] Backend compiles successfully

- [ ] **backend/src/research/components/feed/sources/mod.rs**:
  - [ ] Create sources directory for plugin implementations
  - [ ] Implement NewsData plugin next

#### Task #3: NewsData.io Plugin Implementation ✅
**Priority**: HIGH - Migrate existing integration  
**Estimated Effort**: 2 hours  
**Status**: COMPLETE

Extract NewsData.io to plugin:

- [x] **backend/src/research/components/feed/plugins/newsdata.rs**:
  - [x] Implement `FeedSource` trait for NewsDataPlugin
  - [x] Migrate existing NewsData API logic from sync.rs
  - [x] Implement all trait methods (fetch_articles, test_connection, etc.)
  - [x] Support all NewsData features (latest + archive endpoints)
  - [x] Implement pagination with max_pages control
  - [x] Add retry logic with exponential backoff
  - [x] Handle rate limiting (429 status code)
  - [x] Validate config (max_pages 1-10, date format)
  - [x] Convert NewsData response to FeedArticle format
  - [x] Return warnings when pagination limit reached
  - [x] Backend compiles successfully

#### Task #4: Source Management Commands ✅
**Priority**: HIGH - CRUD for feed sources  
**Estimated Effort**: 2 hours  
**Status**: COMPLETE

Backend commands for source management:

- [x] **backend/src/research/components/feed/feed_sources.rs**:
  - [x] `list_feed_sources_handler` - Get all sources with metadata
  - [x] `get_feed_source_handler` - Get single source by ID
  - [x] `create_feed_source_handler` - Create source + system_task atomically
  - [x] `update_feed_source_handler` - Update source + task
  - [x] `delete_feed_source_handler` - Delete source + cleanup task
  - [x] `toggle_feed_source_handler` - Enable/disable source + task
  - [x] `test_feed_source_connection_handler` - Validate API key
  - [x] `sync_feed_source_now_handler` - Manual trigger for single source
  - [x] `sync_all_feed_sources_handler` - "Boom magic" sync all button

- [x] **backend/src/research/commands.rs**:
  - [x] Create Tauri command wrappers for all 9 handlers
  - [x] Add proper error handling (map to String)
  - [x] Export from research module

- [x] **backend/src/main.rs**:
  - [x] Import all 9 feed source commands
  - [x] Register all commands in invoke_handler
  - [x] Backend compiles successfully

---

### Phase 2: Frontend - Feed Sources View

#### Task #5: Feed Sources Management Page ✅
**Priority**: HIGH - Primary configuration interface  
**Estimated Effort**: 3-4 hours  
**Status**: COMPLETE

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

#### Task #6: Update Navigation ✅
**Priority**: MEDIUM - User discoverability  
**Estimated Effort**: 30 minutes  
**Status**: COMPLETE

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
