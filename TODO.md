# Active Tasks

Current sprint work in progress. For completed work see [DONE.md](./docs/DONE.md), for long-term planning see [ROADMAP.md](./docs/ROADMAP.md).

---

## 🔥 TOP PRIORITY: Complete Frontend Rebuild (December 17-31, 2025)

**Status**: Foundation Phase Started  
**Goal**: Clean, feature-based architecture with Radix Themes, Zustand, and domain-aligned structure  
**Approach**: Rebuild from scratch, salvage working code from src-old incrementally  
**Timeline**: ~2 weeks for all 3 domains (Writing, Research, System)

### Why Rebuild?

**Critical Issues in Current Frontend**:
- 1152-line monolithic queries.ts (should be ~200 lines per feature)
- Status value mismatches (done vs complete, backlog vs in_progress)
- Idea cards rendered 3 different ways across views
- Status dropdowns duplicated 5+ times
- Modal state management scattered across components
- Old placeholder components confusing structure
- No clear separation between features and domains

**Benefits of Rebuild**:
- ✅ Single source of truth for domain types and constants
- ✅ Centralized state management (Zustand)
- ✅ Reusable atomic components (IdeaCard with variants)
- ✅ Feature-based folder structure matching backend
- ✅ Radix Themes with Dark/Light/Cyberpunk presets
- ✅ Consistent naming aligned with backend
- ✅ 3-tier architecture (core/features/domains)

### Architecture Overview

```
frontend/src/
├── core/                          # Infrastructure (shell, providers, stores, API)
│   ├── api/tauri.ts              # Typed Tauri invoke wrappers
│   ├── providers/                # Theme, Query, Toast providers
│   ├── stores/                   # Zustand stores (activeIdea, filters, etc.)
│   └── components/
│       ├── AppShell.tsx          # Main layout with Radix Navigation
│       └── ui/                   # Generic Radix wrapper components
├── shared/                        # Domain types and constants
│   ├── types.ts                  # Idea, Reference, IdeaStatus enum
│   ├── constants.ts              # Status arrays, labels, colors
│   └── utils/                    # Date formatters, helpers
├── features/                      # Reusable business UI
│   ├── ideas/
│   │   ├── components/           # IdeaCard, IdeasList, IdeaDetailModal
│   │   ├── hooks/                # useIdeasQuery, useIdeaMutations
│   │   └── index.ts              # Barrel exports
│   ├── references/
│   │   ├── components/           # ReferenceCard, ReferencesList
│   │   └── hooks/
│   ├── notes/
│   │   ├── components/           # NotesEditor (TipTap), entity wrappers
│   │   └── hooks/
│   └── writing/
│       ├── components/           # TipTapEditor, WritingStats
│       └── hooks/
├── domains/                       # Page compositions
│   ├── writing/
│   │   ├── WritingView.tsx       # Domain coordinator with tabs
│   │   ├── EditorView.tsx        # Editor page
│   │   ├── IdeasLibraryView.tsx  # Ideas page
│   │   └── ArchiveView.tsx       # Archive page
│   ├── research/
│   │   ├── ResearchView.tsx      # Domain coordinator
│   │   ├── StreamView.tsx        # Stream page
│   │   └── ...                   # Other research views
│   └── system/
│       ├── SystemView.tsx        # Domain coordinator
│       └── ...                   # Settings, logs, tasks, storage
└── App.tsx                        # Main shell with routing
```

**Key Principles**:
1. **Features are dumb UI** - Accept props, emit events, no data fetching
2. **Domains handle wiring** - Compose features, manage state, handle queries
3. **Shared types prevent drift** - Backend-aligned enums in shared/types.ts
4. **Zustand for cross-view state** - Active idea, filters, selection
5. **Radix everywhere** - No native HTML form elements, full accessibility

---

## 🎯 RECENT WORK: Article Viewer Context Menu + Editor Rebuild

**Completed December 16, 2025**:

### ✅ COMPLETED: Complete Ideas Workflow - Modal Based UI

**Completed**: December 16, 2025

**User Story**: 
> "I want to click 'New Idea' with a dialog to set title/metadata, attach resources (from feed or external), add notes to the idea, add notes to each resource, and view articles."

**Implementation**: Full modal-based workflow with Radix UI dialogs

#### What Was Built:

1. ✅ **NewIdeaDialog** - Modal form for creating ideas
   - File: `frontend/src/writing/components/ideas/NewIdeaDialog.tsx` (189 lines)
   - Form fields: Title (required), Summary, Status, Priority, Target audience
   - Validation: Title required before submission
   - Success: Creates idea, shows toast, navigates to editor
   - Triggered by "New Idea" button in Ideas Library

2. ✅ **IdeaDetailModal** - Comprehensive idea editing modal
   - File: `frontend/src/writing/components/ideas/IdeaDetailModal.tsx` (454 lines)
   - Three tabs:
     - **Details**: Edit title, summary, status, priority, target + Save button
     - **Notes**: Full-height markdown editor for idea notes + Save button
     - **References**: List of attached resources with actions
   - Triggered by clicking any idea card in Ideas Library
   - Integrates AddReferenceDialog and ArticleModal

3. ✅ **AddReferenceDialog** - Attach resources to ideas
   - File: `frontend/src/writing/components/editor/AddReferenceDialog.tsx` (202 lines)
   - Two tabs:
     - **Manual URL**: Form with title, URL, description (working)
     - **From Feed**: Article picker (placeholder for future)
   - Validation: Title and URL required
   - Creates reference with `referenceType='manual'`

4. ✅ **Backend Reference System**
   - Migration 005: Created `idea_references` table with CASCADE delete
   - File: `backend/migrations/005_idea_references_up.sql` (50 lines)
   - Schema: idea_id, reference_type, title, url, description, notes_markdown, timestamps
   - Indexes on idea_id, news_article_id, added_at DESC
   - Migrated existing `news_article_id` data to new table

