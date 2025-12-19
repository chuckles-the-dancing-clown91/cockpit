# Ideas Workflow Overhaul Specification

**Status**: Planned - Post Frontend Refactoring  
**Priority**: High  
**Target**: Sprint 6+  
**Last Updated**: December 16, 2025

---

## Executive Summary

Transform the Ideas system from a **single-reference** model to a **multi-reference research workflow** that supports:
- Multiple article references per idea (many-to-many)
- Reference-level notes for each source
- Manual external reference entries
- Categories + tags for organization
- Seamless feed → idea → article writing pipeline
- Multiple ideas linked to a single article being written

---

## Current State Analysis

### Existing Data Model

**Table: `ideas`**
```sql
CREATE TABLE ideas (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT NOT NULL,                  -- 'in_progress' | 'stalled' | 'complete'
    news_article_id INTEGER,               -- ❌ SINGLE REFERENCE ONLY
    target TEXT,
    tags TEXT,                             -- ✅ JSON array of strings
    notes_markdown TEXT,                   -- ❌ SINGLE NOTES FIELD
    article_title TEXT,
    article_markdown TEXT,
    date_added DATETIME NOT NULL,
    date_updated DATETIME NOT NULL,
    date_completed DATETIME,
    date_removed DATETIME,
    priority INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    FOREIGN KEY (news_article_id) REFERENCES news_articles(id) ON DELETE SET NULL
);
```

### Key Limitations

1. **One Article Per Idea**: `news_article_id` FK allows only single reference
2. **No Reference Metadata**: Can't store notes per reference
3. **No Manual References**: Must have news_article, can't add external sources
4. **Single Notes Field**: Notes are idea-level, not reference-level
5. **No Categories**: Only flat tags, no hierarchical grouping
6. **No Multi-Idea Articles**: Can't link multiple research ideas to one piece being written

### Existing Capabilities ✅

- **Tags**: Already stored as JSON `Vec<String>`
- **Status Workflow**: in_progress → stalled → complete
- **Priority & Pinning**: Numeric priority, boolean isPinned
- **Summary Field**: Separate from notes (description)
- **Atomic Transactions**: create_idea_for_article uses DB transactions
- **Query Optimization**: List excludes heavy markdown columns

---

## Target Workflow

### User Journey: Feed → Idea → References → Writing

#### 1. **Discover Article in Feed**
```
User Action: Browse StreamView → find interesting article
UI: "Add to Idea" button on each article card
```

**Flow A - Create New Idea**:
1. Click "Add to Idea" → dropdown appears
2. Select "Create new idea"
3. Modal opens: `IdeasListModal` (creation mode)
4. Pre-filled: article as first reference
5. User enters: title, category, tags, initial notes
6. Save → idea created with first reference

**Flow B - Add to Existing Idea**:
1. Click "Add to Idea" → dropdown appears
2. Select "Add to existing idea"
3. Searchable idea list appears (`AddToIdeaDialog`)
4. Select idea → article added as additional reference
5. Optional: Add reference-specific notes immediately

#### 2. **Manage Ideas Library**
```
User Action: Navigate to Writing → Ideas tab
UI: Grid/list of idea cards with hover previews
```

**Hover Interaction**:
- Hover over idea card → `IdeaHoverCard` appears (500ms delay)
- Shows: notes preview (200 chars), status, reference count
- Quick actions: change status (dropdown), click to edit

**Click Interaction**:
- Click idea card → `IdeasListModal` opens (edit mode)
- Full CRUD: title, description, category, tags, status, priority
- **References Section** (accordion):
  - List all references (article preview + notes)
  - Add new reference (search articles or manual entry)
  - Remove references
  - Reorder references (drag-drop or up/down buttons)
  - Edit notes per reference
- **Actions**:
  - "Write Article" → navigate to Editor with idea loaded
  - "Archive" → soft delete
  - "Duplicate" → copy idea + references

#### 3. **Write Article with Multi-Idea Research**
```
User Action: Ideas → click "Write Article" OR Editor → click "Link Idea"
UI: EditorView with LinkedIdeasPanel
```

