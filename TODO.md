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

## 🔜 Next Sprint: Production Readiness (Backend Audit Fixes)

### Task #11: Add Missing Logging (CRITICAL 🔥) ✅
**Priority**: CRITICAL - No audit trail for critical operations  
**Estimated Effort**: 2-3 hours  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

- [x] **research/components/feed/articles.rs** - Added logging to 3 functions:
  - [x] `dismiss_news_article_handler` - #[instrument] with article_id, INFO logs at start/completion, ERROR on not found
  - [x] `toggle_star_news_article_handler` - #[instrument] with article_id & starred, logs star status change
  - [x] `mark_news_article_read_handler` - #[instrument] with article_id, logs read_at timestamp, skips if already read

- [x] **writing/components/ideas/handlers.rs** - Added logging to 5 functions:
  - [x] `update_idea_metadata_handler` - #[instrument] with field flags, logs title/status/tags/priority changes
  - [x] `update_idea_notes_handler` - #[instrument] with notes_size, logs content size tracking
  - [x] `update_idea_article_handler` - #[instrument] with content sizes, logs updated_at timestamp
  - [x] `archive_idea_handler` - #[instrument] with idea_id, logs archived_at with is_archived=true

- [x] Added #[tracing::instrument] spans with proper field annotations to all 8 functions
- [x] All functions log at INFO level for successful operations
- [x] All functions log at ERROR level when entity not found
- [x] Backend compiles cleanly with zero warnings
- [x] Logs will appear in `storage/logs/app.log` with JSON format

**Implementation Details**:
- All functions use `#[tracing::instrument(skip(state/db, input), fields(...))]`
- Field tracking includes IDs, sizes, boolean flags for audit trail
- Error paths log before returning error (e.g., "Article not found for dismissal")
- Success paths include relevant data (timestamps, status changes, sizes)
- Skipped operations logged (e.g., "Article already marked as read")

**Next Step**: Test logging output by running app and performing these operations, then check `storage/logs/app.log`

### Task #12: Fix Tauri Security Configuration (CRITICAL 🔥) ✅
**Priority**: CRITICAL - No Content Security Policy configured  
**Estimated Effort**: 1-2 hours  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

- [x] **backend/tauri.conf.json** - Added Content Security Policy:
  - [x] Added CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://newsdata.io`
  - [x] Restricts scripts to app origin + WASM (required for Rust)
  - [x] Allows inline styles (required for Tailwind CSS)
  - [x] Restricts network access to NewsData API only
  - [x] Prevents XSS attacks via strict CSP

- [x] **backend/tauri.conf.json** - Fixed absolute paths to relative:
  - [x] Changed `beforeDevCommand` from absolute path to `../frontend`
  - [x] Changed `beforeBuildCommand` from absolute path to `../frontend`
  - [x] Changed `frontendDist` from absolute path to `../frontend/dist`
  - [x] Build now works from any directory (portable across environments)
  - [x] Tested: `cargo build --release` completes successfully

- [x] **backend/tauri.conf.json** - Added comprehensive bundle metadata:
  - [x] Updated `identifier` to `com.cockpit.app` (from com.architect.cockpit)
  - [x] Updated `productName` to `Cockpit` (simplified)
  - [x] Added `publisher: "Cockpit Project"`
  - [x] Added `copyright: "Copyright © 2025 Cockpit Project"`
  - [x] Added `category: "Productivity"`
  - [x] Added `shortDescription` for app stores
  - [x] Added detailed `longDescription` explaining features
  - [x] Fixed icon paths to use existing icons (frac-32x32.png, frac-128x128.png)
  - [x] Enabled bundle with `active: true`, `targets: "all"`

- [x] **backend/capabilities/default.json** - Reviewed and documented ACL permissions:
  - [x] Verified all 7 permissions follow principle of least privilege
  - [x] Added platform support: Linux, macOS, Windows
  - [x] Permissions granted (all justified):
    - `core:default` - Basic Tauri runtime
    - `core:window:default` - Window management
    - `core:window:allow-set-title` - Dynamic title updates
    - `core:window:allow-close` - Exit functionality
    - `core:event:default` - Frontend-backend events
    - `dialog:default` - File dialogs baseline
    - `dialog:allow-open` - Import operations
    - `dialog:allow-save` - Export operations
  - [x] Permissions NOT granted (security by design):
    - ❌ File system access (backend handles all I/O)
    - ❌ HTTP access (backend uses reqwest)
    - ❌ Shell access (no command execution)
    - ❌ System tray, clipboard, notifications

- [x] **backend/PERMISSIONS.md** - Created comprehensive documentation:
  - [x] Documented justification for each permission
  - [x] Explained what permissions are NOT granted and why
  - [x] Documented platform-specific considerations
  - [x] Defined security boundaries (frontend vs backend)
  - [x] Established review schedule for permission changes
  - [x] Added audit trail and references

