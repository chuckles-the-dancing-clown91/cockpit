# Migration Refactor Plan: SeaORM Migration + SeaQuery

## Current State
Migrations 001-006 use **raw SQL strings** which ties us to SQLite-specific syntax. This limits database portability.

## Problem
- Raw SQL strings in `migrations.rs`
- SQLite-specific features (e.g., `AUTOINCREMENT`, `PRAGMA`, type handling)
- No compile-time validation of SQL
- Hard to maintain consistency with entities
- Difficult to support PostgreSQL later

## Solution: SeaORM Migration Framework
Use Rust code + SeaQuery to define schema changes:
- **Type-safe**: Compile-time checking
- **Database-agnostic**: SeaQuery generates correct SQL per DB
- **Maintainable**: Same patterns as entities
- **Portable**: SQLite dev → PostgreSQL production

## Migration Patterns

### Current Pattern (Raw SQL)
```rust
Migration {
    version: 1,
    name: "initial_schema",
    up: "CREATE TABLE ideas (...)",
    down: "DROP TABLE ideas"
}
```

### Target Pattern (SeaORM Migration)
```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Ideas::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Ideas::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key()
                    )
                    .col(ColumnDef::new(Ideas::Title).string().not_null())
                    .col(ColumnDef::new(Ideas::Status).string().not_null())
                    .col(ColumnDef::new(Ideas::CreatedAt).timestamp().not_null())
                    // ... rest of columns
                    .to_owned()
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Ideas::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Ideas {
    Table,
    Id,
    Title,
    Status,
    CreatedAt,
}
```

## Portability Guidelines

### ✅ Use These Patterns
```rust
// Integers (portable: SQLite INTEGER, Postgres BIGINT)
.col(ColumnDef::new(Column::Id).big_integer().auto_increment().primary_key())

// Strings (portable: SQLite TEXT, Postgres VARCHAR)
.col(ColumnDef::new(Column::Title).string().not_null())
.col(ColumnDef::new(Column::Status).string_len(32).not_null())

// JSON (store as TEXT string, parse in Rust)
.col(ColumnDef::new(Column::Tags).text())
.col(ColumnDef::new(Column::Metadata).text())

// Timestamps (portable: ISO8601 string or native timestamp)
.col(ColumnDef::new(Column::CreatedAt).timestamp().not_null())

// Enums (store as TEXT strings: "draft", "in_progress")
.col(ColumnDef::new(Column::Status).string_len(32).not_null())

// Foreign Keys
.foreign_key(
    ForeignKey::create()
        .name("fk_idea_news_article")
        .from(Ideas::Table, Ideas::NewsArticleId)
        .to(Articles::Table, Articles::Id)
        .on_delete(ForeignKeyAction::SetNull)
)

// Indexes
.index(
    Index::create()
        .name("idx_ideas_status")
        .table(Ideas::Table)
        .col(Ideas::Status)
)
```

### ❌ Avoid These (SQLite-specific)
```rust
// ❌ Raw SQL - not portable
manager.execute_statement(...raw SQL...)

// ❌ SQLite-specific: AUTOINCREMENT (use auto_increment() instead)
"CREATE TABLE ideas (id INTEGER PRIMARY KEY AUTOINCREMENT)"

// ❌ SQLite-specific: FTS (full-text search)
"CREATE VIRTUAL TABLE search USING fts5(content)"

// ❌ SQLite-specific: Partial indexes with WHERE clause
"CREATE INDEX idx_active ON ideas(status) WHERE status = 'active'"

// ❌ DB-specific types - use generic types
ColumnDef::new(Column::Data).json_binary() // Postgres-specific
```

### 🔄 Migration Strategy: Use TEXT for Portability
```rust
// Store enums as TEXT strings
#[derive(DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum IdeaStatus {
    #[sea_orm(string_value = "draft")]
    Draft,
    #[sea_orm(string_value = "in_progress")]
    InProgress,
}

// Store JSON as TEXT
.col(ColumnDef::new(Column::Tags).text())
// Rust side: serde_json::to_string() / from_str()

// Store booleans as INTEGER (0/1)
.col(ColumnDef::new(Column::IsPinned).integer().not_null().default(0))
```

## Migration Refactor Plan

### Phase 1: Setup SeaORM Migration (1 hour)
1. Add `sea-orm-migration` dependency to `Cargo.toml`
2. Create `backend/migration/` directory structure
3. Create `backend/migration/src/lib.rs` with `Migrator`
4. Create `backend/migration/Cargo.toml`

