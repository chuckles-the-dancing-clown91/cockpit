# Cockpit

A modern desktop productivity suite for content creators, researchers, and digital architects. Built with Tauri 2.5, Rust, and React 19.

## Overview

Cockpit is a unified workspace organized into three specialized modes:

- **📝 Writing Mode**: Markdown editor with LaTeX support, idea management, and archive
- **📰 Research Mode**: News aggregation, Reddit monitoring, and source management
- **⚙️ System Mode**: Settings, database management, logs, and task scheduler

## Features

### Writing Mode
- **Advanced Markdown Editor**: 13 toolbar actions, live preview, LaTeX/math support
- **Ideas Library**: Capture and organize ideas with priority levels and status tracking
- **Archive**: View and restore previously saved content
- **Writing Stats**: Real-time word count, reading time, paragraph tracking

### Research Mode
- **News Feed**: Automated article fetching from configured sources
- **Reddit Integration**: Monitor subreddits, manage mod queue
- **Source Management**: Enable/disable news sources, configure fetch intervals

### System Mode
- **Settings**: App preferences, API keys (encrypted), logging configuration
- **Storage**: Database stats, backups, export/import, automated cleanup
- **Logs**: Multi-filter log viewer (level, module, date, search), export functionality
- **Tasks**: Scheduler monitoring, execution history, manual task triggering

### Cross-Cutting Features
- **3 Themes**: Dark, Cyberpunk, Light with instant switching
- **Mobile Responsive**: Drawer navigation, touch-friendly UI
- **Keyboard Shortcuts**: ⌘/Ctrl+1/2/3 for mode switching
- **Accessibility**: Full ARIA labels, screen reader support, keyboard navigation
- **Smooth Animations**: Fade transitions, scale effects, slide-out drawers

## Tech Stack

### Backend
- **Tauri 2.5.3**: Native desktop framework
- **Rust**: Core application logic
- **SeaORM 0.12.15**: Database ORM with migrations
- **SQLite**: Local data storage
- **tokio-cron-scheduler**: Automated task execution
- **tracing**: Structured logging with rotation

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type-safe development
- **Vite 5.4.21**: Fast build tooling
- **TanStack Query**: Server state management
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible components
- **MDEditor**: Custom markdown editor with toolbar

## Project Structure

### Backend Architecture (Domain-Driven Design)

The backend follows a modular, domain-driven architecture where each domain owns its business logic and command interface:

```
backend/src/
├── main.rs (140 lines)           # Application entry point & setup
│
├── core/                         # Infrastructure layer
│   ├── components/               # Core business logic
│   │   ├── config.rs            # Configuration management
│   │   ├── crypto.rs            # API key encryption
│   │   ├── db.rs                # Database connection
│   │   ├── db_backup.rs         # Backup operations
│   │   ├── errors.rs            # Error types
│   │   ├── logging.rs           # Structured logging
│   │   ├── migrations.rs        # Schema migrations
│   │   ├── settings.rs          # App settings CRUD
│   │   └── storage.rs           # Storage management
│   ├── commands.rs              # 3 Tauri commands (settings)
│   └── mod.rs
│
├── writing/                      # Content creation domain
│   ├── components/
│   │   └── ideas.rs             # Idea management logic
│   ├── commands.rs              # 8 Tauri commands (ideas)
│   └── mod.rs
│
├── research/                     # News & research domain
│   ├── components/
│   │   ├── feed.rs              # News sync & fetching
│   │   ├── articles.rs          # Article CRUD
│   │   ├── sources.rs           # Source management
│   │   └── settings.rs          # News configuration
│   ├── commands.rs              # 10 Tauri commands (news)
│   └── mod.rs
│
├── system/                       # Scheduling & tasks domain
│   ├── components/
│   │   ├── scheduler.rs         # Cron scheduler
│   │   ├── tasks.rs             # Task definitions
│   │   └── task_runs.rs         # Execution tracking
│   ├── commands.rs              # 3 Tauri commands (tasks)
│   └── mod.rs
│
└── util/                         # Cross-domain utilities
    ├── commands.rs              # 6 utility commands
    └── mod.rs
```

**Architecture Pattern:**
- **`domain/components/`** - Business logic & handlers (pure Rust)
- **`domain/commands.rs`** - Tauri command interface (wraps handlers)
- **`main.rs`** - Application setup & command registration only

### Frontend Structure

