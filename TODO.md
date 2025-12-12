# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🎯 Current Sprint: Backend Modernization - MEDIUM Priority

**Status**: 15/17 complete (All CRITICAL + HIGH + 8 MEDIUM done ✅)  
**Focus**: Complete remaining MEDIUM priority optimizations  
**Target**: December 20, 2025

### Next Up

#### Task #8: Optimize Bulk Database Operations ✅
- [x] **File**: `backend/src/news.rs`
- [x] **Issue 8a**: Use `select_only().column(Id).into_tuple()` for ID-only query
- [x] **Issue 8b**: Added proper error logging for batch operations
- [x] **Issue 8c**: Replaced all `unwrap_or_default()` with proper error handling
- [x] **Result**: Better performance, all errors now logged

#### Task #9: Update to sea-orm 1.1 ActiveModel Patterns ✅
- [x] **Files**: ideas.rs, settings.rs, scheduler.rs, news.rs
- [x] Replaced all 11 instances of `.into()` with explicit `.into_active_model()`
- [x] Added `IntoActiveModel` trait import to all 4 files
- [x] **Result**: Clearer code following sea-orm 1.1 idioms

#### Task #10: Review tokio-cron-scheduler 0.15 API ✅
- [x] **File**: `backend/src/scheduler.rs`
- [x] Verified Job::new_async() API is correct for 0.15
- [x] Fixed silent error in job callback - now logs failures
- [x] **Result**: All scheduler errors properly logged

#### Task #11: Enhance Encryption Security ✅
- [x] **File**: `backend/src/crypto.rs`
- [x] Added zeroize = "1.7" dependency
- [x] Implemented key zeroization after use
- [x] Comprehensive security documentation added
- [x] Documented nonce uniqueness considerations
- [x] Added key rotation guidance in comments
- [x] **Result**: Keys properly cleaned from memory, well-documented security design

#### Task #12: Improve HTTP Client Patterns ✅
- [x] **Files**: `backend/src/main.rs`, `backend/src/news.rs`
- [x] Added shared HTTP client to AppState with connection pooling
- [x] Client configured with 30s timeout, 10s connect timeout
- [x] Pool settings: 5 max idle per host, 90s idle timeout
- [x] Implemented retry_request() with exponential backoff (3 retries)
- [x] Handles rate limiting (429) with Retry-After header support
- [x] Updated both news sync and sources sync to use shared client
- [x] **Result**: Efficient connection reuse, automatic retry on failures

#### Task #13: Review Tauri Command Handlers ✅
- [x] **File**: `backend/src/main.rs`
- [x] Audited all 20+ Tauri commands for consistency
- [x] All commands use consistent error handling: `Result<T, String>`
- [x] All commands use `.map_err(|e| e.to_string())` pattern
- [x] State access pattern consistent across all commands
- [x] Added comprehensive JSDoc-style documentation to key commands
- [x] Documented: get_system_user, log_frontend_error, list_news_articles, list_ideas, sync_news_now, get_app_settings
- [x] **Result**: Commands well-structured with proper async patterns and documentation

#### Task #14: Enhance Tracing Implementation ✅
- [x] **Files**: `backend/src/logging.rs`, `backend/src/news.rs`, `backend/src/ideas.rs`
- [x] Enhanced logging.rs module documentation with span usage examples
- [x] Added `#[instrument]` spans to key handlers in news.rs:
  - `get_news_settings_handler`, `list_news_articles_handler`, `run_news_sync_task`
- [x] Added `#[instrument]` spans to key handlers in ideas.rs:
  - `list_ideas_handler`, `create_idea_handler`, `create_idea_for_article_handler`
- [x] Structured fields for pagination (limit, offset) and identifiers (article_id, title)
- [x] **Result**: Request tracing enabled, spans show operation flow with context

#### Task #15: Review thiserror 2.0 Error Patterns ✅
- [x] **File**: `backend/src/errors.rs`
- [x] Added `ErrorCode` enum with categorized error codes (1xxx-9xxx ranges)
- [x] Error code methods: `code()`, `code_string()` (e.g., "E2001")
- [x] Error classification methods:
  - `is_retryable()` - Check if error can be retried
  - `requires_user_action()` - Check if user intervention needed
  - `suggestion()` - Get user-friendly suggestion
- [x] Context methods:
  - `with_context()` - Add context message to any error
  - `with_suggestion()` - Add actionable suggestion
- [x] Enhanced module documentation with usage examples
- [x] **Result**: Errors ready for frontend display with codes and actionable messages

#### Task #16: Optimize List Query Column Selection
- [ ] **File**: `backend/src/ideas.rs`
- [ ] Use `select_only()` to exclude heavy markdown fields

#### Task #17: Test Database Index Performance
- [ ] Run app and measure query performance improvements

---

## 🔜 Next Sprint: Phase 12 - System Mode Backend Integration

### Settings View
- [ ] Create `get_app_settings` command
- [ ] Create `update_app_settings` command
- [ ] Wire up frontend SettingsView
- [ ] Test settings persistence

### Storage View
- [ ] Create `get_storage_stats` command
- [ ] Create backup/restore commands
- [ ] Create export/import commands
- [ ] Create cleanup command
- [ ] Wire up frontend StorageView

### Logs View
- [ ] Create `get_logs` command with filters
- [ ] Create `export_logs` command
- [ ] Create `truncate_logs` command
- [ ] Optional: Real-time log streaming
- [ ] Wire up frontend LogsView

### Tasks View
- [ ] Create `get_scheduled_tasks` command
- [ ] Create `get_task_history` command
- [ ] Create `run_task_now` command
- [ ] Create `toggle_task` command
- [ ] Wire up frontend TasksView

---

## 🚨 Frontend Security: Vite 7 Upgrade (HIGH PRIORITY)

**Issue**: 2 moderate vulnerabilities in esbuild (via Vite <6.1.6)

### Phase 2: Vite Upgrade
- [ ] Review Vite 6.0 and 7.0 changelogs
- [ ] Update vite.config.ts for new API
- [ ] Update @vitejs/plugin-react to v5
- [ ] Test: Dev server, HMR, build, Tauri integration

### Phase 3: Package Updates
- [ ] Update tailwind-merge: 2.6.0 → 3.4.0
- [ ] Update sonner: 1.7.4 → 2.0.7

### Phase 4: Code Modularization
- [ ] Restructure component directories
- [ ] Extract shared utilities
- [ ] Bundle optimization (target: <300KB gzipped)

---

## 🐛 Known Issues

- [ ] Number input validation improvements
- [ ] Mobile drawer scroll prevention
- [ ] Theme switch animation smoothness
- [ ] Select dropdowns min-width

---

**Last Updated**: December 12, 2025  
**Next Review**: December 15, 2025