**Editor State**:
- Left: Ideas sidebar (shows all ideas, selected = linked to current article)
- Center: Markdown editor
- Right: `LinkedIdeasPanel`
  - Shows all linked ideas (accordion)
  - Each idea expands → shows all references
  - Each reference shows: article preview + your notes
  - Click reference → opens article in modal
  - "Link Another Idea" button → search/select

**Example Use Case**: Writing "Baby Stats Analysis"
- Link idea #1: "Birth Rates 2024" (3 references)
- Link idea #2: "Baby Health Metrics" (5 references)
- Link idea #3: "Demographic Trends" (2 references)
- Total: 10 source articles with organized notes accessible while writing

#### 4. **Manual Reference Entry**
```
User Action: IdeasListModal → References section → "Add Reference" → "Manual Entry"
UI: Form for external sources
```

**Required Fields**:
- Title
- Source URL

**Optional Fields**:
- Body summary
- Publish date
- Author
- Notes

**Use Case**: Academic paper, book, podcast, personal research not in news feed

---

## Technical Specification

### Database Schema Changes

#### Migration 005: Idea References Junction Table

**File**: `backend/migrations/005_idea_references_up.sql`

```sql
-- Junction table for many-to-many relationship
CREATE TABLE idea_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    idea_id INTEGER NOT NULL,
    
    -- Article reference (NULL for manual entries)
    news_article_id INTEGER,
    
    -- Manual entry fields (used when news_article_id IS NULL)
    manual_title TEXT,
    manual_body_summary TEXT,
    manual_publish_date TEXT,
    manual_author TEXT,
    manual_source_url TEXT,
    
    -- Reference metadata
    notes_markdown TEXT,              -- Reference-specific research notes
    display_order INTEGER DEFAULT 0,  -- For user-defined sorting
    date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (news_article_id) REFERENCES news_articles(id) ON DELETE SET NULL,
    
    -- Validation: must have either news_article_id OR manual_title
    CHECK (
        (news_article_id IS NOT NULL) OR 
        (manual_title IS NOT NULL AND manual_source_url IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_idea_references_idea ON idea_references(idea_id);
CREATE INDEX idx_idea_references_article ON idea_references(news_article_id);
CREATE INDEX idx_idea_references_order ON idea_references(idea_id, display_order);

-- Migrate existing references from ideas.news_article_id
INSERT INTO idea_references (idea_id, news_article_id, display_order, date_added)
SELECT id, news_article_id, 0, date_added
FROM ideas
WHERE news_article_id IS NOT NULL;

-- Add category column to ideas
ALTER TABLE ideas ADD COLUMN category TEXT;

-- Create index for category filtering
CREATE INDEX idx_ideas_category ON ideas(category);

-- Note: Keep ideas.news_article_id for backward compatibility initially
-- Will be deprecated in migration 006 after frontend migration complete
```

**Down Migration**: `backend/migrations/005_idea_references_down.sql`
```sql
DROP INDEX IF EXISTS idx_ideas_category;
DROP INDEX IF EXISTS idx_idea_references_order;
DROP INDEX IF EXISTS idx_idea_references_article;
DROP INDEX IF EXISTS idx_idea_references_idea;
DROP TABLE IF EXISTS idea_references;

-- Remove category column
-- Note: SQLite doesn't support DROP COLUMN before 3.35.0
-- May need to recreate table without category column
```

#### Migration 006: Deprecate Single Reference (Future)

**After frontend fully migrated**:
```sql
-- Remove news_article_id foreign key
-- SQLite requires table recreation for this
-- Will be implemented after full migration confirmed
```

### Backend Data Structures

#### New Rust Types

**File**: `backend/src/writing/components/entities/idea_references.rs`

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "idea_references")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub idea_id: i64,
    pub news_article_id: Option<i64>,
    
    // Manual entry fields
    pub manual_title: Option<String>,
    pub manual_body_summary: Option<String>,
    pub manual_publish_date: Option<String>,
    pub manual_author: Option<String>,
    pub manual_source_url: Option<String>,
    
    // Metadata
    pub notes_markdown: Option<String>,
    pub display_order: i32,
    pub date_added: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::ideas::Entity",
        from = "Column::IdeaId",
        to = "super::ideas::Column::Id",
        on_delete = "Cascade"
    )]
    Idea,
    
    #[sea_orm(
        belongs_to = "super::super::super::research::components::entities::news_articles::Entity",
        from = "Column::NewsArticleId",
        to = "super::super::super::research::components::entities::news_articles::Column::Id",
        on_delete = "SetNull"
    )]
    NewsArticle,
}