```
frontend/src/
├── components/
│   ├── navigation/      # TopNav, SideNav, ModeContext
│   ├── writing/         # Writing mode views
│   ├── research/        # Research mode views
│   ├── system/          # System mode views
│   ├── news/            # News-specific components
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout components
├── hooks/               # React hooks & queries
├── theme/               # Theme system
├── vendor/              # Custom MDEditor
├── App.tsx              # Main application
├── main.tsx             # React entry point
└── index.css            # Global styles
│   ├── package.json             # Node dependencies
│   ├── vite.config.ts           # Vite configuration
│   └── tsconfig.json            # TypeScript configuration
│
└── storage/
    ├── data/                    # Shared data storage
    └── logs/                    # Shared logs
```

## Getting Started

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Rust** 1.75+ (for backend)
- **pnpm/npm** (package manager)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd cockpit
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install
```

3. **Install backend dependencies**
```bash
cd ../backend
cargo build
```

4. **Configure environment variables**

Create `backend/.env` with absolute paths:

```bash
# Database Configuration
DATABASE_URL=sqlite:/absolute/path/to/cockpit/backend/storage/data/db.sql
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1

# Logging Configuration
LOG_LEVEL=info
LOG_JSON=true
LOG_CONSOLE=true
LOGS_DIR=/absolute/path/to/cockpit/backend/storage/logs
LOG_MAX_SIZE_MB=10
LOG_MAX_FILES=5

# NewsData API
NEWSDATA_API_KEY=your_api_key_here
NEWSDATA_DAILY_LIMIT=180

# Storage (use absolute paths)
STORAGE_ROOT=/absolute/path/to/cockpit/backend/storage
STORAGE_MAX_SIZE_GB=50

# Crypto (generate a secure key)
COCKPIT_MASTER_KEY=$(openssl rand -hex 32)
```

**Important**: Use absolute paths for `DATABASE_URL`, `LOGS_DIR`, and `STORAGE_ROOT` to prevent issues when running from different directories.

### Development

**Run in development mode:**
```bash
cd backend
cargo tauri dev
```

This starts both the Rust backend and React frontend with hot-reload enabled.

**Frontend only (for UI development):**
```bash
cd frontend
npm run dev
```

**Backend only:**
```bash
cd backend
cargo run
```

### Building

**Build for production:**
```bash
cd backend
cargo tauri build
```

Creates platform-specific installers in `backend/target/release/bundle/`.

## Developer Workflow

### Adding a New Feature

The modular architecture makes it easy to add features in isolation:

**1. Identify the Domain**
- **Core** - Infrastructure, settings, storage
- **Writing** - Content creation, ideas
- **Research** - News, articles, sources
- **System** - Scheduling, tasks, jobs
- **Util** - Cross-domain utilities

**2. Implement Business Logic**

Add your handler function in `domain/components/feature.rs`:

```rust
// backend/src/research/components/articles.rs
pub async fn mark_article_read_handler(
    id: i64,
    state: &AppState,
) -> AppResult<()> {
    // Business logic here
}
```

**3. Create Tauri Command**

Wrap the handler in `domain/commands.rs`:

```rust
// backend/src/research/commands.rs
#[tauri::command]
pub async fn mark_article_read(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    mark_article_read_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}
```

**4. Register Command**

Add to the invoke handler in `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    mark_article_read,  // <-- Add here
])
```

**5. Call from Frontend**

Use the command in your React component:

```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('mark_article_read', { id: articleId });
```

### Working in Parallel

The modular structure enables multiple developers to work simultaneously:

- **Writing features** → `writing/` directory
- **Research features** → `research/` directory
- **System features** → `system/` directory
- **Core infrastructure** → `core/` directory

Each domain is self-contained with minimal cross-dependencies, reducing merge conflicts.

### Code Organization Principles

1. **Business logic** lives in `domain/components/`
2. **Tauri commands** live in `domain/commands.rs`
3. **Keep main.rs thin** - only setup and registration
4. **Use handlers** - separate business logic from framework code
5. **Domain isolation** - minimize cross-domain dependencies

### Adding Tauri Plugins

Tauri v2 uses a capability-based security model (ACL - Access Control List). When adding new plugins, you must configure permissions:

**1. Add Plugin Dependencies**

Backend (`backend/Cargo.toml`):
```toml
[dependencies]
tauri-plugin-dialog = "2"
```

Frontend:
```bash
cd frontend
npm install @tauri-apps/plugin-dialog
```

**2. Register Plugin in main.rs**

```rust
// backend/src/main.rs
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())  // <-- Add plugin
    .setup(move |app| {
        // ... existing setup
    })
