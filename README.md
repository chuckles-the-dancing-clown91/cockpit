# Cockpit

> A modern desktop productivity suite for content creators, researchers, and digital architects.

[![Tauri](https://img.shields.io/badge/Tauri-2.5.3-blue)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

Built with **Tauri 2.5** (Rust backend) + **React 19** (TypeScript frontend), Cockpit provides a unified workspace for writing, research, and system management.

## 🎯 Overview

Cockpit is organized into three specialized modes:

- **📝 Writing Mode**: Rich text editor with TipTap, polymorphic notes system, idea management, references with embedded browser, and archive
- **📰 Research Mode**: News aggregation, article management, source configuration, and feed plugins (NewsData.io)
- **⚙️ System Mode**: Settings, database management, logs viewer, and task scheduler

### 🌟 Key Features

- **Polymorphic Notes**: Rich text notes on any entity (ideas/references/writings) with TipTap editor
- **Embedded Webview**: Real browser integration with text selection → add to notes workflow
- **Knowledge Graph**: Many-to-many relationships between ideas ↔ references ↔ writings
- **Plugin Architecture**: Extensible feed sources (NewsData.io, future: RSS, Reddit, etc.)
- **Type-Safe**: Full TypeScript + Rust with shared type definitions
- **Offline-First**: SQLite database with encrypted settings storage

## Tech stack

- **Desktop:** Tauri 2.x
- **Backend:** Rust, SeaORM, SQLite, Tokio
- **Migrations:** `backend/migration` (SeaORM Migration crate) — **no raw SQL migration files**
- **Frontend:** React 19, TypeScript, Vite
- **UI:** Radix Themes + Radix Primitives
- **Data fetching:** TanStack Query (React Query)


## 🚀 Quick Start

### Prereqs

- Rust (stable) + `cargo`
- Node.js (LTS recommended)
- Tauri prerequisites for your OS (WebView2 on Windows, etc.)

### Install frontend deps

```bash
cd frontend
npm install
```

### Run in dev (Tauri)

```bash
cd backend
cargo tauri dev
```

#### Important: `tauri.conf.json` path

`backend/tauri.conf.json` contains `build.beforeDevCommand` / `beforeBuildCommand`. Ensure these commands use **relative** paths (not a machine-specific absolute path), e.g.:

```json
"beforeDevCommand": "npm --prefix ../frontend run dev"
```

## Database + migrations

- Cockpit uses **SQLite**.
- On startup, the backend runs **SeaORM migrations automatically**.
- You can override the DB location via `DB_URL` (SQLite URL).

If you need to create a migration:

```bash
cd backend/migration
cargo run -- generate <name>
```

Then add your migration to `migration/src/lib.rs` (the `Migrator` list).

## Documentation

Start here:

- `docs/Frontend_Development.md`
- `docs/Backend_Development.md`
- `docs/ARCHITECTURE.md`
- `docs/DB_SCHEMA.md`
- `docs/TAURI_COMMANDS.md`
- `docs/TROUBLESHOOTING.md`

## Development rules (to prevent Copilot drift)

- **Do not add new code under `frontend/src/domains/`**.
- Prefer **feature modules** (`frontend/src/features/<feature>/...`).
- Reuse existing components/hooks before creating new versions.
- Any new backend capability = **1 command + 1 service function + DTOs** (keep layers clean).
- Any schema change = **SeaORM migration** (never raw `.sql` files).
- 

---

If you’re working with an AI assistant/Copilot, read: `docs/AI_ASSISTANT_RULES.md`.

## ✨ Features

### Writing Mode
- **Advanced Markdown Editor**: 13 toolbar actions, live preview, LaTeX/math support
- **Ideas Library**: Capture and organize ideas with priority levels
- **Archive**: View and restore previously saved content
- **Writing Stats**: Real-time word count, reading time, paragraph tracking

### Research Mode
- **Feed Sources**: Plugin-based feed aggregation system with unified management
  - NewsData.io plugin for news articles
  - Per-source API key management (encrypted)
  - Individual sync schedules with cron expressions
  - Test connections, sync on-demand, or auto-sync via scheduler
  - Health monitoring with error tracking and rate limit warnings
- **Stream View**: Unified article feed from all sources (coming soon)
- **Reddit Integration**: Monitor subreddits, manage mod queue (coming soon)

### System Mode
- **Settings**: App preferences, API keys (encrypted), logging configuration
- **Storage**: Database stats, backups, export/import, automated cleanup
- **Logs**: Multi-filter log viewer (level, module, date), export functionality
- **Task Scheduler**: Cron-based job system with execution history

## 🛠️ Tech Stack

### Backend (Rust)
- **Tauri 2.5.3** - Desktop application framework
- **SeaORM 1.1** - Async ORM for SQLite
- **Tokio** - Async runtime
- **Tokio-Cron-Scheduler** - Job scheduling
- **Argon2** - Password hashing
- **AES-GCM** - Encryption for sensitive data

### Frontend (React/TypeScript)
- **React 19** - UI framework
- **TypeScript 5** - Type safety
- **TanStack Query** - Data fetching and caching
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool and dev server

## 📁 Project Structure

```
cockpit/
├── backend/              # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs      # Entry point, Tauri setup
│   │   ├── core/        # Infrastructure (db, config, logging)
│   │   ├── writing/     # Ideas & content management
│   │   ├── research/    # Feed plugins & article aggregation
│   │   │   └── feed/    # Feed system (plugin trait, sources, sync)
│   │   ├── system/      # Scheduler & system tasks
│   │   └── util/        # Cross-domain utilities
│   ├── storage/         # Runtime data (db, logs, backups)
│   ├── migrations/      # SQL migration files
│   ├── icons/           # App icons (multiple sizes)
│   └── tauri.conf.json  # Tauri configuration
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components by domain
│   │   ├── hooks/       # React hooks (queries, mutations)
│   │   ├── views/       # Page components
│   │   └── lib/         # Utilities
│   └── dist/            # Production build output
│
├── docs/                # Documentation
│   ├── BUILD_GUIDE.md
│   ├── DEPLOYMENT.md
│   ├── ICON_TROUBLESHOOTING.md
│   └── archive/         # Historical docs
│
├── build/               # Build artifacts
│   └── target/release/bundle/  # .deb and .rpm packages
│
└── dist/                # Distribution packages
```

## ⚙️ Configuration

### Environment Variables

Create `backend/.env`:

```bash
# Database (use ABSOLUTE paths)
DATABASE_URL=sqlite:/absolute/path/to/cockpit/backend/storage/data/db.sql
DB_MAX_CONNECTIONS=5

# Logging
LOG_LEVEL=info
LOG_JSON=true
LOGS_DIR=/absolute/path/to/cockpit/backend/storage/logs

# API Keys
NEWSDATA_API_KEY=your_api_key_here

# Storage
STORAGE_ROOT=/absolute/path/to/cockpit/backend/storage
STORAGE_MAX_SIZE_GB=50

# Encryption (64 hex characters - generate with: openssl rand -hex 32)
COCKPIT_MASTER_KEY=your_64_character_hex_key_here
```

**⚠️ Critical:**
- Always use **absolute paths**
- `COCKPIT_MASTER_KEY` must be exactly **64 hex characters**
- Backup your `.env` file - lost keys = inaccessible encrypted data

## 🔨 Development

### Running Development Server

```bash
cd backend
cargo tauri dev
```

This starts:
- Rust backend with hot-reload
- React frontend on `http://localhost:5173`
- Native window automatically opens

### Building for Production

```bash
cd backend
cargo tauri build
```

Creates packages in `build/target/release/bundle/`:
- `deb/Cockpit_0.1.0_amd64.deb` (Debian/Ubuntu)
- `rpm/Cockpit-0.1.0-1.x86_64.rpm` (Fedora/RHEL)

See [BUILD_GUIDE.md](docs/BUILD_GUIDE.md) for detailed build instructions.

### Architecture

**Domain-Driven Structure:**
- Each domain (`writing`, `research`, `system`) owns its business logic
- `commands.rs` - Thin Tauri command wrappers
- `components/` - Business logic (pure Rust functions)
- `core/` - Shared infrastructure (database, config, logging)

**Frontend Pattern:**
- TanStack Query for all backend calls
- Hooks encapsulate queries and mutations
- Components stay simple and focused

## 🧪 Testing

```bash
# Run all tests
cd backend
cargo test

# Run with output
cargo test -- --nocapture

# Test specific module
cargo test core::
```

## 📚 Documentation

### Project Management
- **[TODO.md](TODO.md)** - Current sprint tasks
- **[DONE.md](docs/DONE.md)** - Completed work archive
- **[ROADMAP.md](docs/ROADMAP.md)** - Long-term planning

## 🐛 Common Issues

**Icons don't show (COSMIC desktop):**
```bash
killall -9 cosmic-launcher cosmic-panel
# Or log out and back in
```

**"Database is locked":**
Close other running instances of the app.

**Build fails:**
```bash
cd backend
cargo clean
cargo tauri build
```

See [ICON_TROUBLESHOOTING.md](docs/ICON_TROUBLESHOOTING.md) for detailed troubleshooting.

## 🔒 Security

- **Encrypted API Keys**: Stored using AES-256-GCM encryption
- **Restricted Permissions**: No filesystem, network, or shell access by default
- **CSP**: Content Security Policy prevents XSS attacks
- **Sandboxed Frontend**: Isolated from system resources

See [PERMISSIONS.md](docs/PERMISSIONS.md) for complete security documentation.

## 📦 Data Management

### Storage Locations

**Production (after install):**
```
~/.cockpit/
  ├── data/db.sql       # SQLite database
  ├── logs/             # Application logs
  ├── backups/          # Database backups
  └── exports/          # Data exports
```

### Backups

The app automatically creates backups:
- On-demand via Storage View
- Before migrations
- Configurable retention

Restore from backup via: **System → Storage → Restore Backup**

## 🚦 Project Status

**Current Version:** 0.1.0 (Alpha)

**Working:**
- ✅ Writing mode with markdown editor and ideas management
- ✅ Research mode with news aggregation
- ✅ System settings and configuration
- ✅ Database management and backups
- ✅ Log viewer with filtering
- ✅ Task scheduler with cron expressions
- ✅ Encrypted API key storage

**In Progress:**
- 📝 Feed plugin system expansion (Reddit, RSS, Twitter)
- 📝 Stream view for unified article reading
- 📝 Enhanced article filtering and search

**Planned:**
- 🔜 Cloud sync capabilities
- 🔜 Custom themes
- 🔜 Export/import enhancements

See [ROADMAP.md](docs/ROADMAP.md) for detailed planning.

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Contact

- Issues: [GitHub Issues](https://github.com/yourusername/cockpit/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/cockpit/discussions)

---

**Built with ❤️ using Rust and React**
