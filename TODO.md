# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## ✅ COMPLETED: Notes Feature + TipTap Editor + Embedded Webview (December 18, 2025)

**Status**: ✅ Complete - Full Stack Notes + Real Embedded Browser  
**Goal**: Polymorphic notes with rich text editing + native webview for references  
**Result**: Production-ready notes system with TipTap + Tauri child webview

### Backend Completed ✅
- ✅ Migration 007: Unique index for one note per entity per type
- ✅ Notes entity: `body_html` field (HTML-native for TipTap)
- ✅ Notes feature module: `backend/src/notes/` with business logic
- ✅ Three Tauri commands registered:
  - `notes_get_or_create(entity_type, entity_id, note_type)`
  - `notes_upsert(entity_type, entity_id, note_type, body_html)`
  - `notes_append_snippet(entity_type, entity_id, note_type, snippet_text, source_url, source_title)`
- ✅ HTML escaping for safe snippet injection
- ✅ Divider pattern: empty → `<p>...</p>`, else append `<hr /><p>...</p>`

### Frontend Notes Feature Completed ✅
- ✅ Feature module: `frontend/src/features/notes/`
  - `api/notes.ts` - Typed Tauri invoke wrappers
  - `hooks/useNotes.ts` - Query hooks (useNote, useSaveNote, useAppendSnippet)
  - `components/NotesEditor.tsx` - **TipTap rich text editor** with formatting toolbar
  - `components/NotesEditor.css` - Styled prose editor with proper typography
  - `components/EntityNotesPanel.tsx` - Wrapper with save button and dirty tracking
  - `components/NoteHoverPreview.tsx` - Radix HoverCard with proper styling
  - `components/ReferenceNotesDialog.tsx` - Full-screen notes editor for references
- ✅ TipTap Extensions: StarterKit, Link, Placeholder (simplified, no headings/code blocks)
- ✅ Toolbar: Bold, Italic, Strikethrough, Bullet/Numbered Lists, Links, Undo/Redo
- ✅ Ideas dialog: Uses EntityNotesPanel with TipTap editor in Notes tab
- ✅ References: Hover preview on titles + FileText button to open notes dialog
- ✅ Shared types: Added Note, NoteEntityType, NoteType, AppendSnippetInput

### Embedded Webview Completed ✅
- ✅ Real Tauri child `Webview` API implementation (not iframe)
- ✅ `frontend/src/features/webview/index.ts`:
  - `registerWebviewInstance()` - Track active webview
  - `navigateWebview()`, `webviewBack()`, `webviewForward()`, `webviewReload()`
  - `closeWebview()` - Proper cleanup
- ✅ `frontend/src/features/webview/store.ts`:
  - Added `currentUrl`, `selectedText`, `noteTarget` state
  - `getWebviewSelectedText()` helper
- ✅ `frontend/src/features/webview/components/WebviewModal.tsx`:
  - Creates native Tauri `Webview` as child window
  - Selection bridge: JavaScript injection listens for text selection
  - Clipboard fallback: "Paste" button for CORS-blocked sites
  - Auto-positioning: `ResizeObserver` keeps webview aligned with modal
  - Navigation: Back/Forward/Reload buttons, URL bar
  - Notes panel: Shows EntityNotesPanel in right sidebar
  - "Add selection to notes": Appends selected text with `<hr />` divider
- ✅ References: Eye icon opens real embedded browser with notes panel
- ✅ Selection workflow: Highlight text → Copy → Paste → Add to notes → See in EntityNotesPanel below

### Architecture Improvements ✅
- ✅ Notes are a **feature**, not domain-specific (usable by any domain)
- ✅ 1:1 relationship: One note per entity per note_type (DB unique index)
- ✅ HTML-native storage: Direct TipTap compatibility, no markdown conversion
- ✅ Polymorphic pattern: EntityNotesPanel accepts any entityType/entityId
- ✅ Type-safe API: All hooks use proper TypeScript generics

### Future Enhancements (Optional)
- Add note type filtering UI (tabs for main/highlight/annotation/todo)
- Implement "anchor" field for highlight positioning
- Add search/filter across all notes
- Export notes to markdown
- Image upload support in TipTap
- Configure Tauri CSP to allow selection bridge on specific domains

---

## 🔥 TOP PRIORITY: Ideas View Port from src-old (December 18, 2025)

**Status**: 🚧 Phase 1 - Core Functionality (~40% Complete)  
**Goal**: Port complete Ideas view design from src-old to new 3-tier architecture  
**Research Completed**: 619-line analysis shows 60% feature gap

### Completed ✅
- EmptyState component with proper actions
- Priority type conversion (string ↔ i32)
- NewIdeaDialog with Radix Themes
- References API layer (list/add/remove/updateNotes)
- useReferences hooks with TanStack Query
- References tab in IdeaDetailDialog
- Card click handler (moved to Card component)
- Shared constants (IDEA_STATUSES/IDEA_PRIORITIES)

