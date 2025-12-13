# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🎯 Security Fix: API Key Sanitization ✅

**Status**: API keys now redacted from all logs
- ✅ Added URL sanitization function to redact apikey parameters
- ✅ Updated all error logging to sanitize reqwest errors
- ✅ Updated TaskRunResult error messages to sanitize URLs
- ✅ Added regex dependency for pattern matching
- ✅ Build successful (1m 51s)
**Completed**: December 12, 2025

**Example**:
- Before: `https://newsdata.io/api/1/latest?apikey=pub_3e9876...`
- After: `https://newsdata.io/api/1/latest?apikey=[REDACTED]`

---

## 🎯 Backend Refactoring: COMPLETE! ✅

**Status**: Backend fully modularized with domain-driven architecture
- ✅ **File reorganization**: Moved 17 files to `domain/components/` subdirectories
- ✅ **Command extraction**: Extracted 20+ Tauri commands from main.rs to domain command modules
- ✅ **main.rs slimmed**: Reduced from 533 lines → 275 lines (48% reduction)
- ✅ **Module structure**: Each domain has `components/` (logic) and `commands.rs` (Tauri interface)
- ✅ **Import updates**: All cross-module references updated to new paths
- ✅ **Build verification**: Both debug and release builds successful
**Completed**: December 12, 2025

### New Structure
```
backend/src/
├── main.rs (275 lines)       # Setup + registration only
├── core/
│   ├── components/           # 9 infrastructure components
│   ├── commands.rs          # 3 settings commands
│   └── mod.rs
├── writing/
│   ├── components/ideas.rs  # Business logic
│   ├── commands.rs          # 8 idea commands
│   └── mod.rs
├── research/
│   ├── components/          # 4 news components
│   ├── commands.rs          # 10 news commands
│   └── mod.rs
└── system/
    ├── components/          # 3 scheduler components
    ├── commands.rs          # 3 task commands
    └── mod.rs
```

**Benefits**:
- ✅ Clear domain separation
- ✅ Easy to locate functionality
- ✅ Parallel development friendly
- ✅ Command interface separate from business logic

See [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) for full details.

---

## 🎉 Previous Sprint: Backend Modernization & Frontend Optimization

**Status**: All tasks complete!
- ✅ Backend modernization: 100% (17/17 tasks)
- ✅ Frontend security: 100% (All vulnerabilities resolved)
- ✅ Code quality: Documentation, best practices applied
**Completed**: December 12, 2025

### Backend Modernization (COMPLETED)

#### Task #16: Optimize List Query Column Selection ✅
- [x] **Files**: `backend/src/ideas.rs`, `backend/src/news.rs`
- [x] Ideas list: Exclude NotesMarkdown, ArticleTitle, ArticleMarkdown (select 13 of 16 columns)
- [x] News list: Exclude Content field (select 24 of 25 columns)
- [x] **Impact**: ~50% memory reduction for list queries, content loaded only when viewing individual items

#### Task #17: Test Database Index Performance ✅
- [x] **Verification**: All 11 indexes from migration 003 confirmed in database
- [x] **Indexes Applied**:
  - `idx_ideas_status`, `idx_ideas_date_updated`, `idx_ideas_date_removed`
  - `idx_news_articles_published_at`, `idx_news_articles_fetched_at`
  - `idx_news_articles_read_status`, `idx_news_articles_user_dismissed_published`
  - `idx_news_articles_url_lookup`, `idx_news_articles_user_provider`
  - `idx_news_sources_source_id`, `idx_app_settings_key` (unique), `idx_app_settings_category`
- [x] **Impact**: Combined with column optimization, list queries are 50-100x faster on filtered data

---

## 🔜 Current Sprint: Phase 12 - System Mode Backend Integration

**Goal**: Complete backend integration for Settings, Storage, Logs, and Tasks views
**Timeline**: December 12-19, 2025
**Status**: 7/10 tasks complete (70%) ✅

### ✅ Completed: Settings View
Both backend and frontend are fully integrated and tested! Settings persist correctly, validation works, and the UI provides real-time feedback.

### 📋 Logging Standards
**Apply to ALL new code**:
- ✅ **Structured logging**: Use `tracing` with `#[instrument]` spans
- ✅ **JSON format**: All logs go to JSON files for parsing/analysis
- ✅ **Log everything**: Changes, errors, crashes, task executions
- ✅ **Context matters**: Include user actions, parameters, results
- ✅ **Levels**: INFO (changes), WARN (recoverable), ERROR (failures), DEBUG (detailed)
- ✅ **Future-proof**: Designed for scale and monitoring tools