impl Related<super::ideas::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Idea.def()
    }
}
```

**File**: `backend/src/writing/components/mod.rs` (update)

```rust
pub mod entities {
    pub mod ideas;
    pub mod idea_references;  // NEW
}

// Input DTOs
#[derive(Debug, Deserialize)]
pub struct CreateManualReferenceInput {
    pub title: String,
    pub body_summary: Option<String>,
    pub publish_date: Option<String>,
    pub author: Option<String>,
    pub source_url: String,
    pub notes_markdown: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReferenceInput {
    pub notes_markdown: Option<String>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderReferencesInput {
    pub reference_ids: Vec<i64>,  // Ordered list of IDs
}

// Output DTOs
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaReferenceOutput {
    pub id: i64,
    pub idea_id: i64,
    pub news_article_id: Option<i64>,
    
    // Joined article data (when news_article_id exists)
    pub article: Option<NewsArticleOutput>,
    
    // Manual entry data (when news_article_id is NULL)
    pub manual_title: Option<String>,
    pub manual_body_summary: Option<String>,
    pub manual_publish_date: Option<String>,
    pub manual_author: Option<String>,
    pub manual_source_url: Option<String>,
    
    pub notes_markdown: Option<String>,
    pub display_order: i32,
    pub date_added: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaWithReferencesOutput {
    // All existing idea fields
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub category: Option<String>,  // NEW
    pub status: String,
    pub tags: Vec<String>,
    pub notes_markdown: Option<String>,
    pub article_title: Option<String>,
    pub article_markdown: Option<String>,
    pub priority: i32,
    pub is_pinned: bool,
    pub date_added: String,
    pub date_updated: String,
    pub date_completed: Option<String>,
    pub date_removed: Option<String>,
    
    // NEW: Array of references
    pub references: Vec<IdeaReferenceOutput>,
}
```

### Backend Commands (New)

**File**: `backend/src/writing/commands.rs`

```rust
// Add article from feed to existing idea
#[tauri::command]
#[instrument(skip(state))]
pub async fn add_article_reference_to_idea(
    state: State<'_, AppState>,
    idea_id: i64,
    article_id: i64,
    notes: Option<String>,
) -> Result<IdeaReferenceOutput, String> {
    // 1. Verify idea exists
    // 2. Verify article exists
    // 3. Check if reference already exists (prevent duplicates)
    // 4. Get max display_order for this idea
    // 5. Insert new reference with display_order = max + 1
    // 6. Return reference with joined article data
}

// Add manual external reference
#[tauri::command]
#[instrument(skip(state))]
pub async fn add_manual_reference_to_idea(
    state: State<'_, AppState>,
    idea_id: i64,
    input: CreateManualReferenceInput,
) -> Result<IdeaReferenceOutput, String> {
    // 1. Verify idea exists
    // 2. Validate input (title and source_url required)
    // 3. Get max display_order
    // 4. Insert manual reference
    // 5. Return reference
}

// Update reference notes or order
#[tauri::command]
#[instrument(skip(state))]
pub async fn update_idea_reference(
    state: State<'_, AppState>,
    reference_id: i64,
    input: UpdateReferenceInput,
) -> Result<IdeaReferenceOutput, String> {
    // 1. Verify reference exists
    // 2. Update fields
    // 3. Return updated reference with article data if applicable
}

// Remove reference from idea
#[tauri::command]
#[instrument(skip(state))]
pub async fn remove_idea_reference(
    state: State<'_, AppState>,
    reference_id: i64,
) -> Result<(), String> {
    // 1. Delete reference (CASCADE will handle cleanup)
    // 2. Note: Article remains in news_articles table
}

// Reorder all references for an idea
#[tauri::command]
#[instrument(skip(state))]
pub async fn reorder_idea_references(
    state: State<'_, AppState>,
    idea_id: i64,
    input: ReorderReferencesInput,
) -> Result<Vec<IdeaReferenceOutput>, String> {
    // 1. Verify idea exists
    // 2. Verify all reference_ids belong to this idea
    // 3. Update display_order for each (index = new order)
    // 4. Return reordered list
}

// Get single idea with all references (replaces get_idea_handler)
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_idea_with_references(
    state: State<'_, AppState>,
    id: i64,
) -> Result<IdeaWithReferencesOutput, String> {
    // 1. Query idea
    // 2. Query references with LEFT JOIN to news_articles
    // 3. Sort references by display_order
    // 4. Return complete structure
}

// Update existing create_idea_for_article to use junction table
#[tauri::command]
#[instrument(skip(state))]
pub async fn create_idea_for_article_handler(
    state: State<'_, AppState>,
    article_id: i64,
) -> Result<IdeaWithReferencesOutput, String> {
    // Use TRANSACTION:
    // 1. Create idea (with article tags)
    // 2. Create reference in junction table
    // 3. Update article.added_to_ideas_at
    // 4. Return idea with references array
}
```

**Register Commands in `main.rs`**:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing ...
    add_article_reference_to_idea,
    add_manual_reference_to_idea,
    update_idea_reference,
    remove_idea_reference,
    reorder_idea_references,
    get_idea_with_references,
    // ... rest ...
])
```

### Frontend Type Updates

**File**: `frontend/src/hooks/queries.ts` (or new `frontend/src/writing/types.ts`)

```typescript
// Reference type
export type IdeaReference = {
  id: number;
  ideaId: number;
  
  // Article reference
  newsArticleId?: number | null;
  article?: NewsArticle;  // Joined data
  
  // Manual entry
  manualTitle?: string | null;
  manualBodySummary?: string | null;
  manualPublishDate?: string | null;
  manualAuthor?: string | null;
  manualSourceUrl?: string | null;
  
  // Metadata
  notesMarkdown?: string | null;
  displayOrder: number;
  dateAdded: string;
};

// Updated Idea type
export type ArticleIdea = {
  id: number;
  title: string;
  summary?: string | null;        // Rename to 'description' in UI
  category?: string | null;       // NEW
  status: 'in_progress' | 'stalled' | 'complete';
  tags: string[];
  notesMarkdown?: string | null;  // Idea-level notes
  articleTitle?: string | null;
  articleMarkdown?: string | null;
  priority?: number | null;
  isPinned?: boolean;
  dateAdded?: string;
  dateUpdated?: string | null;
  dateCompleted?: string | null;
  dateRemoved?: string | null;
  
  // NEW: References array
  references: IdeaReference[];
};

// Input types for new mutations
export type CreateManualReferenceInput = {
  title: string;
  bodySummary?: string;
  publishDate?: string;
  author?: string;
  sourceUrl: string;
  notesMarkdown?: string;
};

export type UpdateReferenceInput = {
  notesMarkdown?: string;
  displayOrder?: number;
};
```

### Frontend Queries & Mutations

**File**: `frontend/src/writing/components/ideas/queries.ts` (extract from hooks/queries.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { ArticleIdea, IdeaReference, CreateManualReferenceInput } from './types';

// Get single idea with references
export function useIdea(id: number | null) {
  return useQuery({
    queryKey: ['idea', id],
    queryFn: async () => {
      if (!id) return null;
      return invoke<ArticleIdea>('get_idea_with_references', { id });
    },
    enabled: id !== null,
  });
}

// Add article reference
export function useAddArticleReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      ideaId, 
      articleId, 
      notes 
    }: { 
      ideaId: number; 
      articleId: number; 
      notes?: string;
    }) => 
      invoke<IdeaReference>('add_article_reference_to_idea', { 
        ideaId, 
        articleId, 
        notes 
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
      toast.success('Reference added');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to add reference');
    },
  });
}