5. ✅ **Reference CRUD Operations**
   - Entity: `backend/src/writing/components/ideas/entities/idea_references.rs` (54 lines)
   - Handlers: `backend/src/writing/components/ideas/references.rs` (165 lines)
   - Commands (4 new):
     - `list_idea_references(ideaId)` - Get all references for idea
     - `add_reference_to_idea(input)` - Create new reference
     - `remove_reference(referenceId)` - Delete reference with confirmation
     - `update_reference_notes(input)` - Update notes (backend ready, UI pending)
   - DTOs: IdeaReferenceDto, AddReferenceInput, UpdateReferenceNotesInput
   - Validation: Type checking, required fields, URL format

6. ✅ **Ideas Library Integration**
   - File: `frontend/src/writing/components/ideas/IdeasLibraryView.tsx` (modified)
   - Made idea cards clickable → opens IdeaDetailModal
   - "New Idea" button → opens NewIdeaDialog
   - Delete button with event propagation fix
   - Both dialogs properly wired with state management

#### Features:
- **Modal-Based UX**: All editing in dialogs for better focus
- **Reference Management**: View, add, delete references with icons
- **Article Viewing**: Eye icon opens ArticleModal, link icon opens browser
- **Two-Level Notes**: Idea-level notes + per-reference notes (UI pending)
- **Query Invalidation**: TanStack Query ensures UI stays fresh
- **Toast Notifications**: User feedback for all actions
- **Theme-Aware**: Uses CSS custom properties for light/dark themes
- **Radix UI Primitives**: Accessible, keyboard-navigable components

#### Testing Status:
- ✅ Backend compiles (18 warnings, 0 errors)
- ✅ Frontend builds (chunk size warnings expected)
- ✅ Migration 005 applied successfully
- ✅ All 4 commands registered in main.rs
- 🧪 App running in dev mode, ready for manual testing

#### Documentation:
- `docs/ideas-workflow-complete.md` - Comprehensive implementation guide
- `docs/ideas-workflow-guide.md` - Visual diagrams and quick reference

#### Known Limitations:
- "From Feed" tab placeholder (backend supports `article` type)
- Reference notes editing UI not implemented (backend command exists)
- Article viewer context menu IPC still pending (separate issue)

#### Next Steps:
- 🔜 Implement "From Feed" article picker in AddReferenceDialog
- 🔜 Add reference notes editing UI (inline or modal)
- 🔜 Test complete workflow end-to-end
- 🔜 Fix article viewer context menu IPC invocation

---

### Article Viewer Context Menu (In Progress)
- ✅ Implemented Tauri WebviewWindow for article viewing
- ✅ Created custom context menu with script injection
- ✅ Context menu appears on right-click with text selection
- ✅ Full native menu prevention (capture phase, max z-index)
- ✅ Visual feedback (green on success, red on error)
- ✅ Extensive debug logging for troubleshooting
- ⏳ **Current Issue**: Menu displays but `add_highlight` command not yet firing
- 🔄 **Next**: Debug IPC invocation from injected script to backend

**Technical Implementation**:
- `backend/src/writing/components/article_viewer.rs` - WebviewWindow + context menu injection
- `backend/src/writing/commands.rs` - `open_article_modal`, `add_highlight` commands
- Custom menu: Black background, white text, hover effects, auto-hide on scroll/click
- Script injects `window.__TAURI_IDEA_ID` for context passing
- Console logs: `[Article Viewer]` prefix for tracking all events

### Writing Mode - Editor Rebuild
- ✅ Rebuilt EditorView from 3-column to 2-column layout
- ✅ Moved metadata/notes/references from sidebar to hover cards
- ✅ Implemented React Portal hover cards with controlled Select state
- ✅ Fixed hover card + Select dropdown interaction (150ms delay + state tracking)
- ✅ Removed dead code: MetadataCard.tsx, NotesCard.tsx, ReferenceCard.tsx
- ✅ Added reference-level notes support (IdeaReference interface)
- ✅ Documented hover card pattern in LAYOUT_GUIDE.md

### Radix UI Component Audit
- ✅ Replaced all native HTML form elements with Radix primitives
- ✅ IdeasLibraryView: 3 native selects → Radix Select
- ✅ Created 6 new UI components: DropdownMenu, Checkbox, RadioGroup, Label, Separator, Switch
- ✅ Updated ConfirmDialog with AlertDialog wrapper
- ✅ All 15 Radix packages verified and documented

### Known Issue Fixed
**Problem**: Radix Select dropdown closes HoverCard immediately when opened  
**Root Cause**: Select content renders in portal outside HoverCard DOM  
**Solution**: Controlled Select state + 150ms timeout + relatedTarget check  
**Reference**: See LAYOUT_GUIDE.md "Radix Select + HoverCard Interaction" section

---

## 🎯 TOP PRIORITY: Frontend Refactoring - Main View Rebuild

**Current Task**: Rebuild App.tsx with Radix Navigation Menu  
**Goal**: Clean, accessible navigation with proper layout hierarchy  
**Status**: ✅ COMPLETE - All 6 phases done (2h 10min)

**Completed December 16, 2025**:
- Installed @radix-ui/react-navigation-menu
- Created AppNavigation.tsx (single horizontal nav with dropdowns)
- Created NavigationDropdown.tsx (reusable dropdown component)
- Extracted ThemeSwitcher.tsx
- Updated App.tsx to use new navigation
- Cleaned ModeContext (removed UI-specific state)
- Removed old TopNav.tsx and SideNav.tsx
- Added CSS animations for smooth transitions
- Build successful (4.84s, 262.24 kB main bundle)
- App running with full keyboard navigation and accessibility

### Design: Radix Navigation Menu Structure

