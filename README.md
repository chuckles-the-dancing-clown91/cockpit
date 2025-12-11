# Cockpit

Lightweight Tauri desktop app that pairs a Rust backend with a React/Vite frontend. It pulls and manages news content from NewsData, schedules recurring sync jobs, and exposes a small UI for browsing, filtering, and starring articles.

## Project layout
- `backend/` — Rust + Tauri backend, SQLite persistence, system task scheduler, NewsData sync + source sync, and Tauri commands for the frontend.
- `frontend/` — React 19 + Vite app with Radix UI components and TanStack Query.
- `storage/` — SQLite DBs and logs (`backend/storage/data/db.sql`, `backend/storage/logs/`).

## Prerequisites
- Rust toolchain (stable) and Cargo.
- Node.js 18+ with npm/pnpm/yarn.
- Optional: `NEWSDATA_API_KEY` in `.env` to hydrate the news API key on first run.

## Setup
1) Install deps  
`cd frontend && npm install`

2) Provide env (example) in `.env` or shell:  
```
DATABASE_URL=sqlite://backend/storage/data/db.sql
NEWSDATA_API_KEY=your-key-here
```

## Running locally
- Backend (Tauri core + commands):  
`cd backend && cargo run`

- Frontend (Vite dev server):  
`cd frontend && npm run dev`

Backend writes logs to `backend/storage/logs/` (e.g., `app.log`, `calls.log`). SQLite is persisted at `backend/storage/data/db.sql`.

## News features
- Scheduled tasks:
  - `news_sync` (pull articles, honor filters, rate limits, pruning).
  - `news_sources_sync` (refresh available sources/domains).
- Settings: language, countries, query, title keywords, date range, max stored/articles, call caps, and domain/source selection.
- Article actions: star/unstar, dismiss, basic search and pagination in the UI.

## Common commands (Tauri)
- `get_news_settings`, `save_news_settings`
- `list_news_articles`, `dismiss_news_article`, `toggle_star_news_article`
- `sync_news_now`, `sync_news_sources_now`
- `list_news_sources`

## Building
- Frontend prod build: `cd frontend && npm run build`
- Tauri bundle (when packaging): `cargo tauri build` (from `backend/`, ensure frontend assets are built or pointed to).

## Logs & troubleshooting
- API call previews: `backend/storage/logs/calls.log`
- App/runtime logs: `backend/storage/logs/app.log`
- Ensure sources are synced (UI “Sync providers”) so domains appear in settings; domain filters map to NewsData `domain` param during sync.