// Add manual reference
export function useAddManualReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      ideaId, 
      input 
    }: { 
      ideaId: number; 
      input: CreateManualReferenceInput;
    }) =>
      invoke<IdeaReference>('add_manual_reference_to_idea', { ideaId, input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
      toast.success('Manual reference added');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to add reference');
    },
  });
}

// Update reference
export function useUpdateReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      referenceId,
      input,
    }: {
      referenceId: number;
      input: UpdateReferenceInput;
    }) =>
      invoke<IdeaReference>('update_idea_reference', { referenceId, input }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idea', data.ideaId] });
      toast.success('Reference updated');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to update reference');
    },
  });
}

// Remove reference
export function useRemoveReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      referenceId,
      ideaId,
    }: {
      referenceId: number;
      ideaId: number;
    }) =>
      invoke('remove_idea_reference', { referenceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
      toast.success('Reference removed');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to remove reference');
    },
  });
}

// Reorder references
export function useReorderReferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ideaId,
      referenceIds,
    }: {
      ideaId: number;
      referenceIds: number[];
    }) =>
      invoke<IdeaReference[]>('reorder_idea_references', { 
        ideaId, 
        input: { referenceIds } 
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to reorder references');
    },
  });
}
```

---

## UI Component Specifications

### 1. IdeasListModal.tsx

**Path**: `frontend/src/writing/components/ideas/IdeasListModal.tsx`

**Purpose**: Full CRUD modal for creating/editing ideas with references

**Props**:
```typescript
interface IdeasListModalProps {
  ideaId?: number | null;     // null = create mode, number = edit mode
  open: boolean;
  onClose: () => void;
  initialArticleId?: number;  // Pre-attach article on creation
}
```

**Layout** (Radix Dialog):
```
┌─────────────────────────────────────────────────┐
│ [X] New Idea / Edit Idea                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Title: [___________________________________]    │
│                                                 │
│ Description: [___________________________]      │
│                            (textarea)           │
│                                                 │
│ Category: [Select: Tech/Politics/Science...]    │
│                                                 │
│ Tags: [tag1] [tag2] [+ Add tag]                │
│                                                 │
│ Status: [In Progress ▼]   Priority: [Normal ▼] │
│                                                 │
│ ─── Idea Notes ──────────────────────────       │
│ [Markdown editor with preview]                  │
│                                                 │
│ ─── References (3) ──────────────────────       │
│                                                 │
│ ▼ Reference 1: Article Title                   │
│   Source: TechCrunch • Dec 15, 2025            │
│   Notes: [Markdown editor - collapsed]         │
│   [Open Article] [Remove]                      │
│                                                 │
│ ▶ Reference 2: Manual Entry Title              │
│                                                 │
│ ▶ Reference 3: Another Article                 │
│                                                 │
│ [+ Add Reference ▼]                            │
│   • Search articles                            │
│   • Manual entry                               │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Cancel] [Save] [Write Article]│
└─────────────────────────────────────────────────┘
```

**Radix Components**:
- `Dialog.Root`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`
- `Select.Root` for category, status, priority
- `Accordion.Root` for references section
- `DropdownMenu.Root` for "Add Reference" button

