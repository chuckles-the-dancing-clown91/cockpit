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

```
cockpit/
├── backend/
│   ├── src/
│   │   ├── main.rs              # Application entry point
│   │   ├── config.rs            # Configuration management
│   │   ├── crypto.rs            # API key encryption
│   │   ├── db.rs                # Database connection & entities
│   │   ├── errors.rs            # Error handling
│   │   ├── logging.rs           # Structured logging
│   │   ├── scheduler.rs         # Cron scheduler
│   │   ├── news.rs              # News sync logic
│   │   ├── news_articles.rs     # Article CRUD operations
│   │   ├── news_settings.rs     # News configuration
│   │   ├── news_sources.rs      # Source management
│   │   ├── ideas.rs             # Idea management
│   │   ├── system_tasks.rs      # Task definitions
│   │   └── system_task_runs.rs  # Task execution tracking
│   ├── storage/
│   │   ├── data/db.sql         # SQLite database
│   │   └── logs/               # Application logs
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── navigation/      # TopNav, SideNav, ModeContext
│   │   │   ├── writing/         # Writing mode views
│   │   │   ├── research/        # Research mode views
│   │   │   ├── system/          # System mode views
│   │   │   ├── news/            # News-specific components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── layout/          # Layout components
│   │   ├── hooks/               # React hooks
│   │   ├── theme/               # Theme system
│   │   ├── vendor/              # Custom MDEditor
│   │   ├── views/               # Legacy views (to be removed)
│   │   ├── App.tsx              # Main application
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Global styles
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