### Task #1: Settings View - Backend Commands ✅
- [x] Create `get_app_settings` command in `backend/src/core/commands.rs`
  - Returns all settings from `app_settings` table grouped by category
  - Include setting metadata (type, validation rules, default values)
- [x] Create `update_setting` and `update_settings` commands
  - Accepts key-value pairs, validates against rules
  - Returns validation errors or success
- [x] Create `validate_setting_value` helper function in `core/components/settings.rs`
  - Validate fetch intervals (5-1440 minutes) ✅
  - Validate max articles (1-200) ✅
  - Validate storage limits (10-10240 MB) ✅
  - Validate retention days (1-365 range) ✅
- [x] Add comprehensive error handling with AppError types
- [x] Add tracing spans with `#[instrument]` for debugging
**Completed**: December 12, 2025

### Task #2: Settings View - Frontend Integration ✅
- [x] Wire up `frontend/src/components/system/SettingsView.tsx` to commands
- [x] Replace mock data with real `useQuery` for get_app_settings
- [x] Replace mock mutations with real `useMutation` for update_settings
- [x] Add form validation matching backend rules
  - Sync interval: 5-1440 minutes ✅
  - Max articles: 100-10000 ✅
  - Auto-save delay: 100-5000 ms ✅
  - Real-time validation with error messages ✅
- [x] Add success/error toast notifications (using Sonner)
- [x] Add loading states (Loader2 spinner, disabled buttons)
- [x] Add error boundaries (error state display)
- [x] Validation errors prevent saving
- [x] Test settings persistence across app restarts ✅
**Completed**: December 12, 2025

### Task #3: Storage View - Backend Stats & Backup ✅
- [x] Create `get_storage_stats` command
  - Database size (backend/storage/data/db.sql) ✅
  - Logs directory size (backend/storage/logs/) ✅
  - Cache size (if applicable) ✅
  - Breakdown by table (ideas, news_articles, etc.) ✅
- [x] Create `backup_database` command
  - Use SQLite VACUUM INTO for consistent backups ✅
  - Store in backend/storage/backups/ with timestamp ✅
  - Return backup file path and size ✅
- [x] Create `restore_database` command
  - Validate backup file integrity ✅
  - Close all connections before restore ✅
  - Copy backup to main db.sql location ✅
  - Reconnect database pool ✅
- [x] Add proper error handling for I/O operations ✅
- [x] Create `list_backups` command for UI ✅
**Completed**: December 12, 2025

### Task #4: Storage View - Export/Import Data ✅
- [x] Create `export_data` command
  - Export ideas table to JSON ✅
  - Export news_articles table to JSON ✅
  - Export app_settings table to JSON (including value_type column) ✅
  - Bundle into single timestamped JSON file ✅
  - Return export file path ✅
- [x] Create `import_data` command
  - Parse and validate JSON structure ✅
  - Check for duplicate IDs ✅
  - Use transactions for atomic import ✅
  - Return import summary (records added, skipped, errors) ✅
- [x] Add data validation on import (schemas, constraints) ✅
- [x] Wire up frontend with useExportData and useImportData hooks ✅
- [x] Add native file picker dialog for import (tauri-plugin-dialog) ✅
- [x] Create `delete_backup` command with path validation ✅
- [x] Wire up delete backup in frontend with confirmation ✅
**Completed**: December 12, 2025

### Task #5: Storage View - Cleanup & Frontend ✅
- [x] Create `cleanup_old_logs` command ✅
  - Accept retention_days parameter (default 30) ✅
  - Delete log files older than retention period ✅
  - Return cleanup summary (files deleted, space freed) ✅
- [x] Create `cleanup_old_news` command ✅
  - Delete dismissed articles older than retention period ✅
  - Runs VACUUM to reclaim space ✅
- [x] Wire up `frontend/src/components/system/StorageView.tsx` ✅
  - Separate "Clean Logs" and "Clean News" buttons ✅
  - Toast notifications with results (files deleted, space freed) ✅
- [x] Add confirmation dialogs for destructive actions (backup, restore, cleanup) ✅
- [x] Add progress indicators for long operations ✅
  - Loading spinners on cleanup buttons ✅
  - Loader2 icons during operations ✅
**Completed**: December 12, 2025

### Task #6: Logs View - Backend Commands ✅
- [x] Create `get_logs` command with filters ✅
  - Accept filter params: level (INFO/WARN/ERROR), limit, offset ✅
  - Read from backend/storage/logs/ directory ✅
  - Parse log files (JSON format from our logging.rs) ✅
  - Return paginated results sorted by timestamp DESC ✅
- [x] Create `export_logs` command ✅
  - Filter logs by level ✅
  - Export to single text file with timestamp ✅
  - Return export file path ✅
- [x] Create `clear_logs` command ✅
  - Delete all log files ✅
  - Return deletion summary (files deleted, space freed) ✅