```

**3. Configure Permissions (ACL)**

Create or update `backend/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for the main window",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",      // Allow file open dialog
    "dialog:allow-save"       // Allow file save dialog
  ]
}
```

**Common Plugin Permissions:**
- **dialog**: `dialog:allow-open`, `dialog:allow-save`, `dialog:allow-message`
- **fs**: `fs:allow-read-file`, `fs:allow-write-file`, `fs:allow-read-dir`
- **shell**: `shell:allow-execute`, `shell:allow-open`
- **http**: `http:default`, `http:allow-fetch`
- **notification**: `notification:default`, `notification:allow-show`

**4. Rebuild to Generate ACL Manifests**

```bash
cd backend
cargo build --release
```

This regenerates `backend/gen/schemas/acl-manifests.json` with the new permissions.

**5. Use Plugin in Frontend**

```typescript
import { open } from '@tauri-apps/plugin-dialog';

const filePath = await open({
  multiple: false,
  filters: [{ name: 'JSON', extensions: ['json'] }]
});
```

**Important Notes:**
- **Always rebuild** after changing capabilities - permissions are compiled into the app
- **Test permissions** - missing ACL entries cause "not allowed by ACL" runtime errors
- **Minimal permissions** - only grant what's needed for security
- **Wildcard windows** - `"windows": ["*"]` applies to all windows, or specify exact window names

**Troubleshooting ACL Errors:**
```
Error: Command plugin:dialog|open not allowed by ACL
```
→ Solution: Add `dialog:allow-open` to `capabilities/default.json` and rebuild

**Frontend build only:**
```bash
cd frontend
npm run build
```

## Configuration

### Database
- SQLite database: `backend/storage/data/db.sql`
- Automatic migrations on startup
- Schema defined in `backend/src/db.rs`

### Logging
- Log files: `backend/storage/logs/`
- Configurable log level via Settings UI
- Automatic rotation and retention policies

### API Keys
- Stored encrypted in database
- Managed via Settings > News API
- Uses `crypto.rs` for encryption/decryption

### Scheduled Tasks
- Defined in `backend/src/scheduler.rs`
- Configurable intervals
- Execution history tracked in database

## Keyboard Shortcuts

- **⌘/Ctrl + 1**: Switch to Writing Mode
- **⌘/Ctrl + 2**: Switch to Research Mode
- **⌘/Ctrl + 3**: Switch to System Mode

## Themes

Switch between themes using the sun/moon icon in the top navigation:
- **Dark**: Cyan accents, dark background (default)
- **Cyberpunk**: Orange/neon aesthetic with dark warm tones
- **Light**: Blue accents, clean light interface

## Architecture

### Mode-Based Navigation
The app uses a context-based navigation system with three top-level modes. Each mode has its own side navigation with 3-4 views. State persists to localStorage for seamless session continuity.

### State Management
- **React Context**: Mode and view state
- **TanStack Query**: Server state, caching, and data fetching
- **localStorage**: Theme and navigation persistence

### Backend Communication
- **Tauri Commands**: Type-safe IPC between frontend and backend
- **Event System**: Real-time updates from backend to frontend
- **Error Handling**: Comprehensive error types with user-friendly messages

## Development Workflow

1. **UI Changes**: Work in `frontend/src/components/` with hot-reload
2. **Backend Logic**: Modify `backend/src/` files, restart `cargo tauri dev`
3. **Database Changes**: Update entities in `db.rs`, run migrations
4. **New Features**: Follow the mode-based component structure

## Troubleshooting

### Build Errors
- Clear node_modules: `rm -rf frontend/node_modules && npm install`
- Clear Rust cache: `cd backend && cargo clean`
- Check Tauri CLI version: `cargo tauri --version`

### Runtime Issues
- Check logs in `backend/storage/logs/`
- Verify database exists at `backend/storage/data/db.sql`
- Ensure API keys are configured in Settings

### Development Issues
- Port conflicts: Change port in `vite.config.ts`
- Missing dependencies: Run `npm install` and `cargo update`
- Type errors: Run `npm run build` for full type checking

## Contributing

### Code Style
- **TypeScript**: Follow ESLint configuration
- **Rust**: Use `cargo fmt` and `cargo clippy`
- **Components**: Functional components with TypeScript types
- **Naming**: PascalCase for components, camelCase for functions

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

## License

[Add your license here]

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop framework
- [React](https://react.dev/) - UI library
- [SeaORM](https://www.sea-ql.org/SeaORM/) - Rust ORM
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [TanStack Query](https://tanstack.com/query/) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Roadmap

See [TODO.md](TODO.md) for planned features and improvements.
