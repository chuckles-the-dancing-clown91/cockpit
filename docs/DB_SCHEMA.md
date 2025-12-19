# Database Schema (SQLite)

Cockpit uses a single local SQLite database accessed via **SeaORM**.

- Migrations live in `backend/migration`
- Migrations run automatically at app startup (`backend/src/core/components/db/migrations.rs`)
- You can override the DB path with `DB_URL` (defaults to app-data `cockpit.db`)

This file is a **human summary**. The migrations are the source of truth.

## Core tables

### `ideas`

Represents an idea / seed. Key fields (see `m001_initial_schema`):

- `id` (TEXT, PK)
- `title`, `description`
- `status` (e.g. backlog / in_progress / archived)
- `priority` (low / medium / high)
- `created_at`, `updated_at`

> Note: `ideas` currently contains some legacy “embedded article” fields (`article_title`, `article_content`, etc.). Writing is being separated into the `writings` feature.

### `references`

Saved links / citations. Key fields (see `m005_idea_references`):

- `id` (TEXT, PK)
- `title`, `url`, `notes`
- `created_at`, `updated_at`

### `idea_references`

Many-to-many link between ideas and references.

- `idea_id` -> `ideas.id`
- `reference_id` -> `references.id`
- composite PK (`idea_id`, `reference_id`)

### `notes`

Rich notes entity used by the knowledge graph. Fields vary by migration; notable constraints:

- Unique constraint on `(entity_type, entity_id, note_type)` added in `m007_notes_unique_main`

## Writing + knowledge graph

Writing was introduced in `m006_writing_knowledge_graph`.

### `writings`

Represents a single writing asset (article, book chapter, etc.). Key fields:

- `id` (TEXT, PK)
- `title`, `subtitle`
- `type` (e.g. `article`, `book`, `chapter` — enforced by app, not DB)
- `content_html`
- `content_markdown` (often used to store TipTap JSON as a string — see `backend/src/writing/service.rs`)
- `status`, `word_count`, `version` (integer)
- timestamps

### `writing_idea_links`

Many-to-many link between writings and ideas.

- `writing_id` -> `writings.id`
- `idea_id` -> `ideas.id`
- composite PK (`writing_id`, `idea_id`)

## System + other tables

The initial schema also includes system/support tables (news items, scheduled tasks, etc.). If a UI surface is not currently exposed, the schema may still exist.

## Making schema changes

1. Add a new migration in `backend/migration/src/` (see `docs/Backend_Development.md`).
2. Register it in `backend/migration/src/lib.rs`.
3. Run the app — migrations auto-apply on startup (or run the migration CLI manually).