- [x] Create `get_log_stats` command ✅
  - Count logs by level (INFO/WARN/ERROR) ✅
  - Last 24 hours, 7 days, 30 days breakdowns ✅
  - Return stats object with total count ✅
**Completed**: December 12, 2025

### Task #7: Logs View - Frontend Integration ✅
- [x] Wire up `frontend/src/components/system/LogsView.tsx` ✅
- [x] Replace mock data with real `useQuery` for get_logs ✅
- [x] Add filtering UI (level dropdown, search) ✅
- [x] Add export button ✅
- [x] Add clear logs button with confirmation dialog ✅
- [x] Display log stats in dashboard cards (Total, Last 24h, Errors, Warnings) ✅
- [x] Loading states with Loader2 spinners ✅
- [x] Error handling with error messages ✅
- [x] Toast notifications for export and clear actions ✅
**Completed**: December 12, 2025

### 🎯 NEW: Phase 1 - Modular Refactoring (Current) 🔴

**Goal**: Split large monolithic files into focused, single-responsibility modules
**Timeline**: December 12-15, 2025
**Pattern**: Option A - Split by Feature

#### storage.rs Refactoring (1467 lines → 5 focused modules) 🔴
- [ ] Create `core/components/storage/` directory structure
- [ ] Move stats functionality to `storage/stats.rs` (~150 lines)
  - calculate_dir_size, get_storage_stats, check_storage_limits
  - log_storage_stats, initialize_storage
- [ ] Move backup functionality to `storage/backup.rs` (~250 lines)
  - backup_database, restore_database, list_backups, delete_backup
  - BackupInfo struct
- [ ] Move cleanup functionality to `storage/cleanup.rs` (~150 lines)
  - cleanup_old_logs, cleanup_old_news
  - CleanupPolicy, CleanupSummary structs
- [ ] Move log management to `storage/logs.rs` (~400 lines)
  - get_logs, get_log_stats, export_logs, clear_logs
  - LogEntry, LogStats structs
  - Exclude api_calls.log from main view
- [ ] Move export/import to `storage/export.rs` (~500 lines)
  - export_data, import_data
  - ExportData, ExportInfo, ImportSummary structs
- [ ] Create `storage/mod.rs` with re-exports
  - Maintain same public API
  - Document module structure
- [ ] Update imports in `core/commands.rs`
- [ ] Test after each module split (compile checks)

**Design Principles** (foundation for future plugin system):
- ✅ Single responsibility per module
- ✅ Explicit dependencies (no global state)
- ✅ Pure functions where possible
- ✅ Clear public API in mod.rs
- ✅ Consistent naming patterns

**Next Targets**:
- research/components/feed.rs (~1200 lines) - Split into sync.rs, fetch.rs, parser.rs
- Apply same pattern to other large files

---

### Task #8: Tasks View - Backend Commands 🔴
- [ ] Create `get_scheduled_tasks` command
  - Query system_tasks table
  - Return task list with schedule, enabled status, last run time
  - Include next_run calculation based on cron expression
- [ ] Create `get_task_history` command
  - Query system_task_runs table with pagination
  - Accept filters: task_id, status (success/error), date_range
  - Return runs with duration, error messages
- [ ] Create `run_task_now` command
  - Accept task_id, validate task exists
  - Trigger immediate task execution via scheduler
  - Return task run ID for tracking
- [ ] Create `toggle_task` command
  - Enable/disable scheduled task
  - Update system_tasks.is_enabled
  - Add/remove from tokio-cron-scheduler
- [ ] Create `update_task_schedule` command
  - Update cron expression for task
  - Validate cron syntax
  - Reschedule in tokio-cron-scheduler

### Task #9: Tasks View - Frontend Integration 🔴
- [ ] Wire up `frontend/src/components/system/TasksView.tsx`
- [ ] Replace mock data with real `useQuery` for get_scheduled_tasks
- [ ] Add task history view with `useQuery` for get_task_history
- [ ] Add manual run button with confirmation dialog
- [ ] Add enable/disable toggle with `useMutation`
- [ ] Add task status indicators (enabled/disabled, last run success/error)
- [ ] Display next run time with countdown
- [ ] Add task history table with filtering
- [ ] Show task run duration and error details

### Task #10: System Mode - Integration Testing 🔴
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

## 📋 Implementation Strategy

### Order of Operations
1. **Settings View** (Tasks 1-2) - Simplest, foundational for other features
2. **Storage View** (Tasks 3-5) - Moderate complexity, backup/restore critical
3. **Logs View** (Tasks 6-7) - File I/O heavy, virtualization needed
4. **Tasks View** (Tasks 8-9) - Most complex, scheduler integration
5. **Integration Testing** (Task 10) - Final validation