### In Progress 🚧
1. **BLOCKER**: Fix IdeaDetailDialog visibility (renders but not visible)
2. Multi-select system (checkboxes, bulk operations)
3. Inline status editing (dropdown in card footer)
4. NotesEditor component (TipTap or markdown)
5. Per-reference notes (inline editing)
6. UI polish (hover effects, icons, timestamps)

### Missing from src-old (60% feature gap)
- Multi-select checkboxes + Select All
- Bulk archive with confirmation
- Inline status dropdown (no modal)
- Status icons (CheckCircle/AlertCircle/Circle)
- NotesEditor (rich text/markdown)
- ArticleViewerModal (embedded browser)
- Highlight event listeners
- Per-reference notes UI
- Reference type badges
- Hover shadow effects
- Selection highlighting (ring-2 ring-primary)

---

## 🔥 TOP PRIORITY: Complete Knowledge Graph Schema (December 17-18, 2025)

**Status**: 🚧 Migration 006 Applied, Backend Handlers In Progress  
**Goal**: Implement many-to-many knowledge graph for Ideas ↔ References ↔ Writings  
**Timeline**: 2 days for backend handlers + frontend integration

---

## ✅ COMPLETED: Writing System with TipTap JSON Editor (December 18, 2025)

**Status**: COMPLETE ✅  
**Goal**: Full-stack writing system with TipTap rich text editor, optimistic updates, and knowledge graph integration  
**Result**: Production-ready writing workspace with autosave, metadata panel, and idea linking

### Backend Implementation ✅

#### Files Created (6 new modules):

1. **`backend/src/writing/text.rs`** (116 lines) ✅
   - `extract_plain_text()` - Recursive TipTap JSON tree walker for search indexing
   - `walk()` - Helper traverses content arrays and nested structures
   - `word_count()` - Whitespace-based word counting
   - Unit tests for simple text, paragraphs, word counting

2. **`backend/src/writing/dto.rs`** (151 lines) ✅
   - `WritingDraftDto` - Frontend response with contentJson (TipTap JSON), contentText, wordCount
   - `CreateWritingDraftInput` - Create with title, type, linkIdeaIds, initialContentJson
   - `SaveDraftInput` - Autosave contentJson
   - `UpdateWritingDraftMetaInput` - All metadata fields (title, slug, excerpt, status, type, tags, series)
   - `PublishWritingInput`, `LinkIdeaInput`, `ListWritingsQuery`
   - All with camelCase serialization for frontend compatibility

3. **`backend/src/writing/service.rs`** (317 lines) ✅
   - `create_writing()` - Creates with JSON, extracts text, links ideas, transaction
   - `get_writing()` - Retrieves by ID with error handling
   - `list_writings()` - Filters by status/type/series/pinned/featured
   - `update_writing_meta()` - Updates metadata with enum parsing
   - `save_draft()` - Saves JSON, extracts text, updates word count atomically
   - `publish_writing()` - Sets published status + timestamp
   - `link_idea()`, `unlink_idea()`, `list_linked_ideas()` - Manage idea relationships

4. **`backend/src/writing/commands.rs`** (additions, lines 468-688) ✅
   - `writing_draft_to_dto()` - Helper maps entity to DTO, parses JSON
   - `writing_create`, `writing_get`, `writing_list` - CRUD commands
   - `writing_update_meta` - Metadata updates
   - `writing_save_draft` - Autosave handler
   - `writing_publish` - Publishing workflow
   - `writing_link_idea`, `writing_unlink_idea`, `writing_list_linked_ideas`

5. **`backend/src/writing/mod.rs`** (updated) ✅
   - Added exports: `pub mod dto`, `pub mod text`, `pub mod service`

6. **`backend/src/main.rs`** (updated) ✅
   - Registered 9 new commands in invoke_handler
   - Imports for all writing commands

### Frontend Implementation ✅

#### Files Created (10 new components):

1. **`frontend/src/shared/types/index.ts`** (additions) ✅
   - `WritingType` = 'article' | 'chapter' | 'book'
   - `WritingStatus` = 'draft' | 'in_progress' | 'review' | 'published' | 'archived'
   - `Writing` interface with contentJson (TipTap JSON), contentText, wordCount
   - Input/output types for all operations

2. **`frontend/src/features/writing/api/writing.ts`** (120 lines) ✅
   - `mapWriting()` - camelCase ↔ snake_case conversion
   - `writingCreate()`, `writingGet()`, `writingList()` - CRUD operations
   - `writingUpdateMeta()`, `writingSaveDraft()`, `writingPublish()`
   - `writingLinkIdea()`, `writingUnlinkIdea()`, `writingListLinkedIdeas()`

3. **`frontend/src/features/writing/hooks/useWriting.ts`** (171 lines) ✅
   - Query keys factory pattern for cache management
   - `useWritingList()`, `useWriting()` - Query hooks with stale times
   - `useCreateWriting()` - Creation with cache invalidation
   - `useSaveDraft()` - **Optimistic updates with rollback on error**
   - `useUpdateWritingMeta()`, `usePublishWriting()` - Metadata operations
   - `useLinkIdea()`, `useUnlinkIdea()`, `useLinkedIdeas()` - Relationship management