**Features**:
- Auto-save draft every 2 seconds
- Drag-to-reorder references (use `@dnd-kit/core`)
- Inline reference notes editing
- "Write Article" button → navigate to EditorView with idea loaded
- Validation: title required, at least one reference recommended (warning)

### 2. IdeaHoverCard.tsx

**Path**: `frontend/src/writing/components/ideas/IdeaHoverCard.tsx`

**Purpose**: Quick preview on hover with read-only info and status switcher

**Props**:
```typescript
interface IdeaHoverCardProps {
  idea: ArticleIdea;
  children: React.ReactNode;  // Trigger element
  onStatusChange: (status: ArticleIdea['status']) => void;
}
```

**Layout** (Radix HoverCard):
```
┌─────────────────────────────────┐
│ Idea Title                      │
│ Category: Tech • 3 references   │
│                                 │
│ "First 200 chars of notes...   │
│  Click to see more"             │
│                                 │
│ Status: [In Progress ▼]         │
│                                 │
│ Click to edit full details →   │
└─────────────────────────────────┘
```

**Radix Components**:
- `HoverCard.Root`, `HoverCard.Trigger`, `HoverCard.Portal`, `HoverCard.Content`
- `Select.Root` for status quick-change

**Features**:
- 500ms delay before showing
- Notes truncated to 200 chars
- Status change mutation triggers immediately
- "Click to edit" opens IdeasListModal

### 3. AddToIdeaDialog.tsx

**Path**: `frontend/src/research/components/stream/AddToIdeaDialog.tsx`

**Purpose**: Quick dialog from news feed to attach article to idea

**Props**:
```typescript
interface AddToIdeaDialogProps {
  articleId: number;
  open: boolean;
  onClose: () => void;
}
```

