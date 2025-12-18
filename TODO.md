# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🔥 TOP PRIORITY: Complete Knowledge Graph Schema (December 17-18, 2025)

**Status**: 🚧 Migration 006 Applied, Backend Handlers In Progress  
**Goal**: Implement many-to-many knowledge graph for Ideas ↔ References ↔ Writings  
**Timeline**: 2 days for backend handlers + frontend integration

---

## 🚧 Day 2: Writing Knowledge Graph (Schema) - December 18, 2025

**Status**: In Progress  
**Goal**: Implement many-to-many knowledge graph for Ideas ↔ References ↔ Writings

### Migration 006: Core Tables (5 New Tables) ✅ APPLIED

**Status**: Migration successfully applied at ~/.cockpit/data/db.sql  
**Note**: Table renamed from `references` to `reference_items` (references is SQL reserved keyword)

#### 1. ✅ `reference_items` - Unified source table
- **Purpose**: One canonical place for all external sources
- **Types**: news_article, url, tweet, paper, book, pdf, manual
- **Key Features**:
  - Links to cached `news_articles` when applicable
  - UNIQUE(reference_type, url) prevents duplicates
  - One reference → many ideas, many writings
- **Fields**: id, reference_type, title, url, source, author, published_at, news_article_id, metadata, timestamps

#### 2. ✅ `writings` - Your outputs (articles/chapters/books)
- **Purpose**: All content you write (replaces article_markdown in ideas)
- **Types**: article (MVP), chapter, book (Phase 2)
- **Key Features**:
  - Unique slug for SEO
  - Status workflow: draft → in_progress → review → published → archived
  - Series support: series_name + series_part
- **Fields**: id, type, title, slug, content_markdown, excerpt, status, tags, word_count, series_name, series_part, timestamps, flags

#### 3. ✅ `idea_reference_links` - Idea ↔ Reference many-to-many
- **Purpose**: "Add reference to idea" action
- **Key Features**:
  - One reference supports multiple ideas
  - One idea has many references
  - Optional role classification: supporting, counter, quote, background
- **Fields**: id, idea_id, reference_id, role, sort_order, created_at

#### 4. ✅ `writing_idea_links` - Writing ↔ Idea many-to-many
- **Purpose**: "Create article from idea" or "Link idea to article"
- **Key Features**:
  - One article pulls from multiple ideas
  - One idea feeds multiple articles
  - Optional purpose: primary, secondary, mention
- **Fields**: id, writing_id, idea_id, purpose, sort_order, created_at

#### 5. ✅ `notes` - Polymorphic notes on entities
- **Purpose**: Annotations/highlights live on the entity
- **Supports**: Notes on ideas, references, writings
- **Key Features**:
  - Simple polymorphic: entity_type + entity_id
  - Optional note_type for filtering (highlight, annotation, todo)
- **Fields**: id, entity_type, entity_id, body_markdown, note_type, timestamps

### ⏳ Next Steps: Backend Handlers

#### 1. Reference Items CRUD
- [ ] Create `backend/src/writing/components/references.rs`
- [ ] Entity models for reference_items
- [ ] Commands: create_reference, get_reference, list_references, update_reference, delete_reference
- [ ] Support news_article linking
- [ ] Deduplication logic (check URL + type)

#### 2. Writings CRUD
- [ ] Create `backend/src/writing/components/writings.rs`
- [ ] Entity models for writings table
- [ ] Commands: create_writing, get_writing, list_writings, update_writing, delete_writing
- [ ] Slug generation (title → kebab-case)
- [ ] Word count calculation

#### 3. Link Management
- [ ] Create `backend/src/writing/components/links.rs`
- [ ] idea_reference_links: link_reference_to_idea, unlink_reference_from_idea, list_idea_references
- [ ] writing_idea_links: link_idea_to_writing, unlink_idea_from_writing, list_writing_ideas
- [ ] Get references for writing (through linked ideas)

#### 4. Notes CRUD
- [ ] Create `backend/src/writing/components/notes.rs`
- [ ] Polymorphic queries: get_notes(entity_type, entity_id)
- [ ] Commands: create_note, update_note, delete_note
- [ ] Filter by note_type

### Workflow Implementation