4. **`frontend/src/features/writing/components/WritingEditor.tsx`** (100 lines) ✅
   - TipTap editor wrapper with JSON in/out
   - Extensions: StarterKit (headings 1-4), Link, Image, Placeholder, CharacterCount
   - Props: value (JSON), onChange(json), onEditorReady(editor), onStats(wordCount), readOnly
   - Auto-updates on external value change, exposes editor instance

5. **`frontend/src/features/writing/components/WritingEditor.css`** (123 lines) ✅
   - Prose typography with heading hierarchy (h1 2.5em → h4 1.25em)
   - List, code block, blockquote, image styles
   - Placeholder styling with muted colors

6. **`frontend/src/features/writing/components/WritingToolbar.tsx`** (163 lines) ✅
   - Radix Toolbar with TipTap controls
   - Format: Bold, Italic, Strikethrough
   - Headings: H1, H2, H3
   - Lists: Bullet, Numbered
   - Code block, Image upload (file input + dataURL)
   - Undo/Redo, Word count display, Save button
   - Active state highlighting

7. **`frontend/src/features/writing/components/WritingMetaPanel.tsx`** (194 lines) ✅
   - Right sidebar metadata editor
   - Sections: Metadata (title, slug, excerpt, type, status), Organization (tags, series), Publishing (word count, timestamps)
   - Dirty tracking with auto-reset on writing change
   - Optimistic saves with rollback

8. **`frontend/src/features/writing/components/WritingWorkspace.tsx`** (137 lines) ✅
   - Main 3-column layout (25% ideas/refs | 50% editor | 25% metadata)
   - Local content state with dirty tracking
   - 1.5s debounced autosave + Ctrl+S keyboard shortcut
   - Editor instance management via callback
   - Word count tracking from editor stats
   - Optimistic updates with rollback
   - Left sidebar stubbed "Coming soon" for ideas/references

9. **`frontend/src/features/writing/components/WritingLibrary.tsx`** (135 lines) ✅
   - List/grid view of all writings
   - Filters: Status (all/draft/in_progress/review/published/archived), Type (all/article/chapter/book)
   - Create: Button creates "Untitled Writing" with H1 + empty paragraph
   - Cards: Title, type/status badges, excerpt, word count, updated date
   - Empty state with create prompt
   - Click to open writing in workspace

10. **`frontend/src/features/writing/index.ts`** (17 lines) ✅
    - Barrel exports for API, hooks, and components
    - Clean public interface for feature

### Architecture Highlights ✅

- **TipTap JSON Storage**: Content stored as JSON string in `content_markdown` column (lossless editing)
- **Text Extraction**: Recursive walker extracts plain text for search and word counting
- **Optimistic Updates**: React Query mutation onMutate/onError/onSettled pattern with context
- **Autosave**: 1.5s debounce prevents excessive backend calls
- **3-Column Layout**: Ideas (25%) | Editor (50%) | Meta (25%) for focused writing
- **Type-Safe**: Full TypeScript + Rust types with camelCase ↔ snake_case mapping
- **Transaction Safety**: SeaORM transactions for multi-table operations
- **Validation**: cargo check passes (32 warnings, 0 errors)

### Workflow Support ✅

**"Create Writing from Scratch"**:
1. WritingLibrary → Click "Create Writing"
2. Creates writing with initial TipTap JSON (H1 + empty paragraph)
3. Opens in WritingWorkspace
4. Autosaves on edits, Ctrl+S for manual save

**"Link Ideas to Writing"**:
1. WritingWorkspace → Use idea linking commands
2. Creates `writing_idea_links` rows
3. (Future: Sidebar shows linked ideas + aggregated references)

**"Publish Writing"**:
1. WritingMetaPanel → Click "Publish"
2. Sets status='published', published_at=NOW()
3. Updates UI optimistically

### ✅ Integration Work Complete (December 18, 2025)

- [x] Add WritingLibrary to domains/writing/WritingView.tsx tabs ✅
- [x] Integrate WritingWorkspace into routing system ✅
- [x] Implement ideas/references left sidebar in WritingWorkspace ✅
- [x] Add "Create article from idea" button in IdeaDetailDialog ✅
- [x] TipTap npm packages confirmed installed ✅
- [ ] Version management implementation (DTOs ready, commands not created yet) - Deferred to Phase 2

**Implementation Details**:
- WritingView now has 3 tabs: Library, Editor, Ideas
- WritingLibrary lists all writings with filters
- WritingWorkspace opens when selecting from library
- LinkedIdeasPanel shows linked ideas in left sidebar
- IdeaDetailDialog has "Create Article" button that:
  - Creates writing with title and summary from idea
  - Links the idea to the new writing
  - Initializes TipTap JSON with H1 heading
- Clicking ideas in sidebar shows idea details (TODO: open detail dialog)

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
- **Forms**: Radix Form primitives (`@radix-ui/react-form`) with Radix Themes components (TextField, Select, Switch, TextArea, Button)
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
