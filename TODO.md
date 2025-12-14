# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🎯 Current Sprint: Modular Refactoring

**Goal**: Split large monolithic files into focused, single-responsibility modules
**Timeline**: December 12-15, 2025  
**Status**: In progress
**Pattern**: Split by feature/responsibility

### Why Refactor?
Large files (1000+ lines) become difficult to navigate and maintain. Splitting into focused modules improves:
- ✅ **Readability**: Each file has single responsibility
- ✅ **Maintainability**: Easier to locate and update functionality
- ✅ **Testing**: Smaller, focused units are easier to test
- ✅ **Parallel Development**: Multiple developers can work without conflicts
- ✅ **Future**: Foundation for plugin system architecture

### Phase 1a: Research Domain - Feed Module ✅
**Status**: Complete! Entity models organized into submodules.
- [x] Created `research/components/feed/entities/` directory
- [x] Moved entity models: articles.rs, settings.rs, sources.rs
- [x] Created `entities/mod.rs` with re-exports
- [x] Updated all imports in feed handlers (articles, settings, sources, sync)
- [x] Updated writing domain imports (ideas module)
- [x] Cleaned up `research/components/mod.rs`

**New Structure**:
```
research/components/feed/
├── entities/          # Database entity models
│   ├── articles.rs   # NewsArticles entity
│   ├── settings.rs   # NewsSettings entity  
│   ├── sources.rs    # NewsSources entity
│   └── mod.rs        # Re-exports
├── articles.rs       # Article CRUD handlers
├── settings.rs       # Settings management
├── sources.rs        # Source management
├── sync.rs           # News sync logic
├── types.rs          # DTOs and API types
└── mod.rs            # Module exports

system/components/scheduler/
├── entities.rs       # SystemTask entity model
├── task_runs.rs      # SystemTaskRuns entity model
├── types.rs          # DTOs (SystemTaskDto, TaskRunDto, etc.)
├── executor.rs       # Task execution logic with run history
├── init.rs           # Scheduler initialization
├── handlers.rs       # Command handlers (list, history, run, update)
└── mod.rs            # Module exports
```

**Completed**: December 13, 2025

**Design Principles**:
- Single responsibility per module
- Explicit dependencies (no global state)
- Pure functions where possible
- Clear public API in mod.rs
- Consistent naming patterns

---

## ✅ Sprint Complete: System Mode - Tasks View

**Goal**: Complete the final System Mode view for task management  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

### Task #8: Tasks View - Backend Commands ✅
- [x] Created `list_system_tasks` command
  - Queries system_tasks table with full task metadata
  - Returns task list with schedule, enabled status, last run time
  - Includes error count and last run status
- [x] Created `get_task_history` command
  - Queries system_task_runs table with pagination (limit/offset)
  - Filters by task_id (optional - shows all if omitted)
  - Returns runs with duration, status, error messages, timestamps
- [x] Created `run_system_task_now` command
  - Accepts task_type, validates task exists
  - Triggers immediate execution via executor
  - Returns RunTaskNowResult with status and error details
- [x] Created `update_system_task` command
  - Updates task enabled status and other properties
  - Supports enabling/disabling scheduled tasks
  - Validates task exists before update
- [x] Added missing `QuerySelect` import for pagination
- [x] All commands registered in main.rs

### Task #9: Tasks View - Frontend Integration ✅
- [x] Completely rewrote `TasksView.tsx` with real backend integration
- [x] Replaced all mock data with TanStack Query hooks
  - `useListSystemTasks` for task list
  - `useGetTaskHistory` for execution history with filtering
  - `useRunTaskNow` mutation for manual execution
  - `useUpdateSystemTask` mutation for enable/disable
- [x] Added loading states with Loader2 spinners
- [x] Added error handling with toast notifications
- [x] Added confirmation dialogs for run/toggle actions
- [x] Task status indicators (success/error/running badges)
- [x] Stats cards (total, enabled, errors, recent runs)
- [x] Task history filtering by task ID
- [x] Duration formatting (ms/s/m format)
- [x] Human-readable cron schedule parsing
- [x] Error display for failed tasks
- [x] Responsive layout with proper spacing

### Task #10: Execution History Tracking ✅
- [x] Fixed task run history recording
  - Task runs now properly saved to `system_task_runs` table
  - Records start time, end time, status, result JSON, error messages
- [x] Added comprehensive scheduler logging
  - INFO logs when scheduler triggers tasks
  - INFO logs for successful completion with results
  - ERROR logs for failures with error details
  - WARN logs for skipped tasks (already running, unknown type)
- [x] Frontend console logging for debugging
  - Logs when "Run Now" button is clicked
  - Logs task execution results
  - Logs query invalidation after execution
- [x] History section now populates with real execution data
  - Shows manual runs (Run Now button)
  - Shows scheduled runs (cron triggers)
  - Displays duration, status, timestamps, errors

### Build & Configuration ✅
- [x] Fixed tauri.conf.json build commands
  - Changed from `--prefix` to `cd` with `bash -c`
  - Works correctly from backend directory
- [x] Frontend builds successfully (8.74 kB gzipped)
- [x] Backend compiles with zero warnings (cleaned unused imports)
- [x] Production build verified

**System Mode is now 100% complete!** All four views are fully functional:
- ✅ Settings View
- ✅ Storage View  
- ✅ Logs View
- ✅ Tasks View

---

## 🔜 Next Sprint: Integration Testing

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

**Last Updated**: December 14, 2025  
**Next Review**: December 16, 2025