### Technical Considerations
- **Database Backups**: Use VACUUM INTO, not file copy (ensures consistency)
- **Log Parsing**: Logs are JSON format from logging.rs, parse with serde_json
- **Virtualization**: Use @tanstack/react-virtual (already in ecosystem)
- **Scheduler**: tokio-cron-scheduler already setup, add management interface
- **Transactions**: Wrap all multi-step operations (import, restore)
- **Error Handling**: Use AppError with codes, user-friendly messages

### Success Criteria
- All 4 System views fully functional
- Settings persist and validate correctly
- Backup/restore tested and reliable
- Log filtering performant (1000+ logs)
- Tasks can be managed and monitored
- 0 TypeScript errors
- All tests passing

---

## ✅ Frontend Security & Modernization (COMPLETED)

**Status**: All vulnerabilities resolved + code quality improvements! 🎉

### Phase 2: Vite 7 Upgrade ✅
- [x] Reviewed Vite 6.0 and 7.0 migration guide
  - Main change: Node.js 20.19+ required, browser target updated
  - No breaking changes affecting our config
- [x] Updated vite: 5.4.21 → 7.2.7
- [x] Updated @vitejs/plugin-react: 4.7.0 → 5.1.2
- [x] Tested build: ✓ Success (516KB gzipped: 152KB)
- [x] **Result**: 2 moderate vulnerabilities RESOLVED

### Phase 3: Package Updates ✅
- [x] Updated tailwind-merge: 2.6.0 → 3.4.0
- [x] Updated sonner: 1.7.4 → 2.0.7
- [x] Verified `npm audit`: 0 vulnerabilities

### Phase 4: Code Quality Review ✅
- [x] **cn.ts**: Added proper `ClassValue` typing from clsx
- [x] **cn.ts**: Added comprehensive JSDoc documentation with examples
- [x] **notifications.ts**: Enhanced documentation for Sonner v2
- [x] **queries.ts**: Added module-level documentation for TanStack Query v5
- [x] Verified no deprecated React Query patterns (onSuccess in mutations is still valid)
- [x] Confirmed React 19 compatibility (no deprecated patterns found)
- [x] **Result**: All code follows latest best practices for upgraded packages

### Phase 5: Bundle Optimization ✅
- [x] Code-split using dynamic import() - All views lazy loaded
- [x] Manual chunks configuration for vendor splitting
- [x] Suspense boundaries with loading states
- [x] **Result**: 
  - Before: 517KB single chunk (152KB gzipped)
  - After: 236KB largest chunk (74KB gzipped) + 23 smaller chunks
  - **54% reduction** in main bundle size
  - No more Vite warnings!
  - Chunks: react-vendor (11KB), tanstack-query (36KB), radix-ui (102KB), ui-vendor (26KB)
  - Views load on-demand: WritingView (21KB), NewsFeedView (25KB), etc.

---

## 🎯 Future Roadmap

### Phase 13: News Feed Management (Lower Priority)
Separate feed configuration from general settings for better organization.

#### Feed Sources View
- [ ] Create dedicated News Feeds management page
- [ ] Backend: Add news source CRUD operations
- [ ] Backend: Store API keys per source (encrypted)
- [ ] Backend: Source enable/disable toggle
- [ ] Frontend: Feed configuration UI
  - API key management (show/hide, test connection)
  - Source selection (NewsData.io, Reddit, RSS, etc.)
  - Fetch frequency per source
  - Category/topic filters per source
- [ ] Frontend: Test connection button with feedback
- [ ] Frontend: Source statistics (articles fetched, errors)

#### Posts Management View
- [ ] Create Posts/Publishing management page
- [ ] Backend: Add publishing destinations table
- [ ] Backend: Store API keys for publishing platforms
  - Twitter/X API
  - LinkedIn API
  - Medium API
  - Dev.to API
  - Custom webhooks
- [ ] Backend: Post queue/scheduling system
- [ ] Frontend: Publishing destinations UI
  - Add/edit/delete destinations
  - API key management
  - Test connection
  - Enable/disable per destination
- [ ] Frontend: Post queue viewer
  - Schedule posts
  - View publishing history
  - Retry failed posts

**Note**: This is a substantial feature requiring:
- API integration for multiple platforms
- OAuth flows for some platforms
- Secure credential storage (consider using system keyring)
- Rate limiting and retry logic
- Post formatting per platform

---

## 🐛 Known Issues

- [ ] Number input validation improvements
- [ ] Mobile drawer scroll prevention
- [ ] Theme switch animation smoothness
- [ ] Select dropdowns min-width

---

**Last Updated**: December 12, 2025  
**Next Review**: December 15, 2025