**Security Improvements Achieved**:
- ✅ XSS protection via CSP
- ✅ Network access restricted to NewsData API
- ✅ No arbitrary file system access from frontend
- ✅ No shell command execution
- ✅ Minimal attack surface (7 permissions vs potential 50+)
- ✅ Fully documented and auditable permissions
- ✅ Portable configuration (works on any machine)

**Next Step**: Test CSP doesn't break frontend functionality, verify dialogs work

**Build Fix Applied**: Created portable build scripts (`build-frontend.sh`, `dev-frontend.sh`) that:
- Use `$PWD/backend/script.sh` to locate scripts reliably
- Auto-detect project root from script location
- Work regardless of where `cargo tauri build` is executed from
- Successfully build .deb and .rpm packages
- Note: AppImage requires square icon (future fix)

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

**Example Fix**:
```rust
// Before
let client = client.try_clone().unwrap();

// After
let client = client
    .try_clone()
    .map_err(|e| AppError::Internal(format!("Failed to clone HTTP client: {}", e)))?;
```

---

## 🔜 Integration Testing Sprint (After Production Fixes)

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

## 📋 Reference Documents

- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Comprehensive backend audit report (December 14, 2025)
  - Detailed analysis of logging, security, encryption, portability, error handling
  - Scorecard: Logging 6/10, Security 5/10, Encryption 9/10, Portability 3/10, Errors 9/10
  - CRITICAL and HIGH priority fixes documented above
  - MEDIUM and LOW priority items moved to ROADMAP.md

---

---

## 🔜 Distribution & Installation System

### Task #15: Installation Scripts & First-Run Setup ✅
**Priority**: HIGH - Required for distribution  
**Estimated Effort**: 3-4 hours  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

- [x] **install.sh** - Linux installation script:
  - [x] Creates `~/.cockpit/` directory structure (data, logs, cache, backups, exports, icons)
  - [x] Installs binary to `/usr/local/bin/cockpit`
  - [x] Creates desktop entry (`~/.local/share/applications/cockpit.desktop`)
  - [x] Installs application icons (32x32, 128x128)
  - [x] Generates initial `.env` configuration template
  - [x] Updates icon cache and desktop database
  - [x] Provides clear next-steps instructions

- [x] **uninstall.sh** - Removal script:
  - [x] Removes binary, desktop entry, icons
  - [x] Optionally preserves user data in `~/.cockpit/`
  - [x] Interactive prompts for data removal
  - [x] Updates system caches

- [x] **backend/src/core/components/setup.rs** - First-run logic:
  - [x] `ensure_directories()` - Creates `~/.cockpit/` if not exists
  - [x] `verify_directories()` - Checks all required subdirectories
  - [x] `is_dev_mode()` - Detects development vs production environment
  - [x] `get_storage_root()` - Returns correct path for dev/prod
  - [x] `get_cockpit_home()` - Gets `~/.cockpit/` path

- [x] **backend/src/main.rs** - Integration:
  - [x] Calls `ensure_directories()` before configuration loading
  - [x] Exits gracefully if directory creation fails

- [x] **INSTALL.md** - End-user documentation:
  - [x] Quick install guide
  - [x] System requirements
  - [x] Configuration instructions
  - [x] First launch steps
  - [x] Troubleshooting section
  - [x] Security notes (master key, file permissions)
  - [x] Manual uninstall instructions

- [x] **Dependencies**:
  - [x] Added `dirs = "5.0"` to Cargo.toml for home directory detection

**Distribution Structure**:
```
~/.cockpit/
├── .env              # Configuration (master key, API keys)
├── data/
│   └── db.sql        # SQLite database
├── logs/
│   ├── app.log
│   ├── api_calls.log
│   └── errors.log
├── backups/          # Database backups
├── exports/          # JSON exports, log exports
├── cache/            # Temporary cache
└── icons/            # Default application icons
```

**Next Steps**:
- Test installation on clean Linux system
- Create .deb package metadata for Debian-based distros
- Create .rpm spec file for Red Hat-based distros
- Add Windows installer (WiX or NSIS)
- Add macOS DMG/PKG installer

### Task #16: Fully Automated Installation & First-Run Setup ✅
**Priority**: HIGH - Zero-configuration installation  
**Estimated Effort**: 3-4 hours  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

- [x] **install.sh - Automatic Configuration**:
  - [x] Auto-generates 256-bit master key using openssl
  - [x] Creates ~/.cockpit/.env with all required settings
  - [x] Sets secure file permissions (600) automatically
  - [x] No manual configuration required

- [x] **Backend Commands** (for optional wizard if needed):
  - [x] `check_setup_status_command` - Detects first run, checks master key and database
  - [x] `generate_master_key_command` - Generates cryptographically secure 256-bit key
  - [x] `save_setup_config_command` - Saves configuration to ~/.cockpit/.env with secure permissions

- [x] **backend/src/core/components/setup.rs** - Auto-initialization:
  - [x] `ensure_directories()` - Returns bool indicating first run
  - [x] `initialize_default_settings()` - Creates default app settings in database
  - [x] Automatic database initialization on first launch
  - [x] Default settings for all categories (app, news, logging, storage)