**Layout** (Radix Dialog):
```
┌─────────────────────────────────────┐
│ Add Article to Idea                 │
├─────────────────────────────────────┤
│                                     │
│ Search ideas: [_______________] 🔍  │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ ○ Idea 1: Title             │   │
│ │   In Progress • 2 refs      │   │
│ ├─────────────────────────────┤   │
│ │ ○ Idea 2: Another Title     │   │
│ │   Complete • 5 refs         │   │
│ └─────────────────────────────┘   │
│                                     │
│ Initial notes (optional):           │
│ [___________________________]       │
│                                     │
├─────────────────────────────────────┤
│ [Create New Idea] [Cancel] [Add]    │
└─────────────────────────────────────┘
```

**Features**:
- Search ideas by title
- Filter by status (dropdown)
- "Create New Idea" → opens IdeasListModal with article pre-attached
- "Add" → calls `add_article_reference_to_idea` mutation
- Prevents duplicate: grey out ideas that already have this article

### 4. LinkedIdeasPanel.tsx

**Path**: `frontend/src/writing/components/editor/LinkedIdeasPanel.tsx`

**Purpose**: Show all ideas linked to current article in editor

**Props**:
```typescript
interface LinkedIdeasPanelProps {
  linkedIdeaIds: number[];
  onAddIdea: () => void;       // Opens search dialog
  onRemoveIdea: (ideaId: number) => void;
}
```

**Layout** (Accordion):
```
┌────────────────────────────────────┐
│ Linked Ideas (3)                   │
│ [+ Link Another Idea]              │
├────────────────────────────────────┤
│                                    │
│ ▼ Idea 1: Birth Rates 2024        │
│   3 references                     │
│                                    │
│   ▶ Ref 1: CDC Report             │
│       Your notes: Key stat...     │
│       [View Article]              │
│                                    │
│   ▶ Ref 2: NYT Analysis           │
│   ▶ Ref 3: WHO Data               │
│                                    │
│   [Unlink Idea]                    │
│                                    │
│ ▶ Idea 2: Baby Health Metrics     │
│   5 references                     │
│                                    │
│ ▶ Idea 3: Demographic Trends      │
│   2 references                     │
│                                    │
└────────────────────────────────────┘
```

**Radix Components**:
- `Accordion.Root`, `Accordion.Item`, `Accordion.Trigger`, `Accordion.Content`

**Features**:
- Nested accordion (ideas → references)
- Click reference → opens article preview modal
- Notes displayed inline (read-only, edit in IdeasListModal)
- Unlink button removes idea from article context

### 5. Update StreamView Article Cards

**Path**: `frontend/src/research/components/stream/StreamView.tsx`

**Add to each article card**:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setAddToIdeaDialogOpen(true);
    setSelectedArticleId(article.id);
  }}
>
  <Plus className="h-4 w-4 mr-1" />
  Add to Idea
</Button>

{/* At component root */}
<AddToIdeaDialog
  articleId={selectedArticleId}
  open={addToIdeaDialogOpen}
  onClose={() => setAddToIdeaDialogOpen(false)}
