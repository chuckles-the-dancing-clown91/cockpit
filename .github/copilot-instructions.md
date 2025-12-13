# Cockpit AI Agent Instructions

## Project Overview
Tauri 2.5 desktop app with Rust backend and React 19 frontend. Three modes: Writing (markdown editor, ideas), Research (news aggregation), System (settings, logs, tasks).

## Critical Build & Run Rules

### Always CD to Correct Directory First
**CRITICAL**: Commands fail silently if run from wrong directory.

**EVERY backend command MUST start with:**
```bash
cd /home/daddy/Documents/Commonwealth/cockpit/backend && <command>
```

**EVERY frontend command MUST start with:**
```bash
cd /home/daddy/Documents/Commonwealth/cockpit/frontend && <command>
```

### Build Process
```bash
# Full production build - ALWAYS use this exact command
cd /home/daddy/Documents/Commonwealth/cockpit/backend && cargo tauri build

# Development builds
cd /home/daddy/Documents/Commonwealth/cockpit/backend && cargo build --release
cd /home/daddy/Documents/Commonwealth/cockpit/backend && cargo run

# Frontend dev server
cd /home/daddy/Documents/Commonwealth/cockpit/frontend && npm run dev
cd /home/daddy/Documents/Commonwealth/cockpit/frontend && npm run build

# Running backend binary
cd /home/daddy/Documents/Commonwealth/cockpit/backend && ./target/release/backend
```

**Never run cargo/npm commands without cd first - they will fail silently!**

## Environment Configuration

### Required .env Variables (backend/.env)
**CRITICAL**: Use absolute paths to prevent issues when running from different directories.

```bash
# MUST have correct variable names - app exits silently on mismatch
COCKPIT_MASTER_KEY=<64-char-hex>   # NOT "MASTER_KEY" - generates with: openssl rand -hex 32
DATABASE_URL=sqlite:/absolute/path/to/cockpit/backend/storage/data/db.sql
NEWSDATA_API_KEY=<your-key>

# Storage - use absolute paths
STORAGE_ROOT=/absolute/path/to/cockpit/backend/storage
LOGS_DIR=/absolute/path/to/cockpit/backend/storage/logs

# Optional
LOG_LEVEL=info
LOG_JSON=true                      # Enables JSON log format
LOG_CONSOLE=true
LOG_MAX_SIZE_MB=10
LOG_MAX_FILES=5
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1
STORAGE_MAX_SIZE_GB=50
NEWSDATA_DAILY_LIMIT=180
```

**Common Silent Failures**: 
- Using `MASTER_KEY` instead of `COCKPIT_MASTER_KEY` causes immediate exit with no error
- Using relative paths causes file not found errors when running from different directories

## Architecture Patterns

### Domain-Driven Structure
Each domain owns its business logic and Tauri command interface:

```
backend/src/
├── core/           # Infrastructure (db, config, logging, storage)
├── writing/        # Ideas management domain
├── research/       # News & feeds domain  
├── system/         # Scheduler & tasks domain
└── util/           # Cross-domain utilities

domain/
├── components/     # Business logic (pure Rust functions)
├── commands.rs     # Tauri commands (thin wrappers)
└── mod.rs
```

**Pattern**: Commands in `domain/commands.rs` call handlers in `domain/components/*.rs`. Never put business logic in commands.rs.

### Example: Adding a New Feature
```rust
// 1. Add handler in domain/components/
pub fn get_thing(db: &DatabaseConnection, id: i64) -> Result<Thing, AppError> {
    // business logic here
}

// 2. Add Tauri command in domain/commands.rs
#[tauri::command]
pub async fn get_thing_handler(state: State<'_, AppState>, id: i64) -> Result<Thing, String> {
    components::thing::get_thing(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

// 3. Register in main.rs
.invoke_handler(tauri::generate_handler![
    // ...existing commands,
    get_thing_handler,
])
```

### Frontend Query Pattern (TanStack Query)
```typescript
// hooks/queries.ts
export function useThing(id: number) {
  return useQuery({
    queryKey: ['thing', id],
    queryFn: () => invoke<Thing>('get_thing_handler', { id }),
  });
}

// Mutations invalidate related queries
const mutation = useMutation({
  mutationFn: (data) => invoke('update_thing', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['thing'] });
  },
});
```

## Database & Storage

### Database Location
```bash
backend/storage/data/db.sql      # Database file (when run from backend/)
```

**Migration Pattern**: Add to `backend/src/core/components/migrations.rs`, increment version in `apply_migrations()`.

