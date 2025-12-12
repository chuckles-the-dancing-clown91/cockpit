# Architect Cockpit

Modern desktop application for content creation, research, and system management. Built with Tauri 2.5, Rust backend, and React 19 frontend with mode-based navigation.

## Overview

Architect Cockpit is a productivity tool organized into three modes:
- **Writing Mode**: Content creation with markdown editor, idea management, and writing statistics
- **Research Mode**: News aggregation, Reddit monitoring, and source management  
- **System Mode**: Settings, storage management, logs, and scheduled tasks

## Project Structure
```
cockpit/
├── backend/              # Rust + Tauri 2.5 backend
│   ├── src/             # Core backend logic
│   │   ├── config.rs    # Type-safe configuration
│   │   ├── crypto.rs    # API key encryption
│   │   ├── db.rs        # SQLite + SeaORM
│   │   ├── errors.rs    # Comprehensive error handling
│   │   ├── logging.rs   # Structured logging with rotation
│   │   ├── scheduler.rs # Cron-based task scheduler
│   │   └── news*.rs     # News sync & management
│   ├── storage/         # SQLite DB and logs
│   └── tauri.conf.json  # Tauri configuration
├── frontend/            # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── navigation/   # TopNav, SideNav, ModeContext
│   │   │   ├── writing/      # Writing mode components
│   │   │   ├── research/     # Research mode components
│   │   │   ├── ui/           # Radix UI components
│   │   │   └── news/         # News feed components
│   │   ├── vendor/           # Custom MDEditor
│   │   ├── theme/            # Theme system (dark/cyberpunk/light)
│   │   ├── hooks/            # TanStack Query hooks
│   │   └── LAYOUT_GUIDE.md  # Layout patterns documentation
│   ├── THEME_LAYOUT_CLEANUP.md
│   └── package.json
├── NAVIGATION_REFACTOR.md    # Navigation refactor plan & progress
└── README.md                 # This file
```

## Tech Stack

### Backend
- **Rust** - Systems programming language
- **Tauri 2.5.3** - Cross-platform desktop framework
- **SeaORM 0.12.15** - Database ORM with SQLite
- **tokio-cron-scheduler** - Background task scheduling
- **tracing** - Structured logging with rotation

### Frontend
- **React 19** - UI framework
- **Vite 5.4.21** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **TanStack Query** - Data fetching and caching
- **Radix UI** - Headless UI components
- **Tailwind CSS** - Utility-first styling
- **Custom MDEditor** - Markdown editor with LaTeX support

## Prerequisites
- **Rust** 1.70+ (stable toolchain)
- **Node.js** 18+ with npm
- **Tauri Dependencies** (platform-specific)
  - Linux: `webkit2gtk`, `libappindicator`, `librsvg`
  - macOS: Xcode Command Line Tools
  - Windows: WebView2

## Setup

### 1. Install Dependencies
```bash
# Frontend dependencies
cd frontend && npm install

# Backend builds automatically with Tauri
```

### 2. Environment Configuration
Create a `.env` file in the project root (optional):
```bash
DATABASE_URL=sqlite://backend/storage/data/db.sql
NEWSDATA_API_KEY=your-newsdata-api-key-here
```

### 3. Run Development Server
```bash
# From the frontend directory
cd frontend
npm run dev

# Tauri will start automatically and launch the app
```

The app will open in a native window. Frontend dev server runs on `localhost:5173`.

## Development

### Directory Commands
```bash
# Frontend development
cd frontend
npm run dev          # Start Vite dev server + Tauri
npm run build        # Build frontend assets
npm run preview      # Preview production build

# Backend development (from frontend dir)
cd ../backend
cargo build          # Build backend
cargo test           # Run tests
cargo run            # Run backend standalone
```

### Storage Locations
- **Database**: `backend/storage/data/db.sql`
- **Logs**: `backend/storage/logs/`
  - `app.log` - Application logs
  - `errors.log` - Error logs
  - `api_calls.log` - API call tracking

## Features

### ✍️ Writing Mode
- **Markdown Editor**: Custom editor with 13 toolbar buttons (Bold, Italic, Headers, Lists, Code, LaTeX, Images)
- **Live Preview**: Side-by-side editing with rendered markdown
- **Writing Statistics**: Real-time word count, character count, reading time, paragraph count
- **Idea Management**: Organize ideas by status (In Progress, Stalled, Complete)
- **Archive**: Store completed work