**Architecture**: Using [Radix Navigation Menu](https://www.radix-ui.com/primitives/docs/components/navigation-menu) for main navigation

**3-Tier Layout**:
1. **App.tsx (Main View)** - Shell with Radix NavigationMenu
2. **Domain Views** (ResearchView, WritingView, SystemView) - Radix Tabs for sub-navigation
3. **Component Views** - Feature-specific layouts

**Navigation Pattern**:
```tsx
<NavigationMenu.Root>
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Trigger>Writing</NavigationMenu.Trigger>
      <NavigationMenu.Content>
        {/* Editor, Ideas, Archive links */}
      </NavigationMenu.Content>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Trigger>Research</NavigationMenu.Trigger>
      <NavigationMenu.Content>
        {/* Stream, Feed Sources, News, Reddit links */}
      </NavigationMenu.Content>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Trigger>System</NavigationMenu.Trigger>
      <NavigationMenu.Content>
        {/* Settings, Storage, Logs, Tasks links */}
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  </NavigationMenu.List>
</NavigationMenu.Root>
```

**Key Features**:
- Full keyboard navigation (arrow keys, Tab, Enter, Escape)
- ARIA compliant out of the box
- Animated dropdowns with enter/exit transitions
- Indicator animation showing active menu
- Flexible content layout (links, descriptions, icons)

**Design Document**: [frontend/NAVIGATION_DESIGN.md](frontend/NAVIGATION_DESIGN.md) ✅ COMPLETE

**Implementation Checklist** (2 hours 10 min total):

### Phase 1: Setup (15 min) ✅ COMPLETE
- [x] Install `@radix-ui/react-navigation-menu`
- [x] Create `AppNavigation.tsx` in core/components/layout/
- [x] Create `NavigationDropdown.tsx` in core/components/layout/
- [x] Extract `ThemeSwitcher.tsx` from TopNav

### Phase 2: Build Navigation Component (30 min) ✅ COMPLETE
- [x] Implement `AppNavigation` with 3 domain triggers
- [x] Implement `NavigationDropdown` reusable component
- [x] Add icons and labels for all 11 views
- [x] Wire up ModeContext integration (setMode + setView)

### Phase 3: Styling with CSS Custom Properties (30 min) ✅ COMPLETE
- [x] Style navigation triggers (domain buttons)
- [x] Style dropdown content (view links)
- [x] Add hover states and transitions
- [x] Implement active indicator animation
- [x] Add dropdown enter/exit animations

### Phase 4: Integration Testing (20 min) ✅ COMPLETE
- [x] Test keyboard navigation (Tab, Enter, Escape, Arrows)
- [x] Test mouse interaction (hover, click)
- [x] Verify active states highlight correctly
- [x] Test mode/view switching works end-to-end

### Phase 5: Cleanup Old Code (15 min) ✅ COMPLETE
- [x] Remove TopNav.tsx
- [x] Remove SideNav.tsx  
- [x] Update App.tsx to use AppNavigation
- [x] Clean up ModeContext (remove isSideNavOpen, toggleSideNav)
- [x] Run build and verify no errors

### Phase 6: Polish & Accessibility (20 min) ✅ COMPLETE
- [x] Radix UI handles ARIA labels and roles automatically
- [x] Full keyboard navigation built-in (Tab, Enter, Escape, Arrows)
- [x] Responsive design with CSS custom properties
- [x] Documentation updated (NAVIGATION_DESIGN.md)

---

## � Frontend Rebuild Sprint Tasks

**Estimated Total Time**: 60-80 hours over 2 weeks  
**Start Date**: December 17, 2025  
**Target Completion**: December 31, 2025

### Week 1: Foundation + Ideas Feature (Dec 17-23)

#### Day 1: Foundation (4-6 hours)
- [ ] **Bootstrap new src/ structure**
  - [ ] Create folder hierarchy (core, shared, ui, features, domains)
  - [ ] Configure Vite path aliases (@core, @features, @domains, @shared, @ui)
  - [ ] Create index.ts barrel exports for each major folder
  - [ ] Set up TypeScript strict mode and path resolution

- [ ] **Install & configure Radix Themes**
  - [ ] Install `@radix-ui/themes` package
  - [ ] Create ThemeProvider with Dark/Light/Cyberpunk presets
  - [ ] Define custom color scales for Cyberpunk theme
  - [ ] Build theme switcher using Radix DropdownMenu
  - [ ] Persist theme to localStorage

- [ ] **Core infrastructure**
  - [ ] Create core/api/tauri.ts with typed invoke wrappers
  - [ ] Set up TanStack Query provider with devtools
  - [ ] Create ToastProvider using Radix Toast
  - [ ] Build AppShell with Radix Navigation Menu
  - [ ] Set up React Router for domain routing

- [ ] **Domain types and constants**
  - [ ] Create shared/types.ts (Idea, Reference, IdeaStatus, Priority)
  - [ ] Create shared/constants.ts (IDEA_STATUSES, status labels/colors)
  - [ ] Create shared/utils/ (date formatters, string helpers)
  - [ ] Align all types with backend exactly (in_progress, stalled, complete)

#### Day 2-3: Ideas Feature - Data Layer (8-10 hours)
- [ ] **Build Zustand stores**
  - [ ] Create core/stores/useIdeasStore.ts
  - [ ] Add activeIdeaId, setActiveIdeaId, clearActiveIdea
  - [ ] Add filters (search, status, priority), setFilters
  - [ ] Add selectedIds (multi-select), toggleSelection, clearSelection
  - [ ] Use Zustand persist middleware for filters

- [ ] **Create Ideas data layer**
  - [ ] Build features/ideas/hooks/useIdeasQuery.ts
  - [ ] Build features/ideas/hooks/useIdeaMutations.ts
  - [ ] Salvage Tauri command calls from src-old/hooks/queries.ts
  - [ ] Implement optimistic updates for mutations
  - [ ] Add proper query invalidation patterns

- [ ] **Build atomic IdeaCard component**
  - [ ] Create features/ideas/components/IdeaCard.tsx
  - [ ] Implement 3 variants: full, compact, archive
  - [ ] Use Radix Card primitive
  - [ ] Use Radix DropdownMenu for actions
  - [ ] Salvage styling from src-old IdeasLibraryView
  - [ ] Integrate with Zustand for selection state

#### Day 4: Ideas Feature - UI Components (6-8 hours)
- [ ] **Build IdeasList component**
  - [ ] Create features/ideas/components/IdeasList.tsx
  - [ ] Pure presentational - accept ideas, variant, callbacks
  - [ ] Render grid or list based on variant
  - [ ] Add empty state with Radix-based design
  - [ ] Handle keyboard navigation (arrows, enter)

- [ ] **Build IdeaDetailModal**
  - [ ] Create features/ideas/components/IdeaDetailModal.tsx
  - [ ] Use Radix Dialog primitive
  - [ ] Add Radix Tabs (Details, Notes, References)
  - [ ] Wire up mutations with loading states
  - [ ] Add toast notifications for all actions

- [ ] **Extract TipTap notes editor**
  - [ ] Create features/notes/components/NotesEditor.tsx
  - [ ] Salvage TipTap config from src-old/writing/components/editor/NotesEditor.tsx
  - [ ] Make entity-aware (entityType, entityId props)
  - [ ] Create IdeaNotesEditor wrapper with Tauri invoke logic

#### Day 5: Ideas Domain View (4-5 hours)
- [ ] **Build IdeasLibraryView**
  - [ ] Create domains/writing/IdeasLibraryView.tsx
  - [ ] Compose IdeasList with useIdeasQuery data
  - [ ] Add filter bar (Radix Select, Radix TextField)
  - [ ] Add toolbar (New Idea, bulk actions)
  - [ ] Integrate Zustand for filters and selection
  - [ ] Handle modal open/close with IdeaDetailModal

- [ ] **Build NewIdeaDialog**
  - [ ] Create features/ideas/components/NewIdeaDialog.tsx
  - [ ] Use Radix Dialog with form fields
  - [ ] Wire up create mutation
  - [ ] Add success toast and navigation

- [ ] **Test Ideas feature end-to-end**
  - [ ] Create/read/update/archive ideas
  - [ ] Multi-select and bulk archive
  - [ ] Keyboard navigation
  - [ ] Theme switching
  - [ ] Backend command validation

#### Day 6: Archive & Editor Views (3-4 hours)
- [ ] **Build ArchiveView**
  - [ ] Create domains/writing/ArchiveView.tsx
  - [ ] Use IdeasList with variant="archive"
  - [ ] Filter ideas by dateRemoved not null
  - [ ] Add restore and delete actions

- [ ] **Build EditorView skeleton**
  - [ ] Create domains/writing/EditorView.tsx
  - [ ] Three-column layout (IdeasSidebar, TipTapEditor, RightSidebar)
  - [ ] Wire up Zustand activeIdeaId
  - [ ] Salvage TipTap from src-old
  - [ ] Synchronize editor with active idea

#### Day 7: References Feature (4-5 hours)
- [ ] **Build References feature**
  - [ ] Create features/references/components/ReferenceCard.tsx
  - [ ] Create features/references/components/ReferencesList.tsx
  - [ ] Create features/references/hooks/useReferencesQuery.ts
  - [ ] Create mutation hooks (add, update, delete)
  - [ ] Integrate into IdeaDetailModal references tab
  - [ ] Integrate into EditorView right sidebar

### Week 2: Research + System Domains (Dec 24-31)

#### Day 8-9: Research Domain - Stream & Feed Sources (8-10 hours)
- [ ] **Build Research data layer**
  - [ ] Create features/news/hooks/useNewsQuery.ts
  - [ ] Create features/news/hooks/useNewsMutations.ts
  - [ ] Create features/feeds/hooks/useFeedSourcesQuery.ts
  - [ ] Create features/feeds/hooks/useFeedMutations.ts

- [ ] **Build article components**
  - [ ] Create features/news/components/ArticleCard.tsx
  - [ ] Create features/news/components/ArticlesList.tsx
  - [ ] Use Radix Card and DropdownMenu
  - [ ] Add star, dismiss, open actions

- [ ] **Build feed source components**
  - [ ] Create features/feeds/components/FeedSourceCard.tsx
  - [ ] Create features/feeds/components/FeedSourceDialog.tsx
  - [ ] Add sync, edit, delete actions

- [ ] **Build Research domain views**
  - [ ] Create domains/research/ResearchView.tsx (coordinator with tabs)
  - [ ] Create domains/research/StreamView.tsx
  - [ ] Create domains/research/FeedSourcesView.tsx
  - [ ] Add filters and search
  - [ ] Wire up queries and mutations

#### Day 10-11: System Domain - Settings, Logs, Tasks (8-10 hours)
- [ ] **Build System data layer**
  - [ ] Create features/settings/hooks/useSettingsQuery.ts
  - [ ] Create features/logs/hooks/useLogsQuery.ts
  - [ ] Create features/tasks/hooks/useTasksQuery.ts
  - [ ] Create mutation hooks for each feature

- [ ] **Build system components**
  - [ ] Create features/settings/components/SettingsSection.tsx
  - [ ] Create features/logs/components/LogsTable.tsx
  - [ ] Create features/logs/components/LogsFilters.tsx
  - [ ] Create features/tasks/components/TaskCard.tsx
  - [ ] Create features/tasks/components/TasksList.tsx

- [ ] **Build System domain views**
  - [ ] Create domains/system/SystemView.tsx (coordinator with tabs)
  - [ ] Create domains/system/SettingsView.tsx
  - [ ] Create domains/system/LogsView.tsx
  - [ ] Create domains/system/TasksView.tsx
  - [ ] Create domains/system/StorageView.tsx
  - [ ] Add "Coming Soon" placeholders where needed

#### Day 12-13: Integration & Testing (6-8 hours)
- [ ] **Build WritingView coordinator**
  - [ ] Create domains/writing/WritingView.tsx
  - [ ] Add Radix Tabs (Editor, Ideas, Archive)
  - [ ] Wire up tab navigation

- [ ] **End-to-end testing**
  - [ ] Test all Ideas workflows (create, edit, archive, restore)
  - [ ] Test all Research workflows (view articles, manage sources)
  - [ ] Test all System workflows (settings, logs, tasks)
  - [ ] Test keyboard navigation across all views
  - [ ] Test theme switching (Dark, Light, Cyberpunk)
  - [ ] Validate all backend commands match exactly

- [ ] **Polish & bug fixes**
  - [ ] Fix any styling inconsistencies
  - [ ] Add loading states where missing
  - [ ] Improve error handling
  - [ ] Add success/error toasts consistently
  - [ ] Test responsive layouts

#### Day 14: Documentation (4 hours)
- [ ] **Create ARCHITECTURE.md**
  - [ ] Document folder structure
  - [ ] Document barrel export pattern
  - [ ] Document Zustand conventions
  - [ ] Document TanStack Query patterns
  - [ ] Document Radix component usage
  - [ ] Document naming conventions
  - [ ] Provide feature implementation examples

- [ ] **Update existing docs**
  - [ ] Update README.md with new architecture
  - [ ] Update BUILD_GUIDE.md with new structure
  - [ ] Add troubleshooting section
  - [ ] Add screenshots of new UI

### Completion Criteria

**Must Have** ✅:
- All 3 domains (Writing, Research, System) functional
- Ideas feature complete (create, edit, archive, restore, multi-select)
- References feature complete (add, edit, delete)
- Notes editor working with TipTap
- All backend commands validated
- Theme switching working (Dark, Light, Cyberpunk)
- Keyboard navigation throughout
- No console errors or warnings

**Nice to Have** 🎯:
- Smooth animations and transitions
- Accessibility audit passed
- Performance optimizations
- Bundle size < 500KB
- All "Coming Soon" placeholders replaced with real UI

---

## 🔧 Frontend Refactoring & Cleanup (DEPRECATED - See Rebuild Above)

**Status**: ❌ ABANDONED - Full rebuild approach chosen  
**Reason**: Incremental refactoring proved too complex with existing technical debt

### Current Issues Identified

1. **Structural Problems**:
   - 1152-line monolithic `queries.ts` (should be ~200 lines per domain)
   - Mixing `/views` and `/components` with no clear pattern
   - Empty `components/layout/` directory (layout components in `navigation/`)
   - No domain alignment with backend (writing/, research/, system/, core/)

2. **Bloated Components**:
   - `NewsFeedDialog.tsx` - 657 lines (split into 4 files)
   - `SettingsView.tsx` - 454 lines (split into 5 sections)
   - `WritingView.tsx` - 388 lines (split into 3 components)

3. **Dead Code**:
   - `SettingsView.tsx.old` - OLD BACKUP FILE
   - `SourcesView.tsx` - 147 lines mock data (replaced by FeedSourcesView)
   - `RedditView.tsx` - 104 lines mock data (not connected)

4. **Domain Misalignment**:
   - Backend: clean writing/, research/, system/, core/ structure
   - Frontend: flat components/ mixing concerns

### Target Architecture ⭐ 3-Tier Hierarchy + Feature Co-location

**Architecture Pattern**: 3-tier view hierarchy with feature-based component isolation

#### 3-Tier View Hierarchy

**Layer 1: Main View** - `App.tsx`
- Application shell with Radix NavigationMenu
- Single horizontal navigation replacing TopNav + SideNav
- Domain dropdowns (Writing, Research, System)
- Theme switcher
- No business logic, pure layout

**Layer 2: Domain Views** - `DomainView.tsx` (e.g., `ResearchView.tsx`)
- Domain coordinator with Radix Tabs for sub-navigation
- Manages domain-level state and routing
- Renders component views based on active tab
- Example: `ResearchView.tsx` → Stream | Feed Sources | News | Reddit tabs

**Layer 3: Component Views** - Inside component folders
- Feature-specific layout and logic
- Lives in `domain/components/feature/FeatureView.tsx`
- Example: `research/components/stream/StreamView.tsx`
- Isolated, testable, reusable

#### File Structure

```
frontend/src/
├── App.tsx                        # Layer 1: Main shell with Radix NavigationMenu
│
├── core/                          # Infrastructure (no business logic)
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── layout/
│   │   │   ├── AppNavigation.tsx     # NEW: Radix NavigationMenu
│   │   │   ├── NavigationDropdown.tsx # NEW: Dropdown content
│   │   │   └── ThemeSwitcher.tsx     # Extracted from old TopNav
│   │   └── ui/                   # Radix UI primitives (Button, Card, etc.)
│   ├── hooks/                    # use-toast, useErrorHandler
│   ├── context/                  # ModeContext (pure state, no UI)
│   ├── lib/                      # cn helper, formatters
│   ├── theme/                    # ThemeProvider, tokens.css
│   └── vendor/                   # MDEditor, MarkdownPreview overrides
│
├── writing/                       # Writing domain
│   ├── WritingView.tsx           # Layer 2: Domain coordinator with Radix Tabs
│   └── components/
│       ├── editor/               # ✨ Complete feature
│       │   ├── EditorView.tsx    # Layer 3: Component view
│       │   ├── EditorToolbar.tsx
│       │   ├── EditorStats.tsx
│       │   ├── queries.ts        # Feature-specific queries (~50 lines)
│       │   └── types.ts
│       ├── ideas/                # ✨ Complete feature
│       │   ├── IdeasView.tsx     # Layer 3: Component view
│       │   ├── IdeaCard.tsx
│       │   ├── IdeaSidebar.tsx
│       │   ├── queries.ts        # Feature-specific queries (~150 lines)
│       │   └── types.ts
│       └── archive/              # ✨ Complete feature
│           ├── ArchiveView.tsx   # Layer 3: Component view
│           ├── queries.ts
│           └── types.ts
│
├── research/                      # Research domain
│   ├── ResearchView.tsx          # Layer 2: Domain coordinator with Radix Tabs
│   └── components/
│       ├── stream/               # ✨ Complete feature
│       │   ├── StreamView.tsx    # Layer 3: Component view
│       │   ├── StreamArticleCard.tsx
│       │   ├── queries.ts        # Feature-specific queries (~100 lines)
│       │   └── types.ts
│       ├── feed-sources/         # ✨ Complete feature
│       │   ├── FeedSourcesView.tsx  # Layer 3: Component view
│       │   ├── FeedSourceCard.tsx
│       │   ├── FeedSourceDialog.tsx
│       │   ├── queries.ts        # Feature-specific queries (~200 lines)
│       │   └── types.ts
│       ├── news-feed/            # ✨ Complete feature
│       │   ├── NewsFeedView.tsx  # Layer 3: Component view
│       │   ├── NewsFeedDialog.tsx
│       │   ├── NewsArticleCard.tsx
│       │   ├── queries.ts        # Feature-specific queries (~100 lines)
│       │   └── types.ts
│       └── reddit/               # ✨ Complete feature
│           ├── RedditView.tsx    # Layer 3: Component view
│           ├── RedditCard.tsx
│           ├── queries.ts        # Feature-specific queries (~50 lines)
│           └── types.ts
│
├── system/                        # System domain
│   ├── SystemView.tsx            # Layer 2: Domain coordinator with Radix Tabs
│   └── components/
│       ├── settings/             # ✨ Complete feature
│       │   ├── SettingsView.tsx  # Layer 3: Component view
│       │   ├── SettingsSection.tsx
│       │   ├── queries.ts        # Feature-specific queries (~80 lines)
│       │   └── types.ts
│       ├── storage/              # ✨ Complete feature
│       │   ├── StorageView.tsx   # Layer 3: Component view
│       │   ├── StorageMetrics.tsx
│       │   ├── BackupList.tsx
│       │   ├── queries.ts        # Feature-specific queries (~150 lines)
│       │   └── types.ts
│       ├── logs/                 # ✨ Complete feature
│       │   ├── LogsView.tsx      # Layer 3: Component view
│       │   ├── LogsFilters.tsx
│       │   ├── LogsTable.tsx
│       │   ├── queries.ts        # Feature-specific queries (~100 lines)
│       │   └── types.ts
│       └── tasks/                # ✨ Complete feature
│           ├── TasksView.tsx     # Layer 3: Component view
│           ├── TaskCard.tsx
│           ├── TaskList.tsx
│           ├── queries.ts        # Feature-specific queries (~100 lines)
│           └── types.ts
│
└── setup/                         # First-time setup domain
    ├── SetupView.tsx             # Layer 2: Setup wizard coordinator
    └── components/
        ├── user-info/            # ✨ Complete feature
        │   ├── UserInfoForm.tsx
        │   ├── queries.ts
        │   └── types.ts
        └── directories/          # ✨ Complete feature
            ├── DirectorySetup.tsx
            ├── queries.ts
            └── types.ts
```

#### Key Architectural Principles

**Navigation (NEW)**:
- ✅ Single Radix NavigationMenu (replaces TopNav + SideNav)
- ✅ Full keyboard navigation and ARIA compliance
- ✅ Domain dropdowns with view links
- ✅ No mobile overlay complexity

**3-Tier Separation**:
- ✅ **App.tsx** = Shell only (never changes)
- ✅ **DomainView** = Coordinator with tabs (mode-specific logic)
- ✅ **ComponentView** = Feature implementation (isolated, testable)

**Feature Isolation**:
- ✅ **Complete isolation**: Everything for "stream" in `research/components/stream/`
- ✅ **Easy discovery**: All stream code in one place
- ✅ **Easy deletion**: Remove feature by deleting one folder
- ✅ **Small files**: 50-200 lines per file (vs 1152 monolithic)
- ✅ **Co-located queries**: Feature queries live with feature code

**Quality Standards**:
- ✅ **Radix UI only** for all interactive components
- ✅ **CSS custom properties** (no hardcoded Tailwind colors)
- ✅ **LAYOUT_GUIDE patterns** (h-full chains, ScrollArea, flex-1)
- ✅ **Accessibility built-in** (ARIA, keyboard nav)

### Migration Plan

**Phase 1: Quick Cleanup** (30 min) ✅ COMPLETE - December 15, 2025
- [x] Delete dead code files (SettingsView.tsx.old, SourcesView.tsx)
- [x] Document refactoring plan with feature-based architecture
- [x] Create REFACTOR_FRONTEND.md (comprehensive 8-phase plan)
- [x] Updated structure to use feature co-location (queries + components together)
- [x] Verified build still works (5.18s, 247.61 kB)

**Phase 2: Create Domain Folders** (30 min) ✅ COMPLETE - December 15, 2025
- [x] Create domain folder structure (writing/, research/, system/, setup/, core/)
- [x] Create index.ts exports for each domain
- [x] Create component subdirectories

**Phase 3: Move Core Infrastructure** (1 hour) ✅ COMPLETE - December 15, 2025
- [x] Move ui/ to core/components/ui/
- [x] Move lib/ to core/lib/
- [x] Move theme/ to core/theme/
- [x] Move context/ to core/context/
- [x] Move vendor/ to core/vendor/
- [x] Update tsconfig.json and vite.config.ts with path aliases
- [x] Build passing (5.60s)

**Phase 4: Component-by-Component Migration** (ONGOING)
**Approach**: One component at a time, ensuring Radix UI + CSS custom properties + proper layout

**Migration Checklist Per Component**:
1. Rewrite component view with Radix UI primitives
2. Replace all Tailwind colors with CSS custom properties
3. Extract component logic into smaller files (<200 lines)
4. Create queries.ts with only component-specific queries
5. Create types.ts with component-specific types
6. Test build and functionality
7. Move to next component

**Component Order** (simplest to most complex):
1. ✅ research/components/stream/ (StreamView, StreamArticleCard) - RADIX UI COMPLETE
   - [x] StreamView.tsx - Radix Select for filters
   - [x] StreamArticleCard.tsx - CSS custom properties
   - [ ] Create queries.ts (extract useNewsArticles, useToggleStarArticle, etc.)
   - [ ] Create types.ts
   - [ ] Create ResearchView.tsx domain coordinator

2. 🔄 research/components/feed-sources/
   - [ ] FeedSourcesView.tsx - Component layout
   - [ ] FeedSourceCard.tsx - Convert to Radix Dropdown Menu
   - [x] FeedSourceDialog.tsx - Already Radix compliant
   - [ ] Create queries.ts (extract all feed source CRUD)
   - [ ] Create types.ts

3. ⏳ system/components/logs/
4. ⏳ system/components/tasks/
5. ⏳ system/components/storage/
6. ⏳ system/components/settings/
7. ⏳ research/components/news-feed/
8. ⏳ research/components/reddit/
9. ✅ writing/components/editor/ - RADIX UI COMPLETE (December 16, 2025)
   - [x] EditorView.tsx - Rebuilt 2-column layout (was 3-column)
   - [x] IdeasSidebar.tsx - Complete rebuild with hover cards
   - [x] Removed MetadataCard.tsx, NotesCard.tsx, ReferenceCard.tsx (dead code)
   - [x] React Portal hover cards with controlled Select state
   - [x] CSS custom properties throughout
   - [ ] Create queries.ts (extract article/idea queries)
   - [ ] Backend integration for idea references
10. 🔄 writing/components/ideas/ (IdeasLibraryView) - RADIX UI COMPLETE
   - [x] IdeasLibraryView.tsx - All native selects replaced with Radix Select
   - [x] CSS custom properties
   - [x] ConfirmDialog for delete confirmations
   - [ ] Create queries.ts
   - [ ] Create types.ts

### Options

- **Option A**: Quick cleanup (30 min) → continue with Tasks #9-#12 → refactor after MVP
- **Option B**: Full refactoring now (4-6 hours) → complete restructure → resume tasks
- **Option C**: Hybrid (2 hours) → gradual migration while working on remaining tasks

**Recommended**: Option A - Finish MVP first, refactor when everything works

---

## �🎯 Current Sprint: Research Mode - Feed Management System

**Goal**: Build modular, plugin-ready feed system with stream view  
**Timeline**: December 15-18, 2025  
**Status**: 8/12 Complete (67%) - Backend ✅, Stream ✅, Cleanup ✅

### Progress Summary

**✅ Completed (8 tasks)**:
- Task #1-4: Backend foundation (plugin system, NewsData, CRUD commands)
- Task #5-6: Feed Sources UI & navigation
- Task #7-8: Stream view & backend filtering
- Navigation & settings cleanup

**🔴 Remaining (4 tasks)**:
- Task #9: Migration logic (move old NewsData settings to first source)
- Task #10: Scheduler updates (per-source sync tasks)
- Task #11: Integration testing
- Task #12: Documentation

**📋 Frontend Refactoring (Post-MVP)**:
- Phase 1: ✅ COMPLETE (dead code deleted, REFACTOR_FRONTEND.md created)
- Phases 2-8: Execute after Task #12 complete
- See REFACTOR_FRONTEND.md for detailed plan

---

## 📋 Active Sprint Tasks

### Phase 4: Migration & Cleanup

#### Task #9: Migration Logic for Old Settings (Deferred)
**Priority**: LOW - Can be handled manually for now  
**Estimated Effort**: 1 hour

Optional: Migrate existing NewsData settings to first feed source

- [ ] **backend/src/core/components/migrations.rs**:
  - [ ] Add one-time migration function
  - [ ] Check if app_settings has newsdata_api_key
  - [ ] Check if feed_sources table is empty
  - [ ] If both true, create first NewsData.io feed source:
    - Name: "NewsData.io (Default)"
    - source_type: NewsData
    - api_key: migrate from app_settings.newsdata_api_key
    - enabled: migrate from app_settings.news_fetch_enabled
    - schedule: convert app_settings.news_fetch_interval to cron
    - config: migrate countries, categories, languages
  - [ ] Create corresponding system_task
  - [ ] Clear old settings after successful migration
  - [ ] Log migration results

#### Task #10: Scheduler for Per-Source Tasks (Deferred)
**Priority**: MEDIUM - Manual sync works for now  
**Estimated Effort**: 2 hours

Optional: Update scheduler to handle per-source sync tasks

- [ ] **backend/src/system/components/scheduler/executor.rs**:
  - [ ] Add new task type handler: `feed_sync_{source_id}`
    - Parse source_id from task_type string
    - Query feed_source from database by ID
    - Verify source is enabled
    - Get plugin from registry by source_type
    - Call plugin.fetch_articles() with source config
    - Store articles with feed_source_id
    - Log results with source name
    - Update task run history
  - [ ] Update `TaskType` enum to support dynamic feed sync patterns
  - [ ] Remove old `news_sync` task type (replaced by per-source tasks)
  
- [ ] **backend/src/system/components/scheduler/init.rs**:
  - [ ] Remove hardcoded news_sync task seed
  - [ ] On app start, query all feed_sources
  - [ ] For each enabled feed source, ensure system_task exists
  - [ ] Create missing tasks if needed (repair function)
  - [ ] Log task synchronization results

- [ ] **backend/src/research/components/feed/sync.rs**:
  - [ ] Create `sync_single_source(source_id)` function
  - [ ] Query feed source by ID
  - [ ] Get plugin from registry
  - [ ] Call plugin.fetch_articles()
  - [ ] Store articles with proper feed_source_id
  - [ ] Update source.last_sync_at timestamp
  - [ ] Return sync result with article count

---

### Phase 5: Testing & Polish

#### Task #11: Integration Testing 🔴
**Priority**: MEDIUM - Ensure reliability  
**Estimated Effort**: 2 hours

End-to-end testing of feed management system:

- [ ] **Source Management**:
  - [ ] Create NewsData.io source with valid API key
  - [ ] Test API key validation (valid/invalid keys)
  - [ ] Edit source (change name, schedule, config)
  - [ ] Toggle source enable/disable
  - [ ] Delete source and verify cleanup

- [ ] **Article Syncing**:
  - [ ] Manual "Sync Now" from Feed Sources view
  - [ ] Verify articles appear in Stream view
  - [ ] Test multiple sources syncing independently
  - [ ] Verify source_id correctly set on articles
  - [ ] Check scheduler creates per-source tasks

- [ ] **Stream View**:
  - [ ] Filter by source (single, multiple, all)
  - [ ] Filter by date range (today, week, month)
  - [ ] Filter by starred status
  - [ ] Search articles by title/content
  - [ ] Sort by latest/oldest/starred
  - [ ] Star/unstar articles
  - [ ] Dismiss articles
  - [ ] Open external links

- [ ] **Migration**:
  - [ ] Test migration from old NewsData settings
  - [ ] Verify first source created correctly
  - [ ] Verify old settings cleared

#### Task #12: Documentation 🔴
**Priority**: LOW - User guidance  
**Estimated Effort**: 1 hour

Create comprehensive documentation:

- [ ] **PLUGINS.md**:
  - [ ] Overview of plugin architecture
  - [ ] FeedSource trait documentation
  - [ ] Step-by-step guide to create new plugin
  - [ ] Reddit plugin template/example
  - [ ] RSS plugin template/example
  - [ ] Testing plugin implementations
  - [ ] Plugin best practices

- [ ] **README.md updates**:
  - [ ] Add Feed Management section
  - [ ] Document Feed Sources view
  - [ ] Document Stream view features
  - [ ] Add screenshots of new views
  - [ ] Update feature list

- [ ] **Code comments**:
  - [ ] Add rustdoc comments to FeedSource trait
  - [ ] Add rustdoc comments to plugin methods
  - [ ] Add JSDoc comments to query hooks

---

## 🔜 Future Enhancements (Post-Sprint)

### Additional Feed Plugins
- [ ] **Reddit Plugin** - Monitor subreddits, saved posts, mod queue
- [ ] **RSS Plugin** - Generic RSS/Atom feed parser
- [ ] **Twitter/X Plugin** - Timeline, lists, bookmarks
- [ ] **Hacker News Plugin** - Front page, user submissions
- [ ] **Dev.to Plugin** - Followed tags, bookmarks
- [ ] **Medium Plugin** - Reading list, publications
- [ ] **Custom Webhook Plugin** - Generic JSON webhook receiver

### Advanced Features
- [ ] **Source priorities** - Weight articles from certain sources
- [ ] **Duplicate detection** - Same article from multiple sources
- [ ] **Article tagging** - Auto-tag by source, category, keywords
- [ ] **Collections** - Group articles into custom collections
- [ ] **Export feeds** - Generate RSS feed from starred articles
- [ ] **Read later queue** - Separate view for bookmarked articles

---

## 🐛 Known Issues & Technical Debt

### Issue #1: HTTP Client Unwrap() Calls (HIGH ⚠️)
**Priority**: HIGH - Prevent potential panics  
**Estimated Effort**: 15 minutes  
**Locations**: 2 files

- [ ] **research/components/feed/sync.rs** (Line 156)
  - Replace `client.try_clone().unwrap()` with proper error handling
  - Return AppError::Internal on clone failure

- [ ] **research/components/feed/sources.rs** (Line 89)
  - Replace `client.try_clone().unwrap()` with proper error handling
  - Return AppError::Internal on clone failure

### Issue #2: System Mode Integration Testing
**Status**: Deferred until after Feed Management sprint  

System views need comprehensive integration testing:
- Settings validation and persistence
- Storage backup/restore/export/import
- Logs filtering and export
- Task execution and history
- Error handling and performance

---

## 📋 Reference Documents

- **[DONE.md](./docs/DONE.md)** - Completed work archive (6 sprints completed!)
- **[ROADMAP.md](./docs/ROADMAP.md)** - Long-term planning
- **[BUILD_GUIDE.md](./docs/BUILD_GUIDE.md)** - Build instructions
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment
- **[scripts/README.md](./scripts/README.md)** - Build, install, and diagnostic scripts

---

---

## 📊 Sprint Tracking

### Current Sprint: Frontend Rebuild (Dec 17-31, 2025)

**Week 1 Progress** (Dec 17-23):
- [ ] Day 1: Foundation (0/4 tasks)
- [ ] Day 2-3: Ideas Data Layer (0/3 tasks)
- [ ] Day 4: Ideas UI Components (0/4 tasks)
- [ ] Day 5: Ideas Domain View (0/3 tasks)
- [ ] Day 6: Archive & Editor (0/2 tasks)
- [ ] Day 7: References Feature (0/1 task)

**Week 2 Progress** (Dec 24-31):
- [ ] Day 8-9: Research Domain (0/4 tasks)
- [ ] Day 10-11: System Domain (0/3 tasks)
- [ ] Day 12-13: Integration & Testing (0/3 tasks)
- [ ] Day 14: Documentation (0/2 tasks)

**Completion**: 0/33 major tasks (0%)

---

## 📝 Quick Reference

### Backend Status Values (Source of Truth)
```rust
pub enum IdeaStatus {
    InProgress,   // "in_progress"
    Stalled,      // "stalled"
    Complete,     // "complete"
}
```

### Frontend Must Use These Exact Values
```typescript
export type IdeaStatus = 'in_progress' | 'stalled' | 'complete';

// ❌ NEVER use: 'done', 'backlog', 'in progress' (with space)
// ✅ ALWAYS use: 'complete', 'in_progress', 'stalled'
```

### File Naming Conventions
- Components: `PascalCase.tsx` (IdeaCard.tsx, IdeasList.tsx)
- Hooks: `camelCase.ts` (useIdeasQuery.ts, useIdeaMutations.ts)
- Stores: `camelCase.ts` (useIdeasStore.ts, useFiltersStore.ts)
- Types: `camelCase.ts` (types.ts, constants.ts)
- Barrel exports: `index.ts` in every major folder

### Import Paths (After Setup)
```typescript
import { IdeaCard } from '@features/ideas';
import { NotesEditor } from '@features/notes';
import { useIdeasStore } from '@core/stores';
import { IdeaStatus, IDEA_STATUSES } from '@shared/constants';
```

---

**Last Updated**: December 17, 2025  
**Current Focus**: Frontend Rebuild - Foundation Phase  
**Next Milestone**: Week 1 complete (Ideas feature functional)
