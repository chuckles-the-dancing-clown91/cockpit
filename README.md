# Cockpit

> A modern desktop productivity suite for content creators, researchers, and digital architects.

[![Tauri](https://img.shields.io/badge/Tauri-2.5.3-blue)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Built with **Tauri 2.5** (Rust backend) + **React 19** (TypeScript frontend), Cockpit provides a unified workspace for writing, research, and system management.

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Build & Run](#build--run)
- [Configuration](#configuration)
- [Development Guide](#development-guide)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Project Status](#project-status)

## 🎯 Overview

Cockpit is organized into three specialized modes:

- **📝 Writing Mode**: Markdown editor with LaTeX support, idea management, and archive
- **📰 Research Mode**: News aggregation, article management, and source configuration
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
- **Tasks**: Complete scheduler management with:
  - Real-time task list with status, last run time, error counts
  - Execution history tracking (all runs recorded to database)
  - Manual task triggering (Run Now button)
  - Enable/disable scheduled tasks
  - Comprehensive logging (scheduler triggers, completions, errors)
  - Duration tracking and status badges

### Cross-Cutting Features
- **3 Themes**: Dark, Cyberpunk, Light with instant switching
- **Mobile Responsive**: Drawer navigation, touch-friendly UI
- **Keyboard Shortcuts**: ⌘/Ctrl+1/2/3 for mode switching
- **Accessibility**: Full ARIA labels, screen reader support, keyboard navigation
- **Smooth Animations**: Fade transitions, scale effects, slide-out drawers

## Tech Stack

### Backend
- **Tauri 2.5.3**: Native desktop framework
- **Rust 1.75+**: Core application logic
- **SeaORM 1.1.19**: Database ORM with migrations
- **SQLite**: Local data storage
- **tokio-cron-scheduler 0.15.1**: Automated task execution
- **tracing**: Structured logging with JSON format
- **argon2**: Password hashing (future auth)
- **aes-gcm**: API key encryption

### Frontend
- **React 19**: UI framework with concurrent features
- **TypeScript 5**: Type-safe development
- **Vite 7.2.7**: Fast build tooling with HMR
- **TanStack Query v5**: Server state management & caching
- **Tailwind CSS 3**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Sonner 2.0**: Toast notifications
- **MDEditor**: Custom markdown editor with LaTeX support

## 📁 Project Structure

### Complete File Hierarchy

```
cockpit/
├── backend/                      # Tauri + Rust backend
│   ├── src/
│   │   ├── main.rs              # App entry point, command registration
│   │   │
│   │   ├── core/                # Infrastructure domain
│   │   │   ├── components/
│   │   │   │   ├── config/     # Configuration management
│   │   │   │   │   ├── loader.rs    # Environment variable loading
│   │   │   │   │   ├── types.rs     # Config structs
│   │   │   │   │   ├── validation.rs # Config validation
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── db/         # Database management
│   │   │   │   │   ├── init.rs      # Connection pool setup
│   │   │   │   │   ├── migrations.rs # Schema migrations
│   │   │   │   │   ├── backup.rs    # Database backup operations
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── settings/   # App settings system
│   │   │   │   │   ├── entities.rs  # Database entity
│   │   │   │   │   ├── handlers.rs  # CRUD operations
│   │   │   │   │   ├── types.rs     # DTOs
│   │   │   │   │   ├── validation.rs # Setting validation
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── storage/    # Storage & file management
│   │   │   │   │   ├── backup.rs    # Backup operations
│   │   │   │   │   ├── cleanup.rs   # Cleanup utilities
│   │   │   │   │   ├── export.rs    # Export/import
│   │   │   │   │   ├── logs.rs      # Log file management
│   │   │   │   │   ├── stats.rs     # Storage statistics
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── crypto.rs   # AES-GCM encryption
│   │   │   │   ├── errors/     # Error types & handling
│   │   │   │   ├── logging/    # Structured logging setup
│   │   │   │   └── mod.rs
│   │   │   ├── commands.rs     # Core Tauri commands
│   │   │   └── mod.rs
│   │   │
│   │   ├── writing/             # Content creation domain
│   │   │   ├── components/
│   │   │   │   └── ideas/
│   │   │   │       ├── handlers.rs  # CRUD operations
│   │   │   │       ├── types.rs     # Entity & DTOs
│   │   │   │       └── mod.rs
│   │   │   ├── commands.rs     # 8 Tauri commands
│   │   │   └── mod.rs
│   │   │
│   │   ├── research/            # News & research domain
│   │   │   ├── components/
│   │   │   │   └── feed/
│   │   │   │       ├── entities/    # Database entities
│   │   │   │       │   ├── articles.rs
│   │   │   │       │   ├── settings.rs
│   │   │   │       │   ├── sources.rs
│   │   │   │       │   └── mod.rs
│   │   │   │       ├── articles.rs  # Article handlers
│   │   │   │       ├── settings.rs  # Settings management
│   │   │   │       ├── sources.rs   # Source management
│   │   │   │       ├── sync.rs      # API sync logic
│   │   │   │       ├── types.rs     # DTOs
│   │   │   │       └── mod.rs
│   │   │   ├── commands.rs     # 10 Tauri commands
│   │   │   └── mod.rs
│   │   │
│   │   ├── system/              # Scheduling domain
│   │   │   ├── components/
│   │   │   │   └── scheduler/
│   │   │   │       ├── entities.rs    # SystemTask entity model
│   │   │   │       ├── task_runs.rs   # SystemTaskRuns entity model
│   │   │   │       ├── types.rs       # DTOs (SystemTaskDto, TaskRunDto, etc.)
│   │   │   │       ├── executor.rs    # Task execution logic with run history
│   │   │   │       ├── init.rs        # Scheduler initialization
│   │   │   │       ├── handlers.rs    # Command handlers
│   │   │   │       └── mod.rs
│   │   │   ├── commands.rs     # 4 Tauri commands
│   │   │   └── mod.rs
│   │   │
│   │   └── util/                # Cross-domain utilities
│   │       ├── commands.rs     # 6 utility commands
│   │       └── mod.rs
│   │
│   ├── storage/                 # Runtime data (created on first run)
│   │   ├── data/
│   │   │   ├── db.sql          # SQLite database
│   │   │   ├── db.sql-shm      # Shared memory
│   │   │   └── db.sql-wal      # Write-ahead log
│   │   ├── logs/
│   │   │   ├── app.log         # Application logs (JSON)
│   │   │   ├── api_calls.log   # API request/response logs
│   │   │   └── errors.log      # Error-level logs only
│   │   ├── backups/            # Database backups
│   │   ├── exports/            # Data exports
│   │   └── cache/              # Temporary cache
│   │
│   ├── migrations/              # SQL migration files
│   │   ├── 001_initial_schema_up.sql
│   │   ├── 001_initial_schema_down.sql
│   │   ├── 002_app_settings_up.sql
│   │   ├── 002_app_settings_down.sql
│   │   ├── 003_performance_indexes_up.sql
│   │   └── 003_performance_indexes_down.sql
│   │
│   ├── capabilities/            # Tauri v2 ACL permissions
│   │   └── default.json        # Permission manifest
│   │
│   ├── icons/                   # App icons (various sizes)
│   ├── target/                  # Rust build output
│   │   ├── debug/              # Debug builds
│   │   └── release/            # Release builds
│   │       ├── backend         # Compiled binary
│   │       ├── cockpit         # Tauri app bundle
│   │       └── bundle/         # Platform installers
│   │
│   ├── Cargo.toml              # Rust dependencies
│   ├── Cargo.lock              # Dependency lock file
│   ├── tauri.conf.json         # Tauri configuration
│   ├── build.rs                # Build script
│   └── .env                    # Environment variables (create this)
│
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── navigation/     # TopNav, SideNav, ModeContext
│   │   │   ├── writing/        # Writing mode views
│   │   │   │   ├── WritingView.tsx
│   │   │   │   ├── IdeasView.tsx
│   │   │   │   └── ArchiveView.tsx
│   │   │   ├── research/       # Research mode views
│   │   │   │   ├── NewsFeedView.tsx
│   │   │   │   ├── ArticlesView.tsx
│   │   │   │   └── SourcesView.tsx
│   │   │   ├── system/         # System mode views
│   │   │   │   ├── SettingsView.tsx
│   │   │   │   ├── StorageView.tsx
│   │   │   │   ├── LogsView.tsx
│   │   │   │   └── TasksView.tsx
│   │   │   ├── news/           # Shared news components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ... (20+ components)
│   │   │   └── layout/         # Layout components
│   │   │
│   │   ├── hooks/
│   │   │   ├── queries.ts      # TanStack Query hooks
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── utils.ts        # Utility functions
│   │   │   └── notifications.ts
│   │   │
│   │   ├── theme/              # Theme system
│   │   │   └── theme-provider.tsx
│   │   │
│   │   ├── vendor/             # Custom MDEditor
│   │   │   └── md-editor/
│   │   │
│   │   ├── App.tsx             # Main application
│   │   ├── main.tsx            # React entry point
│   │   └── index.css           # Global styles
│   │
│   ├── public/                 # Static assets
│   ├── node_modules/           # Node dependencies (gitignored)
│   ├── dist/                   # Built frontend (gitignored)
│   ├── package.json            # Node dependencies
│   ├── package-lock.json       # Dependency lock file
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript config
│   ├── tsconfig.node.json      # Node TypeScript config
│   ├── tailwind.config.cjs     # Tailwind CSS config
│   └── postcss.config.cjs      # PostCSS config
│
├── docs/                        # Documentation
│   ├── DONE.md                 # Completed work log
│   ├── ROADMAP.md              # Future planning
│   └── TODO_OLD_BACKUP.md      # Historical backups
│
├── README.md                    # This file
├── TODO.md                      # Active tasks
├── REFACTOR_SUMMARY.md         # Refactoring notes
└── build.sh                     # Build script (optional)
```

### Architecture Patterns

**Backend (Domain-Driven Design):**
- **`domain/components/`** - Business logic & handlers (pure Rust)
- **`domain/commands.rs`** - Tauri command interface (thin wrappers)
- **`main.rs`** - Application setup & command registration only

**Frontend (Component-Based):**
- **Mode-based structure** - Writing, Research, System
- **Shared UI components** - Radix UI primitives + custom components
- **Hooks for data** - TanStack Query for server state
- **Theme system** - CSS variables + context provider

**Key Benefits:**
- ✅ Clear separation of concerns
- ✅ Easy to navigate and locate functionality
- ✅ Parallel development friendly
- ✅ Testable components
- ✅ Foundation for future plugin system

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 18+ | Frontend tooling | [nodejs.org](https://nodejs.org/) |
| **Rust** | 1.75+ | Backend compilation | [rustup.rs](https://rustup.rs/) |
| **npm/pnpm** | Latest | Package manager | Included with Node.js |
| **SQLite** | 3.x | Database (usually pre-installed) | [sqlite.org](https://www.sqlite.org/) |

**Platform-Specific Requirements:**
- **Linux**: `build-essential`, `libssl-dev`, `libsqlite3-dev`, `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools, WebView2

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd cockpit

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Build backend dependencies
cd ../backend
cargo build

# 4. Create environment file (see Configuration below)
cp .env.example .env
nano .env  # Edit with your settings

# 5. Run in development mode
cargo tauri dev
```

The app will start with hot-reload enabled for both frontend and backend.

## ⚙️ Configuration

### Environment Variables

Create `backend/.env` with the following configuration:

```bash
# ============================================
# Database Configuration
# ============================================
# Use ABSOLUTE paths to prevent path resolution issues
DATABASE_URL=sqlite:/absolute/path/to/cockpit/backend/storage/data/db.sql
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=info                    # Options: trace, debug, info, warn, error
LOG_JSON=true                     # Enable JSON log format for parsing
LOG_CONSOLE=true                  # Print logs to console
LOGS_DIR=/absolute/path/to/cockpit/backend/storage/logs
LOG_MAX_SIZE_MB=10               # Max log file size before rotation
LOG_MAX_FILES=5                  # Number of rotated files to keep

# ============================================
# NewsData API Configuration
# ============================================
NEWSDATA_API_KEY=your_api_key_here
NEWSDATA_DAILY_LIMIT=180         # Free tier: 180 calls/day

# ============================================
# Storage Configuration
# ============================================
# Use ABSOLUTE paths
STORAGE_ROOT=/absolute/path/to/cockpit/backend/storage
STORAGE_MAX_SIZE_GB=50           # Maximum storage size (soft limit)

# ============================================
# Encryption & Security
# ============================================
# Generate a secure 64-character hex key
COCKPIT_MASTER_KEY=$(openssl rand -hex 32)
# Or manually: COCKPIT_MASTER_KEY=your_64_character_hex_key_here
```

**⚠️ Critical Notes:**
- **Always use absolute paths** - Relative paths fail when running from different directories
- **`COCKPIT_MASTER_KEY` must be 64 hex characters** - App exits silently if wrong length
- **Backup your `.env` file** - Lost keys = inaccessible encrypted data

### Generating Secure Keys

```bash
# Generate master encryption key (64 hex characters)
openssl rand -hex 32

# Example output: 8f7a3e9c1d6b2f0a5c8e4b7d9f1a3c5e...
```

### Example `.env` File

```bash
DATABASE_URL=sqlite:/home/user/cockpit/backend/storage/data/db.sql
DB_MAX_CONNECTIONS=5
DB_MIN_CONNECTIONS=1

LOG_LEVEL=info
LOG_JSON=true
LOG_CONSOLE=true
LOGS_DIR=/home/user/cockpit/backend/storage/logs
LOG_MAX_SIZE_MB=10
LOG_MAX_FILES=5

NEWSDATA_API_KEY=pub_123456789abcdef
NEWSDATA_DAILY_LIMIT=180

STORAGE_ROOT=/home/user/cockpit/backend/storage
STORAGE_MAX_SIZE_GB=50

COCKPIT_MASTER_KEY=8f7a3e9c1d6b2f0a5c8e4b7d9f1a3c5e2b4d6f8a9c1e3f5a7c9e1b3d5f7a9c1e
```

## 🔨 Build & Run

### Development Mode

**Full Stack (Recommended):**
```bash
cd backend
cargo tauri dev
```
- Starts Rust backend with hot-reload
- Starts React frontend on `http://localhost:5173`
- Opens native window automatically
- Backend logs to console + files

**Frontend Only:**
```bash
cd frontend
npm run dev
```
- Frontend dev server only
- Use when working on UI without backend changes
- Tauri commands will fail without backend

**Backend Only:**
```bash
cd backend
cargo run
```
- Runs Rust backend without Tauri window
- Useful for testing backend logic
- No frontend served

### Production Build

**Complete Build:**
```bash
cd backend
cargo tauri build
```

**Build Output:**
```
backend/target/release/
├── backend                      # Standalone binary (macOS/Linux)
├── backend.exe                  # Standalone binary (Windows)
├── cockpit                      # Tauri bundled app
└── bundle/                      # Platform-specific installers
    ├── appimage/               # Linux AppImage
    │   └── cockpit_0.2.0_amd64.AppImage
    ├── deb/                    # Debian package
    │   └── cockpit_0.2.0_amd64.deb
    ├── dmg/                    # macOS disk image
    │   └── cockpit_0.2.0_x64.dmg
    └── msi/                    # Windows installer
        └── cockpit_0.2.0_x64.msi
```

**Build Times (Reference):**
- Debug build: ~30s (incremental)
- Release build: ~1m 50s (optimized)
- Frontend build: ~5s

**Frontend Only Build:**
```bash
cd frontend
npm run build
```
- Output: `frontend/dist/`
- Used by Tauri for production bundles

### Running Production Binary

**Tauri App (Correct Way):**
```bash
cd backend
./target/release/cockpit        # Full Tauri app with UI
```

**⚠️ Important**: Do NOT run `./target/release/backend` - this is the backend library only, not the full app!

**Platform Installers:**
- **Linux**: `./backend/target/release/bundle/appimage/cockpit_0.2.0_amd64.AppImage`
- **macOS**: Open `cockpit.app` from `bundle/dmg/`
- **Windows**: Install from `.msi` or run `.exe`

### Build Optimization

**Faster Debug Builds:**
```bash
# Use mold linker (Linux)
sudo apt install mold
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"
cargo build
```

**Smaller Release Builds:**
```toml
# Add to backend/Cargo.toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
strip = true        # Remove debug symbols
```

## 🛠️ Development Guide

### Project Workflow

**1. UI Changes (Frontend)**
```bash
cd frontend
npm run dev    # Hot-reload enabled
# Edit files in src/components/
```

**2. Backend Logic**
```bash
cd backend
cargo tauri dev    # Restart on Rust changes
# Edit files in src/
```

**3. Database Changes**
```bash
# Add migration in backend/migrations/
# Format: 00X_description_up.sql and 00X_description_down.sql
# Increment version in src/core/components/migrations.rs
```

### Adding a New Feature

The modular architecture makes features easy to add in isolation:

#### Step 1: Identify the Domain

| Domain | Purpose | Examples |
|--------|---------|----------|
| **core** | Infrastructure | Settings, storage, logging |
| **writing** | Content creation | Ideas, markdown editing |
| **research** | News & articles | Feed sync, sources |
| **system** | Scheduling | Cron jobs, task runs |
| **util** | Cross-domain | Utilities, helpers |

#### Step 2: Implement Business Logic

Create handler in `domain/components/`:

```rust
// backend/src/research/components/feed/articles.rs
use crate::core::components::errors::AppResult;
use crate::AppState;

/// Mark article as read
pub async fn mark_article_read_handler(
    id: i64,
    state: &AppState,
) -> AppResult<()> {
    // 1. Validate input
    if id <= 0 {
        return Err(AppError::InvalidInput("Invalid article ID".into()));
    }
    
    // 2. Update database
    let article = EntityNewsArticles::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound("Article not found".into()))?;
    
    let mut active: ActiveModel = article.into();
    active.is_read = Set(1);
    active.update(&state.db).await?;
    
    // 3. Log action
    info!("Article {} marked as read", id);
    
    Ok(())
}
```

#### Step 3: Create Tauri Command

Wrap handler in `domain/commands.rs`:

```rust
// backend/src/research/commands.rs
use tauri::State;

#[tauri::command]
pub async fn mark_article_read(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    mark_article_read_handler(id, &state)
        .await
        .map_err(|e| e.to_string())  // Convert AppError to String
}
```

#### Step 4: Register Command

Add to `main.rs` invoke handler:

```rust
// backend/src/main.rs
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        // ... existing commands
        research::commands::mark_article_read,  // <-- Add here
    ])
```

#### Step 5: Create Frontend Hook

Add to `frontend/src/hooks/queries.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export function useMarkArticleRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => invoke('mark_article_read', { id }),
    onSuccess: () => {
      // Invalidate related queries to refetch
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
```

#### Step 6: Use in Component

```typescript
// frontend/src/components/research/NewsFeedView.tsx
import { useMarkArticleRead } from '@/hooks/queries';

function ArticleCard({ article }) {
  const markAsRead = useMarkArticleRead();
  
  const handleMarkRead = () => {
    markAsRead.mutate(article.id);
  };
  
  return (
    <button onClick={handleMarkRead}>
      Mark as Read
    </button>
  );
}
```

### Code Organization Principles

1. ✅ **Business logic** in `domain/components/` (pure Rust functions)
2. ✅ **Tauri commands** in `domain/commands.rs` (thin wrappers)
3. ✅ **Keep main.rs thin** - only setup and registration
4. ✅ **Use handlers** - separate logic from framework
5. ✅ **Domain isolation** - minimize cross-dependencies
6. ✅ **Frontend hooks** - encapsulate Tauri calls
7. ✅ **Type safety** - leverage TypeScript + Rust

### Working in Parallel

The modular structure enables multiple developers to work simultaneously:

| Developer | Focus Area | Directory | Conflicts |
|-----------|-----------|-----------|-----------|
| Dev A | Writing features | `writing/` | Minimal |
| Dev B | Research features | `research/` | Minimal |
| Dev C | System features | `system/` | Minimal |
| Dev D | Core infrastructure | `core/` | Moderate |
| Dev E | UI components | `frontend/src/components/ui/` | Minimal |

**Merge Conflict Prevention:**
- Each domain is self-contained
- Minimal cross-domain dependencies
- Clear ownership boundaries
- Only `main.rs` registration may conflict (easy to resolve)

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

## 🎨 Features & Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + 1` | Switch to Writing Mode |
| `⌘/Ctrl + 2` | Switch to Research Mode |
| `⌘/Ctrl + 3` | Switch to System Mode |

### Themes

Toggle themes using the sun/moon icon in the top navigation:

| Theme | Description | Color Scheme |
|-------|-------------|--------------|
| **Dark** | Default theme | Cyan accents, dark backgrounds |
| **Cyberpunk** | Futuristic aesthetic | Orange/neon, warm dark tones |
| **Light** | Clean interface | Blue accents, light backgrounds |

### Database Management

**Location**: `backend/storage/data/db.sql`
- **Automatic migrations** on startup
- **Backup system** via Storage view
- **Export/Import** for data portability
- **VACUUM** operations for optimization

**Schema**:
- `ideas` - Writing mode content
- `news_articles` - Fetched articles
- `news_settings` - API configuration
- `news_sources` - Available sources
- `app_settings` - Application preferences
- `system_tasks` - Scheduled jobs
- `system_task_runs` - Execution history

### Logging System

**Location**: `backend/storage/logs/`
- **app.log** - Main application logs (JSON format)
- **api_calls.log** - API request/response logs
- **errors.log** - Error-level logs only

**Configuration** (via Settings UI or `.env`):
- Log level: `trace`, `debug`, `info`, `warn`, `error`
- Max file size: Default 10MB
- Rotation: Keeps last 5 files
- Format: JSON for parsing, plain text for viewing

### API Key Security

- ✅ **Encrypted storage** using AES-GCM
- ✅ **Master key** from `COCKPIT_MASTER_KEY`
- ✅ **Sanitized logs** - API keys redacted
- ✅ **UI management** - Settings > News API

### Task Scheduler

**Built-in Tasks**:
- **NewsData Sync** (`news_sync`) - Fetch articles from NewsData.io API
- **News Sources Sync** (`news_sources_sync`) - Update available news sources

**Management** (Tasks View):
- View all scheduled tasks with status, frequency, last run time
- Execution history with filtering by task
  - All runs recorded to `system_task_runs` table
  - Shows start time, end time, duration, status, results, errors
- Manual task triggering (Run Now button)
- Enable/disable scheduled tasks
- Cron-based scheduling (tokio-cron-scheduler)

**Logging**:
- INFO logs when scheduler triggers tasks
- INFO logs for successful completion with results
- ERROR logs for failures with full error details
- WARN logs for skipped tasks (already running, unknown type)
- All logs viewable in Logs tab or `backend/storage/logs/app.log`

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

## 🐛 Troubleshooting

### Build Errors

| Problem | Solution |
|---------|----------|
| **Cargo build fails** | `cd backend && cargo clean && cargo build` |
| **npm install fails** | `cd frontend && rm -rf node_modules package-lock.json && npm install` |
| **Tauri CLI missing** | `cargo install tauri-cli --version ^2.0.0` |
| **Linking errors (Linux)** | Install dev libraries: `sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev` |
| **OpenSSL errors** | `sudo apt install libssl-dev pkg-config` (Linux) or `brew install openssl` (macOS) |

### Runtime Issues

| Problem | Solution |
|---------|----------|
| **App exits immediately on startup** | Check `COCKPIT_MASTER_KEY` is 64 hex chars in `.env` |
| **Database not found** | Verify `DATABASE_URL` uses absolute path |
| **No logs appearing** | Check `LOGS_DIR` path exists and is writable |
| **API calls failing** | Verify `NEWSDATA_API_KEY` in Settings view |
| **Permission denied errors** | Check file permissions on `backend/storage/` directory |

### Development Issues

| Problem | Solution |
|---------|----------|
| **Port 5173 already in use** | Change port in `vite.config.ts` or kill process: `lsof -ti:5173 \| xargs kill` |
| **Hot reload not working** | Restart dev server, check file watchers: `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf` |
| **TypeScript errors** | Run `npm run build` for full type checking |
| **Rust analyzer slow** | Increase RAM allocation or use `rust-analyzer.checkOnSave.allTargets: false` |

### Common Error Messages

**"Command not allowed by ACL"**
```bash
# Solution: Add permission to backend/capabilities/default.json
# Then rebuild: cargo build --release
```

**"Failed to connect to database"**
```bash
# Check DATABASE_URL path
# Ensure directory exists: mkdir -p backend/storage/data
```

**"API key decryption failed"**
```bash
# COCKPIT_MASTER_KEY changed or missing
# Re-enter API keys in Settings view
```

### Debug Mode

**Enable verbose logging:**
```bash
# Backend
cd backend
RUST_LOG=debug RUST_BACKTRACE=1 cargo run

# Check logs
tail -f storage/logs/app.log
```

**Browser DevTools (Frontend):**
- Press `F12` to open DevTools
- Check Console for errors
- Network tab shows Tauri command calls

### Getting Help

1. **Check logs**: `backend/storage/logs/app.log`
2. **Search issues**: [GitHub Issues](link-to-issues)
3. **Documentation**: [Tauri Docs](https://tauri.app/), [React Docs](https://react.dev/)
4. **Ask community**: Tauri Discord, Stack Overflow

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style

**TypeScript:**
- Follow ESLint configuration
- Use functional components with hooks
- PascalCase for components, camelCase for functions
- Explicit return types for functions

**Rust:**
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Use `#[instrument]` for tracing spans
- Document public APIs with `///` comments
- Follow domain-driven structure

### Commit Guidelines

```bash
# Good commit messages
feat(research): add article filtering by date
fix(storage): resolve backup path resolution
docs(readme): update build instructions
refactor(core): split storage.rs into modules

# Bad commit messages
update stuff
fix bug
wip
```

**Format**: `type(scope): description`

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Make changes following code style
4. Test thoroughly (build + manual testing)
5. Commit with descriptive messages
6. Push to your fork
7. Open Pull Request with description

### Testing Checklist

- [ ] Backend compiles: `cargo build --release`
- [ ] Frontend builds: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No Clippy warnings: `cargo clippy`
- [ ] App runs: `cargo tauri dev`
- [ ] Feature works as expected
- [ ] No console errors

## 📄 License

[Add your license here - MIT, Apache 2.0, etc.]

## 🙏 Acknowledgments

Built with amazing open-source projects:

### Backend
- [Tauri](https://tauri.app/) - Rust-powered desktop framework
- [SeaORM](https://www.sea-ql.org/SeaORM/) - Async ORM for Rust
- [tokio](https://tokio.rs/) - Async runtime
- [tokio-cron-scheduler](https://github.com/mvniekerk/tokio-cron-scheduler) - Cron scheduling
- [tracing](https://github.com/tokio-rs/tracing) - Structured logging

### Frontend
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tooling
- [TanStack Query](https://tanstack.com/query/) - Data fetching
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Sonner](https://sonner.emilkowal.ski/) - Toast notifications

### Special Thanks
- NewsData.io for news API
- The Tauri community for excellent documentation
- All contributors and testers

## Project Status

**Current Version**: 0.2.0 (December 2025)  
**Status**: Active Development

### What's Working ✅
- ✅ **Writing Mode**: Full markdown editor, ideas library, archive
- ✅ **Research Mode**: News feed, article management, source syncing
- ✅ **System Mode**: Settings, storage management, logs viewer, tasks scheduler (100% complete)
- ✅ **Security**: Encrypted API keys, sanitized logs, input validation
- ✅ **Performance**: Optimized queries, indexed database, code-split bundles
- ✅ **Code Quality**: Domain-driven architecture, structured logging, comprehensive error handling
- ✅ **Task Scheduler**: Full execution history tracking, manual triggering, comprehensive logging

### In Progress 🔄
- 🔄 **Modular Refactoring**: Splitting large files into focused modules (Phase 1a complete)
- 🔄 **Integration Testing**: System-wide testing of all features

### Completed Recently ✨
- ✨ **Tasks View Complete** (Dec 14): Scheduler management, execution history tracking, comprehensive logging
- ✨ **System Mode 100% Complete** (Dec 14): All four views fully functional
- ✨ **Modular Refactoring Phase 1a** (Dec 13): Research domain entities organized
- ✨ **System Mode Integration** (Dec 12-13): Settings, Storage, Logs fully functional
- ✨ **Backend Refactoring** (Dec 12): Domain-driven architecture, 48% reduction in main.rs
- ✨ **Security Fix** (Dec 12): API key sanitization in all logs
- ✨ **Frontend Optimization** (Dec 9-12): Bundle size reduced by 54%, zero vulnerabilities
- ✨ **Backend Modernization** (Dec 9-12): Package updates, performance indexes, column optimization

### Roadmap

See [TODO.md](TODO.md) for current tasks and [ROADMAP.md](./docs/ROADMAP.md) for long-term planning.

## 📚 Documentation

- **[TODO.md](TODO.md)** - Current sprint tasks and active work
- **[DONE.md](./docs/DONE.md)** - Completed work archive
- **[ROADMAP.md](./docs/ROADMAP.md)** - Long-term planning and future features
- **[REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md)** - Backend refactoring notes

## 📞 Support

- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

**Made with ❤️ for content creators and researchers**

*Last Updated: December 14, 2025*