**"Add to Idea" Flow**:
1. Read article → Click "Add to Idea"
2. Create/find reference (news_article_id or URL)
3. Select/create idea(s)
4. Create `idea_reference_links` rows

**"Write Article from Idea" Flow**:
1. Idea modal → Click "Write Article"
2. Create `writings` row (status='draft')
3. Create `writing_idea_links` row
4. Open editor with sidebar showing linked ideas + all their references

**"Link Idea to Existing Article" Flow**:
1. Article editor → Click "Link Idea"
2. Search/select existing idea(s)
3. Create `writing_idea_links` rows
4. Sidebar updates with new references from linked ideas

### Phase 2 (Deferred)
- `writing_parent_links` - Book → Chapters structure
- `idea_relation` - Idea hierarchy/subtopics
- `article_revisions` - Version history
- `article_authors` - Co-author support

**Rationale**: Current model supports everything via simple series_name and flat many-to-many links. Add complexity only when actually needed.

---

## ✅ COMPLETED Features (See DONE.md for details)

- ✅ System Domain Infrastructure (Storage, Tasks, Logs fixed - Dec 17)
- ✅ Ideas Feature Complete (Hooks, Components, Views - Dec 17)
- ✅ Frontend Infrastructure (Theme, Toast, Dialog, Settings - Dec 15-17)
- ✅ Feed Management System (NewsData plugin, Stream view - Dec 15)
- ✅ Frontend Refactor Phase 1 (3-tier architecture - Dec 15)

---

## 🔧 Frontend Infrastructure Patterns

**ALWAYS USE** these established patterns:

### Core Hooks
```tsx
import { useSetting, useUpdateSetting } from '@/core/hooks/useSettings';
import { useTheme } from '@/core/providers/ThemeProvider';
import { useDialog } from '@/core/providers/DialogProvider';
import { useCurrentUser } from '@/core/hooks/useCurrentUser';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';
```

### Component Patterns
- **State Components**: `LoadingState`, `ErrorState`, `EmptyState` from `@/core/components/ui`
- **Dialogs**: Always use Radix Dialog primitives with `useDialog()` for confirmations
- **Forms**: Radix UI primitives (TextField, Select, Switch, TextArea, Button)
- **Styling**: CSS custom properties (`var(--color-surface)`, `var(--color-text-primary)`)

### TanStack Query
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.ideas.detail(id),
  queryFn: () => invoke('get_idea', { id }),
});

const mutation = useMutation({
  mutationFn: (data) => invoke('update_idea', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    toast.success('Updated');
  },
});
```

---

## 📋 Architecture Reference

**3-Tier Structure**:
- **core/** - Infrastructure (API, providers, stores, hooks, shell)
- **shared/** - Types, constants, utilities (backend-aligned)
- **features/** - Reusable UI components (dumb, props-driven)
- **domains/** - Page compositions (smart, data-fetching)

**Key Principles**:
1. Features accept props, emit events, NO data fetching
2. Domains compose features, manage state, handle queries
3. Shared types prevent backend/frontend drift
4. ALL components use Radix UI + CSS custom properties

---

## 🚀 Build Commands

**Backend**:
```bash
cd backend && cargo tauri build  # Production (NEVER use cargo build --release)
cd backend && cargo check         # Syntax check only
cd backend && cargo tauri dev     # Dev mode with hot reload
```

**Frontend**:
```bash
cd frontend && npm run build      # Production bundle
cd frontend && npm run dev        # Dev server (Vite)
```

---

## 📝 Next Sprint Priorities

1. **Knowledge Graph Backend** (Today - Dec 18)
   - Complete all CRUD handlers for references, writings, links, notes
   - Register commands in main.rs
   - Test with Tauri dev mode

2. **Knowledge Graph Frontend** (Dec 19-20)
   - Reference management UI
   - Writing editor with linked ideas
   - "Add to Idea" flow from research
   - Notes interface on entities

3. **Research Domain** (Dec 21-23)
   - Stream view improvements
   - Feed management refinements
   - Article detail modal

4. **Polish & Testing** (Dec 24-31)
   - End-to-end workflows
   - Performance optimization
   - Documentation updates
   - Bug fixes