- [x] **backend/src/core/components/setup_wizard.rs** - Optional wizard (kept for future use):
  - [x] `check_setup_status()` - Returns setup completion status
  - [x] `generate_master_key()` - Uses rand crate for secure random generation
  - [x] `save_setup_config()` - Validates and writes .env file, sets 600 permissions
  - [x] Master key validation (64 hex characters)
  - [x] Placeholder detection (CHANGE_ME, your_key_here)

- [x] **frontend/src/components/setup/SetupWizard.tsx** - 4-step wizard (kept for future use):
  - [x] Step 1: Welcome screen with feature overview
  - [x] Step 2: Master key generation with copy-to-clipboard
  - [x] Step 3: Optional API key configuration (NewsData, log level)
  - [x] Step 4: Configuration summary and completion
  - [x] Progress bar showing current step
  - [x] Form validation and error handling
  - [x] Beautiful gradient UI with purple theme

- [x] **frontend/src/App.tsx** - Automatic setup integration:
  - [x] Added `useSetupStatus()` hook query
  - [x] Shows loading/setup spinner with progress indicators
  - [x] Displays status messages (initializing, creating database, etc.)
  - [x] Automatically transitions to main app when ready
  - [x] No user interaction required

- [x] **frontend/src/hooks/queries.ts**:
  - [x] Added `SetupStatus` type definition
  - [x] Added `useSetupStatus()` query hook

**Features**:
- ✅ **Fully Automated**: Zero user interaction required
- ✅ **Secure by Default**: 256-bit master key auto-generated
- ✅ **Smart Initialization**: Database and settings created automatically
- ✅ **Production Ready**: Proper file permissions and directory structure
- ✅ **Status Indicators**: Clear progress messages during setup
- ✅ **Seamless**: Automatic transition to main app

**User Experience (Completely Automated)**:
1. User runs `./install.sh`
   - Script generates master key with openssl
   - Creates ~/.cockpit directory structure
   - Saves secure configuration
2. User launches Cockpit
   - App detects first run
   - Automatically creates database
   - Initializes default settings
   - Shows progress indicators
3. Main app loads - ready to use!
   - No wizard, no forms, no configuration
   - API keys can be added later in Settings

**Testing Results**:
✅ Master key generation verified (64 hex characters)
✅ Database initialization confirmed (21 default settings)
✅ ~/.cockpit/.env loading fixed (loads before config)
✅ Production path working (/home/user/.cockpit/data/db.sql)
✅ Both backend and frontend compile successfully

---

### Task #17: Distribution Package System ✅
**Priority**: HIGH - Enable end-user distribution  
**Estimated Effort**: 2 hours  
**Status**: Complete! ✅  
**Completed**: December 14, 2025

- [x] **package.sh - Automated Package Builder**:
  - [x] Builds both tarball and .deb packages
  - [x] Creates proper directory structures
  - [x] Includes all necessary files (binary, icons, docs)
  - [x] Generates SHA256 checksums
  - [x] Creates installation wrapper scripts

- [x] **Tarball Distribution**:
  - [x] Portable .tar.gz with automated ./install script
  - [x] Includes install.sh, uninstall.sh in scripts/
  - [x] README.txt with quick start instructions
  - [x] Desktop entry and icons bundled

- [x] **Debian Package (.deb)**:
  - [x] Proper DEBIAN/control with dependencies
  - [x] postinst script for desktop integration
  - [x] prerm script for clean removal
  - [x] FHS-compliant structure (usr/bin, usr/share)
  - [x] Automatic dependency handling via apt

- [x] **Documentation**:
  - [x] DISTRIBUTION.md - Complete build/release guide
  - [x] Updated README.md with installation methods
  - [x] Updated INSTALL.md for end users

**Distribution Methods**:
1. **Tarball**: `tar -xzf ... && cd ... && ./install`
   - Works on any Linux distribution
   - Installs to /usr/local/bin
   - Creates ~/.cockpit automatically
   
2. **Debian Package**: `sudo dpkg -i cockpit_0.1.0_amd64.deb`
   - For Ubuntu/Debian/derivatives
   - Installs to /usr/bin
   - Handles dependencies automatically

**Automated Features**:
- ✅ Master key generation (256-bit, openssl)
- ✅ Directory structure creation
- ✅ Configuration file generation
- ✅ Desktop integration (launcher + icons)
- ✅ Database initialization on first run
- ✅ Default settings (21 entries)
- ✅ Zero user configuration required

**Build Command**:
```bash
./package.sh  # Creates both .tar.gz and .deb in dist/
```

**Next Steps**:
- Test packages on clean Ubuntu 22.04 VM
- Test packages on clean Debian 12 VM
- Verify uninstallation preserves user data
- Create GitHub release workflow
- Consider Snap/Flatpak packages for wider distribution

---

**Last Updated**: December 14, 2025  
**Next Review**: After testing setup wizard