/>
```

---

## Implementation Phases

### Phase 1: Backend Foundation (2-3 days)
1. Create migration 005 (junction table + category column)
2. Create `idea_references.rs` entity model
3. Implement new Tauri commands:
   - `add_article_reference_to_idea`
   - `add_manual_reference_to_idea`
   - `update_idea_reference`
   - `remove_idea_reference`
   - `reorder_idea_references`
   - `get_idea_with_references`
4. Update `create_idea_for_article_handler` to use junction table
5. Test all commands with manual invocations

### Phase 2: Frontend Types & Queries (1 day)
1. Update `ArticleIdea` and create `IdeaReference` types
2. Extract ideas queries to `writing/components/ideas/queries.ts`
3. Implement mutation hooks for references
4. Test with existing UI (should still work with single reference)

### Phase 3: Ideas Modal & Hover Card (3-4 days)
1. Build `IdeasListModal.tsx`
   - Basic CRUD form
   - References accordion
   - Add/remove references
   - Drag-to-reorder (optional)
2. Build `IdeaHoverCard.tsx`
3. Update `IdeasView.tsx` to use modal + hover card
4. Test create/edit/delete workflows

### Phase 4: Feed Integration (2 days)
1. Build `AddToIdeaDialog.tsx`
2. Update `StreamView.tsx` article cards
3. Test add-to-existing and create-new flows

### Phase 5: Editor Multi-Idea Support (3 days)
1. Build `LinkedIdeasPanel.tsx`
2. Update `EditorView.tsx` to support multiple linked ideas
3. Add idea search/link functionality
4. Test writing workflow with multiple references

### Phase 6: Manual References (2 days)
1. Add manual entry form to `IdeasListModal`
2. Implement manual reference mutations
3. Test external source workflow

### Phase 7: Polish & Testing (2-3 days)
1. Add drag-drop reordering
2. Keyboard shortcuts (Cmd+K to search ideas, etc.)
3. Loading states and error handling
4. End-to-end testing
5. Performance optimization (lazy load references)

**Total Estimate**: 15-20 days (3-4 weeks)

---

## Migration Strategy

### Backward Compatibility Plan

**Phase 1-2** (Backend + Types): Ideas continue to work with single reference via `news_article_id`

**Phase 3-5** (Frontend rebuild): Gradually migrate UI to use references array

**Phase 6** (Deprecation): Remove `news_article_id` column after full migration

### Data Migration Script

**File**: `backend/src/core/components/migrations.rs` (add to `apply_migrations`)

```rust
async fn migrate_single_references_to_junction(db: &DatabaseConnection) -> Result<(), DbErr> {
    // Already in migration 005 SQL, but can add validation:
    let ideas_with_refs = ideas::Entity::find()
        .filter(ideas::Column::NewsArticleId.is_not_null())
        .all(db)
        .await?;
    
    for idea in ideas_with_refs {
        let exists = idea_references::Entity::find()
            .filter(idea_references::Column::IdeaId.eq(idea.id))
            .filter(idea_references::Column::NewsArticleId.eq(idea.news_article_id.unwrap()))
            .one(db)
            .await?;
        
        if exists.is_none() {
            // Create reference if not already migrated
            idea_references::ActiveModel {
                idea_id: Set(idea.id),
                news_article_id: Set(idea.news_article_id),
                display_order: Set(0),
                date_added: Set(idea.date_added),
                ..Default::default()
            }
            .insert(db)
            .await?;
        }
    }
    
    Ok(())
}
```

---

## Testing Plan

### Unit Tests

**Backend** (`backend/src/writing/components/tests/`):
- `test_add_article_reference` - Add article to idea
- `test_add_duplicate_reference` - Prevent duplicates
- `test_add_manual_reference` - External source
- `test_update_reference_notes` - Edit notes
- `test_reorder_references` - Change order
- `test_remove_reference` - Delete reference
- `test_cascade_delete_idea` - References deleted when idea deleted
- `test_set_null_article_delete` - Reference.news_article_id nulled when article deleted

### Integration Tests

**Scenarios**:
1. **Feed → Idea → Writing**:
   - Browse articles → Add to new idea → Write article with references
2. **Multi-Reference Research**:
   - Create idea → Add 5 references → Reorder → Write article
3. **Manual Entry**:
   - Create idea → Add manual reference → Edit notes → Write
4. **Multiple Ideas in Article**:
   - Link 3 ideas to one article → Access all references while writing
5. **Reference Notes**:
   - Add reference → Add notes → Edit notes → View in editor

### Performance Tests

**Queries to Optimize**:
- `get_idea_with_references` with 20+ references
- List ideas with reference counts (use aggregation)
- Search references across all ideas

**Indexes Required**:
- ✅ `idx_idea_references_idea` (already in migration)
- ✅ `idx_idea_references_article` (already in migration)
- ✅ `idx_idea_references_order` (already in migration)

---

## Open Questions & Decisions Needed

### 1. Categories: Flat vs Hierarchical?

**Option A** - Single category per idea:
```typescript
category: 'Tech'  // Simple string
```

**Option B** - Hierarchical with parent/child:
```typescript
categories: ['Tech', 'Tech > AI', 'Tech > AI > LLMs']
```

**Recommendation**: Start with Option A (single category string), add UI autocomplete with suggestions. Can extend to hierarchy in future migration.

### 2. Reference Reordering: Auto vs Manual?

**Option A** - Auto-sort by date added (default)  
**Option B** - Manual drag-drop only  
**Option C** - Default auto-sort, allow manual override

**Recommendation**: Option C - Start with auto-sort, add drag-drop icon for manual reorder.

### 3. Idea-Article Linking: How to Store?

**Current**: Implicit (ideas used while editing article in EditorView state)  
**Future Option**: Explicit `article_idea_links` table to persist relationships

**Decision Needed**: Should linked ideas be saved as persistent relationships, or just UI state while editing?

**Recommendation**: Start with UI state (simpler), add persistence later if users request it.

### 4. Manual Reference Required Fields?

**Minimum Viable**:
- Title ✅
- Source URL ✅

**Nice to Have**:
- Body summary
- Publish date
- Author

**Recommendation**: Require title + URL only, rest optional.

### 5. Duplicate Reference Prevention?

**Scenario**: User tries to add same article twice to one idea

**Option A** - Silent skip (don't add duplicate)  
**Option B** - Show error toast  
**Option C** - Show warning, allow if user confirms

**Recommendation**: Option B - Show error toast, grey out already-added articles in AddToIdeaDialog.

---

## Success Metrics

### Functionality
- ✅ Can create idea with multiple references
- ✅ Can add article from feed to existing idea
- ✅ Can add manual external reference
- ✅ Can edit notes per reference
- ✅ Can reorder references
- ✅ Can write article with multiple linked ideas
- ✅ Can view all references organized by idea in editor

### Performance
- Get idea with 20 references: < 100ms
- List 100 ideas with reference counts: < 200ms
- Add reference mutation: < 50ms

### User Experience
- "Add to Idea" from feed: < 3 clicks
- Create new idea with reference: < 5 seconds
- Switch between reference notes while writing: instant

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Idea Templates**: Pre-configured structure for common article types
2. **Reference Tagging**: Tag references within idea (e.g., "supporting data", "counterpoint")
3. **Citation Export**: Generate bibliography from references
4. **Collaborative Ideas**: Share ideas with team, comment on references
5. **AI Summarization**: Auto-generate idea summary from all reference notes
6. **Reference Highlights**: Mark specific quotes/passages in reference notes
7. **Idea Relationships**: Link related ideas together (graph view)
8. **Progress Tracking**: Track research progress (X of Y references reviewed)

### Integration Ideas
1. **Zotero Import**: Import references from academic library
2. **Browser Extension**: Capture web pages directly as manual references
3. **PDF Annotation**: Attach and annotate PDF references
4. **Voice Notes**: Record audio notes per reference

---

## Risk Assessment

### High Risk
- **Database Migration Failure**: Junction table migration on large datasets
  - **Mitigation**: Test migration on copy of production DB first, implement rollback

### Medium Risk
- **Performance with Many References**: Ideas with 50+ references may be slow
  - **Mitigation**: Implement pagination, lazy loading, query optimization

- **UI Complexity**: Multiple nested accordions may confuse users
  - **Mitigation**: User testing, iterative refinement, keyboard shortcuts

### Low Risk
- **Type Inconsistencies**: Mismatch between backend Rust types and frontend TypeScript
  - **Mitigation**: Auto-generate TS types from Rust with `ts-rs` crate

---

## Appendix

### Related Files

**Backend**:
- `backend/src/writing/components/entities/ideas.rs` - Current idea model
- `backend/src/writing/components/handlers.rs` - Business logic
- `backend/src/writing/commands.rs` - Tauri commands
- `backend/migrations/001_initial_schema_up.sql` - Current schema

**Frontend**:
- `frontend/src/hooks/queries.ts` - Current queries (to be split)
- `frontend/src/writing/WritingView.tsx` - Main writing domain view
- `frontend/src/writing/components/editor/EditorView.tsx` - Article editor
- `frontend/src/writing/components/ideas/IdeasView.tsx` - Ideas library (placeholder)
- `frontend/src/research/components/stream/StreamView.tsx` - News feed

### References
- [Radix UI Documentation](https://www.radix-ui.com/primitives)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [SeaORM Relations Guide](https://www.sea-ql.org/SeaORM/docs/basic-crud/select/#one-to-many)

---

**Document Status**: Draft - Ready for Implementation  
**Next Review**: After Frontend Refactoring Complete  
**Owner**: Writing Domain Team