### 📰 Research Mode
- **News Feed**: Aggregated news from multiple sources via NewsData API
- **Mixed Feed**: Calendar events, ideas, and news in one unified view
- **Reddit Integration**: Monitor subreddits, manage posts and queues (placeholder)
- **Source Management**: Enable/disable news sources, track article stats (placeholder)
- **Scheduled Sync**: Automatic news and source updates via cron

### ⚙️ System Mode (Coming Soon)
- **Settings**: App configuration, API key management, theme preferences
- **Storage**: Database management, backups, export/import
- **Logs**: View, filter, and export application logs
- **Tasks**: Monitor scheduled jobs, manual task triggering

## Key Backend Features
- **Type-Safe Configuration**: Validated settings with sane defaults
- **Encrypted Storage**: API keys encrypted with system keyring
- **Automatic Migrations**: Database schema versioning and rollback
- **Log Rotation**: Automatic log file rotation (10MB default)
- **Task Scheduling**: Cron-based news sync and source updates
- **Error Handling**: Comprehensive error types with context

## Architecture

### Navigation System
The app uses a **mode-based navigation** pattern:
- **3 Modes**: Writing, Research, System
- **Context-Based Side Nav**: Different navigation items per mode
- **State Persistence**: Mode and view state saved to localStorage
- **No Router**: Pure React state-based navigation

### Layout System
Standardized layout patterns documented in `frontend/src/LAYOUT_GUIDE.md`:
- Height propagation with `h-full` chains
- Flexbox patterns with `flex-1 min-h-0`
- Grid layouts for multi-column views
- Utility classes: `.layout-container`, `.layout-scroll-area`, `.layout-fixed`

### Theme System
3 built-in themes (dark, cyberpunk, light) with complete CSS variable sets:
- Color variables for all UI elements
- Consistent shadows and borders
- Smooth transitions between themes
- Theme persistence across sessions

## Building for Production

### Development Build
```bash
cd frontend
npm run build
```

### Tauri Bundle
```bash
# Build for current platform (from frontend dir)
npm run tauri build

# Creates platform-specific bundles in backend/target/release/
```

### Platform-Specific Builds
- **Linux**: `.deb`, `.AppImage`
- **macOS**: `.app`, `.dmg`
- **Windows**: `.exe`, `.msi`

## Common Tauri Commands

### Writing
- `create_idea`, `update_idea`, `delete_idea`
- `list_article_ideas` (with filters)
- `update_idea_article` (save markdown content)

### News & Research
- `get_news_settings`, `save_news_settings`
- `list_news_articles` (paginated, filterable)
- `sync_news_now`, `sync_news_sources_now`
- `toggle_star_news_article`, `dismiss_news_article`
- `list_news_sources`

### System
- `get_system_user`
- `list_scheduled_jobs`
- `sync_calendar` (calendar integration)
- Database and log management (coming soon)

## Troubleshooting

### Frontend Issues
- **Build errors**: Check `npm run build` output
- **Type errors**: Ensure all imports are correct
- **Layout issues**: Reference `frontend/src/LAYOUT_GUIDE.md`
- **Theme issues**: Check `frontend/src/theme/tokens.css` for missing variables

### Backend Issues
- **Database errors**: Check `backend/storage/logs/errors.log`
- **API failures**: Check `backend/storage/logs/api_calls.log`
- **Task scheduling**: Check scheduled jobs in system logs

### Common Fixes
```bash
# Clear frontend cache
cd frontend
rm -rf node_modules dist
npm install

# Reset database (caution: deletes data)
rm backend/storage/data/db.sql

# Clear logs
rm backend/storage/logs/*.log
```

## Documentation

- **NAVIGATION_REFACTOR.md**: Navigation system architecture and progress
- **frontend/src/LAYOUT_GUIDE.md**: Layout patterns and best practices
- **frontend/THEME_LAYOUT_CLEANUP.md**: Theme system cleanup summary
- **currenProgress.md**: Foundation implementation progress

## Contributing

When adding new features:
1. Follow the mode-based navigation pattern
2. Use standardized layout utilities from LAYOUT_GUIDE.md
3. Ensure all CSS variables exist across themes
4. Test in all three themes (dark/cyberpunk/light)
5. Update documentation as needed

## License

[Add your license here]