### Phase 2: Convert Migrations 001-006 (4-5 hours)
Convert each migration file:
- **001_initial_schema** - Ideas, articles, feeds, sources tables
- **002_app_settings** - Settings table
- **003_performance_indexes** - Indexes on existing tables
- **004_feed_sources** - Feed source improvements
- **005_idea_references** - Idea references linking
- **006_writing_knowledge_graph** - Knowledge graph (5 tables)

### Phase 3: Update Migration Runner (1 hour)
1. Update `backend/src/core/components/db/migrations.rs`
2. Replace raw SQL runner with SeaORM Migrator
3. Keep version tracking in `_migrations` table
4. Test migration apply/rollback

### Phase 4: Testing (1-2 hours)
1. Test fresh database creation
2. Test migration rollback
3. Test PostgreSQL compatibility (Docker)
4. Verify all 6 migrations apply cleanly

## File Structure After Refactor
```
backend/
├── migration/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs          # Migrator registration
│   │   ├── m001_initial_schema.rs
│   │   ├── m002_app_settings.rs
│   │   ├── m003_performance_indexes.rs
│   │   ├── m004_feed_sources.rs
│   │   ├── m005_idea_references.rs
│   │   └── m006_writing_knowledge_graph.rs
│   └── README.md
└── src/
    └── core/components/db/
        └── migrations.rs   # Updated to use Migrator
```

## Benefits
1. **Type Safety**: Compile-time validation of schema
2. **Portability**: Same code generates SQLite/PostgreSQL SQL
3. **Consistency**: Migrations match entity definitions
4. **Maintainability**: Rust patterns, not string concatenation
5. **Documentation**: Self-documenting with Rust types
6. **Tooling**: IDE autocomplete, refactoring support

## Timeline
- **Estimated Effort**: 6-9 hours total
- **Priority**: P2 (after handlers/commands are working)
- **Benefit**: Long-term scalability (SQLite → PostgreSQL)
- **Risk**: Low (migrations already tested, just rewriting format)

## Example: Migration 006 Refactor

### Before (Raw SQL)
```sql
-- 006_writing_knowledge_graph_up.sql (203 lines)
CREATE TABLE reference_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_type TEXT NOT NULL CHECK(reference_type IN ('news_article', 'url', ...)),
    news_article_id INTEGER,
    title TEXT NOT NULL,
    ...
);
```

### After (SeaORM Migration)
```rust
// m006_writing_knowledge_graph.rs (~150 lines)
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Reference Items
        manager.create_table(
            Table::create()
                .table(ReferenceItems::Table)
                .col(ColumnDef::new(ReferenceItems::Id).big_integer().auto_increment().primary_key())
                .col(ColumnDef::new(ReferenceItems::ReferenceType).string_len(32).not_null())
                .col(ColumnDef::new(ReferenceItems::NewsArticleId).big_integer())
                .col(ColumnDef::new(ReferenceItems::Title).string().not_null())
                // ... rest of columns
                .foreign_key(ForeignKey::create()
                    .from(ReferenceItems::Table, ReferenceItems::NewsArticleId)
                    .to(Articles::Table, Articles::Id)
                    .on_delete(ForeignKeyAction::SetNull))
                .to_owned()
        ).await?;

        // Create index
        manager.create_index(
            Index::create()
                .name("idx_reference_items_type_url")
                .table(ReferenceItems::Table)
                .col(ReferenceItems::ReferenceType)
                .col(ReferenceItems::Url)
                .unique()
                .to_owned()
        ).await?;

        // ... rest of tables
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(ReferenceItems::Table).to_owned()).await?;
        // ... rest of drops
        Ok(())
    }
}

#[derive(DeriveIden)]
enum ReferenceItems {
    Table,
    Id,
    ReferenceType,
    NewsArticleId,
    Title,
    Url,
    // ...
}
```

## Next Steps
1. ✅ Complete entity creation (DONE)
2. ⏳ Create handlers for new tables (IN PROGRESS)
3. ⏳ Register Tauri commands
4. 🔜 Refactor migrations to SeaORM Migration (THIS DOCUMENT)

## References
- [SeaORM Migration Docs](https://www.sea-ql.org/SeaORM/docs/migration/setting-up-migration/)
- [SeaQuery API](https://docs.rs/sea-query/latest/sea_query/)
- [Migration Examples](https://github.com/SeaQL/sea-orm/tree/master/examples)