### Log Parsing (Critical Detail)
`get_logs()` in `storage.rs` parses **both formats**:
- **JSON**: `{"timestamp":"...","level":"INFO","fields":{"message":"..."},"target":"..."}`  
- **Plain text**: `2025-12-12T19:15:18.764156Z  INFO backend::module: message`

**Log Separation**:
- **app.log** - Application logs (shown in Logs view)
- **api_calls.log** - API request/response logs (excluded from main view to reduce clutter)
- **errors.log** - Error-level logs only

The Logs view automatically excludes `api_calls.log` to keep the UI clean. API logs contain verbose JSON responses from news feeds and should be viewed separately or via a dedicated API logs section.

## Common Pitfalls

1. **Silent Exit on Startup**: Check `COCKPIT_MASTER_KEY` exists and is 64 hex chars
2. **Empty Log View**: Logs written to `storage/logs/app.log` - parser handles both JSON/text
3. **Build Fails**: Ensure you're in `backend/` directory before running cargo commands
4. **Frontend API Errors**: Check command is registered in `main.rs` invoke_handler
5. **Database Corruption**: Backup system in `storage/backups/` - use `restore_database_from_backup` command

## Testing & Debugging

```bash
# Backend with verbose logging
cd backend
RUST_LOG=debug RUST_BACKTRACE=1 cargo run

# Check logs
tail -f backend/storage/logs/app.log

# Test specific command
cd backend && cargo test test_name

# Frontend dev mode (hot reload)
cd frontend && npm run dev
```

## Key Files to Understand

- `backend/src/main.rs` - App setup, command registration (140 lines)
- `backend/src/core/config.rs` - All environment variables, validation (296 lines)
- `backend/src/core/components/storage.rs` - Log parsing, backups, cleanup (1445 lines)
- `frontend/src/hooks/queries.ts` - All backend API calls
- `backend/tauri.conf.json` - Tauri configuration, permissions

## Modular Design Philosophy

### Domain Isolation
The codebase follows a strict modular architecture where domains are self-contained:

**Core Domains**:
- **core/** - Infrastructure (database, config, logging, storage, crypto)
- **writing/** - Content creation and ideas management
- **research/** - News aggregation, articles, sources
- **system/** - Task scheduler, cron jobs, execution tracking
- **util/** - Cross-domain utilities

**Key Principles**:
1. **Business logic** stays in `domain/components/` - pure Rust functions
2. **Tauri commands** in `domain/commands.rs` - thin wrappers only
3. **Minimal cross-dependencies** - domains communicate through AppState
4. **Clear boundaries** - each domain has its own data structures and handlers
5. **main.rs stays thin** - only setup and command registration

### Adding Features (Step-by-Step)

**1. Identify domain** - Where does this feature belong?
**2. Add business logic** - Create handler in `domain/components/feature.rs`
**3. Create command** - Wrap handler in `domain/commands.rs`
**4. Register command** - Add to `main.rs` invoke_handler
**5. Frontend integration** - Add query/mutation to `frontend/src/hooks/queries.ts`
**6. UI component** - Create/update view in `frontend/src/components/domain/`

### Parallel Development
The modular structure enables multiple developers to work simultaneously without conflicts:
- Writing features → `writing/` directory
- Research features → `research/` directory  
- System features → `system/` directory
- Core infrastructure → `core/` directory

## Production Distribution (Future)

### First-Run Setup
When distributed, the app will:
1. Create `~/.cockpit/` directory structure:
   - `~/.cockpit/data/` - Database and user data
   - `~/.cockpit/logs/` - Application logs
   - `~/.cockpit/cache/` - Temporary cache
   - `~/.cockpit/backups/` - Database backups
   - `~/.cockpit/exports/` - Exported data
2. Run configuration wizard for API keys and preferences
3. Generate secure master key automatically
4. Set up default settings and storage limits

### Development vs Production Paths
- **Development**: Uses absolute paths from project directory
- **Production**: Uses `~/.cockpit/` in user's home directory
- Configuration managed through Tauri's path resolver

## Workflow Tips

- **Before making changes**: Understand which domain owns the feature
- **After editing Rust**: Rebuild from `backend/` directory
- **After editing commands**: Verify registration in `main.rs`
- **When adding queries**: Add to `queries.ts` and invalidate related keys in mutations
- **Database changes**: Add migration, increment version, test on fresh DB
- **Cross-domain needs**: Use AppState or create util function, don't couple domains
