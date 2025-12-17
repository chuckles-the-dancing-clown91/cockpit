# Frontend Refactoring Plan

**Status**: Phase 1-3 Complete ✅ | Component-by-Component Migration In Progress  
**Goal**: Domain-driven architecture with complete feature isolation  
**Approach**: Quality-first, one component at a time (Radix UI + CSS custom properties)  
**Created**: December 15, 2025 | **Updated**: December 15, 2025

---

## Executive Summary

This document outlines a comprehensive refactoring plan to reorganize the frontend codebase to match the backend's clean domain-driven architecture. The current frontend lacks clear domain boundaries, has monolithic files, and mixes concerns across directories.

**Key Goals**:
- Align frontend structure with backend (writing/, research/, system/, core/)
- Split monolithic files into manageable components (<300 lines)
- Improve code discoverability and maintainability
- Enable parallel development across domains
- Remove dead code and duplicates

---

## Current State Analysis

### File Structure Issues

#### 1. Monolithic Files
- **queries.ts** - 1152 lines (should be ~200 lines per domain)
- **NewsFeedDialog.tsx** - 657 lines (should split into 4 files)
- **SettingsView.tsx** - 454 lines (should split into 5 sections)
- **WritingView.tsx** - 388 lines (should split into 3 components)

#### 2. Structural Problems
- Mixing `/views` and `/components` with no clear pattern
- Empty `components/layout/` directory (layout components in `navigation/`)
- No domain alignment with backend (writing/, research/, system/, core/)
- Mock data components not connected to backend (RedditView)

#### 3. Dead Code (CLEANED ✅)
- ~~`SettingsView.tsx.old`~~ - DELETED
- ~~`SourcesView.tsx`~~ - DELETED (replaced by FeedSourcesView)

#### 4. Organization Inconsistencies
- `components/news/` folder with only 1 file (should be in research/)
- Layout components scattered in `navigation/` instead of `layout/`
- UI components mixed with domain components

---

## Target Structure

**Architecture**: Feature-based with complete co-location (component + queries + types together)

```
frontend/src/
├── core/                          # Infrastructure (no business logic)
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # Global error handling
│   │   ├── layout/               # Layout components
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   └── AppLayout.tsx
│   │   └── ui/                   # Foundational UI (shadcn components)
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── ... (all UI primitives)
│   ├── hooks/
│   │   ├── use-toast.tsx         # Toast notifications
│   │   └── useErrorHandler.ts   # Error handling hook
│   ├── context/
│   │   └── ModeContext.tsx       # App-wide state
│   ├── lib/
│   │   └── utils.ts              # Helper functions (cn, formatters)
│   ├── theme/
│   │   ├── ThemeSwitcher.tsx
│   │   └── theme.css
│   └── vendor/
│       └── shadcn/               # Third-party component overrides
│
├── writing/                       # Writing domain
│   ├── WritingView.tsx           # Main layout/coordinator (bare minimum)
│   ├── IdeasLibraryView.tsx      # Ideas library layout
│   ├── ArchiveView.tsx           # Archive layout
│   └── components/
│       ├── editor/               # ✨ Self-contained feature
│       │   ├── Editor.tsx        # Main editor component
│       │   ├── EditorToolbar.tsx # Toolbar controls
│       │   ├── EditorStats.tsx   # Word count, reading time
│       │   ├── queries.ts        # Editor-specific queries (save, load)
│       │   └── types.ts          # Editor types
│       └── ideas/                # ✨ Self-contained feature
│           ├── IdeaCard.tsx      # Individual idea card
│           ├── IdeaSidebar.tsx   # Quick ideas panel
│           ├── IdeasList.tsx     # Ideas list view
│           ├── queries.ts        # Ideas queries (CRUD operations)
│           └── types.ts          # Idea types
│
├── research/                      # Research domain
│   ├── ResearchView.tsx          # Domain coordinator (tabs: Stream | Sources | News | Reddit)
│   └── components/
│       ├── stream/               # ✨ Self-contained feature
│       │   ├── StreamView.tsx    # Component layout + logic
│       │   ├── StreamArticleCard.tsx
│       │   ├── StreamFilters.tsx
│       │   ├── queries.ts        # Stream queries (articles, star, dismiss)
│       │   └── types.ts
│       ├── feed-sources/         # ✨ Self-contained feature
│       │   ├── FeedSourcesView.tsx  # Component layout + logic
│       │   ├── FeedSourceCard.tsx
│       │   ├── FeedSourceDialog.tsx
│       │   ├── queries.ts        # Source CRUD, sync, test connection
│       │   └── types.ts
│       ├── news-feed/            # ✨ Self-contained feature
│       │   ├── NewsFeedView.tsx  # Component layout + logic
│       │   ├── NewsFeedDialog.tsx
│       │   ├── queries.ts        # News feed queries
│       │   └── types.ts
│       └── reddit/               # ✨ Self-contained feature
│           ├── RedditView.tsx    # Component layout + logic
│           ├── RedditCard.tsx
│           ├── queries.ts
│           └── types.ts
│
├── system/                        # System domain
│   ├── SettingsView.tsx          # Settings layout
│   ├── StorageView.tsx           # Storage layout
│   ├── LogsView.tsx              # Logs layout
│   ├── TasksView.tsx             # Tasks layout
│   └── components/
│       ├── settings/             # ✨ Self-contained feature
│       │   ├── SettingsSection.tsx
│       │   ├── StorageSettings.tsx
│       │   ├── WritingSettings.tsx
│       │   ├── AppearanceSettings.tsx
│       │   ├── queries.ts        # Settings queries (get, update)
│       │   └── types.ts
│       ├── storage/              # ✨ Self-contained feature
│       │   ├── StorageMetrics.tsx
│       │   ├── BackupList.tsx
│       │   ├── queries.ts        # Storage queries (backup, restore, export)
│       │   └── types.ts
│       ├── logs/                 # ✨ Self-contained feature
│       │   ├── LogsFilters.tsx
│       │   ├── LogsTable.tsx
│       │   ├── queries.ts        # Logs queries (get, filter, export, clear)
│       │   └── types.ts
│       └── tasks/                # ✨ Self-contained feature
│           ├── TaskCard.tsx
│           ├── TaskList.tsx
│           ├── queries.ts        # Task queries (list, toggle, run)
│           └── types.ts
│
├── setup/                         # First-time setup domain
│   ├── SetupWizardView.tsx       # Setup wizard layout
│   └── components/
│       ├── user-info/            # ✨ Self-contained feature
│       │   ├── UserInfoForm.tsx
│       │   ├── queries.ts
│       │   └── types.ts
│       └── directories/          # ✨ Self-contained feature
│           ├── DirectorySetup.tsx
│           ├── queries.ts
│           └── types.ts
│
├── navigation/                    # Navigation-specific (move to core later)
│   └── SideNav.tsx               # Main navigation
│
├── App.tsx                        # Main app router
├── main.tsx                       # Entry point
└── index.css                      # Global styles
```

**Key Principles**:
- ✨ **Feature folders** are self-contained (component view + queries + types)
- 📄 **3-tier view hierarchy**: Main (App.tsx) → Domain (ResearchView.tsx) → Component (stream/StreamView.tsx)
- 🔒 **No cross-feature imports** - features are isolated
- 📦 **Easy to delete** - remove entire feature by deleting folder
- 🎯 **Clear ownership** - everything for "stream" is in `stream/`
- 🎨 **Quality standards**: Radix UI primitives, CSS custom properties, proper layout

---

## Migration Phases

### ✅ Phase 1: Quick Cleanup (30 min) - COMPLETE

- [x] Delete `SettingsView.tsx.old`
- [x] Delete `SourcesView.tsx` (mock data duplicate)
- [x] Create this REFACTOR_FRONTEND.md document

### ✅ Phase 2: Create Domain Folders (30 min) - COMPLETE

**Goal**: Establish new folder structure without moving files yet

**Status**: Domain folders created, path aliases configured, build passing

```bash
# Create domain directories
mkdir -p frontend/src/core/{components/{layout,ui},hooks,context,lib,theme,vendor}
mkdir -p frontend/src/writing/{components,views,hooks}
mkdir -p frontend/src/research/{components,views,hooks}
mkdir -p frontend/src/system/{components,views,hooks}
mkdir -p frontend/src/setup/{components,hooks}
```

**Create index.ts exports for each domain**:
- `frontend/src/core/index.ts` - Export all core utilities
- `frontend/src/writing/index.ts` - Export writing components
- `frontend/src/research/index.ts` - Export research components
- `frontend/src/system/index.ts` - Export system components

### ✅ Phase 3: Move Core Infrastructure (1 hour) - COMPLETE

**Goal**: Move foundational components that don't contain business logic

**Status**: UI components, lib, theme, context, vendor all moved to core/

1. **Move UI components**:
   ```bash
   mv frontend/src/components/ui/* frontend/src/core/components/ui/
   ```

2. **Move layout components** (currently in navigation/):
   - Create `core/components/layout/AppLayout.tsx` (extract from App.tsx)
   - Create `core/components/layout/AppHeader.tsx` (if needed)
   - Move `ErrorBoundary.tsx` to `core/components/`

3. **Move utilities**:
   ```bash
   mv frontend/src/lib/* frontend/src/core/lib/
   ```

4. **Move theme**:
   ```bash
   mv frontend/src/theme/* frontend/src/core/theme/
   ```

5. **Move context**:
   - Move `ModeContext.tsx` to `core/context/`
   - Keep navigation-specific state separate

6. **Move vendor**:
   ```bash
   mv frontend/src/vendor/* frontend/src/core/vendor/
   ```

7. **Update imports** in moved files to use relative paths

### Phase 4: Component-by-Component Migration (Ongoing)

**Goal**: Migrate each component with quality-first approach

**Approach**: One component at a time, ensuring:
- ✅ Radix UI compliance (all interactive elements)
- ✅ CSS custom properties (no hardcoded colors)
- ✅ Proper layout (LAYOUT_GUIDE patterns)
- ✅ Component view + queries.ts + types.ts co-located
- ✅ Test after each component

**Status**: StreamView and StreamArticleCard rebuilt with Radix UI

**Migration Order**:
1. **research/components/stream/** (IN PROGRESS)
   - [x] StreamView.tsx - Radix Select, CSS custom properties
   - [x] StreamArticleCard.tsx - CSS custom properties
   - [ ] Create queries.ts (extract from monolithic)
   - [ ] Create types.ts
   - [ ] Create ResearchView.tsx domain coordinator

2. **research/components/feed-sources/**
   - [ ] FeedSourcesView.tsx - Main layout
   - [ ] FeedSourceCard.tsx - Radix Dropdown Menu
   - [ ] FeedSourceDialog.tsx - Already Radix compliant
   - [ ] Create queries.ts
   - [ ] Create types.ts

3. **system/components/logs/**
   - [ ] LogsView.tsx - Already using Radix components
   - [ ] Extract LogsFilters.tsx
   - [ ] Extract LogsTable.tsx
   - [ ] Create queries.ts
   - [ ] Create types.ts

4. **system/components/tasks/**
5. **system/components/storage/**
6. **system/components/settings/**
7. **writing/components/editor/**
8. **writing/components/ideas/**

#### Writing Domain
Split by feature folders:

**`writing/components/editor/queries.ts`** (~50 lines):
- Document save/load queries
- Auto-save mutations
- Draft management

**`writing/components/ideas/queries.ts`** (~150 lines):
- `useArticleIdeas()` (all variants)
- `useGetArticleIdea()`
- `useCreateArticleIdea()`
- `useUpdateArticleIdea()`
- `useDeleteArticleIdea()`
- `useArchiveIdea()`
- `useUnarchiveIdea()`
- `useUpdateIdeaStatus()`

**`writing/WritingView.tsx`** (import shared queries if needed):
- `useSystemUser()`
- `useMixedFeed()`
- `useUpcomingEvents()`
- `useSyncCalendar()`

#### Research Domain
Split by feature folders:

**`research/components/stream/queries.ts`** (~100 lines):
- `useNewsArticles()` (with all filters)
- `useNewsArticle()`
- `useToggleStarArticle()`
- `useDismissArticle()`

**`research/components/feed-sources/queries.ts`** (~200 lines):
- `useListFeedSources()`
- `useGetFeedSource()`
- `useCreateFeedSource()`
- `useUpdateFeedSource()`
- `useDeleteFeedSource()`
- `useToggleFeedSource()`
- `useTestFeedConnection()`
- `useSyncFeedSourceNow()`
- `useSyncAllFeedSources()`

**`research/components/news-feed/queries.ts`** (~100 lines):
- News feed dialog specific queries
- Feed refresh mutations

**`research/components/reddit/queries.ts`** (~50 lines):
- Reddit-specific queries

#### System Domain
Split by feature folders:

**`system/components/settings/queries.ts`** (~80 lines):
- `useAppSettings()`
- `useUpdateSetting()`
- `useUpdateSettings()`

**`system/components/storage/queries.ts`** (~150 lines):
- `useStorageStats()`
- `useListBackups()`
- `useBackupDatabase()`
- `useRestoreDatabase()`
- `useDeleteBackup()`
- `useExportData()`
- `useImportData()`

**`system/components/logs/queries.ts`** (~100 lines):
- `useLogs()`
- `useClearLogs()`
- `useExportLogs()`

**`system/components/tasks/queries.ts`** (~100 lines):
- `useScheduledJobs()`
- `useJobHistory()`
- `useToggleJob()`
- `useRunJobNow()`

#### Setup Domain
Split by feature folders:

**`setup/components/user-info/queries.ts`** (~50 lines):
- User setup queries

**`setup/components/directories/queries.ts`** (~50 lines):
- Directory configuration queries

**Steps**:
1. Create feature folders with queries.ts files
2. Copy feature-specific queries from monolithic file
3. Update imports in feature components (relative paths)
4. Delete original monolithic queries.ts
5. Update view imports to use feature-specific paths
6. Each feature imports only its own queries (no cross-feature dependencies)

### Phase 5: Reorganize Writing Domain (30 min)

**Goal**: Create feature folders with complete co-location

1. **Create feature folders**:
   ```bash
   mkdir -p frontend/src/writing/components/{editor,ideas}
   ```

2. **Move and split editor feature**:
   - Extract editor from `WritingView.tsx` → `writing/components/editor/Editor.tsx` (~150 lines)
   - Create `writing/components/editor/EditorToolbar.tsx` (~60 lines)
   - Create `writing/components/editor/EditorStats.tsx` (~40 lines)
   - Create `writing/components/editor/queries.ts` (~50 lines)
   - Create `writing/components/editor/types.ts` (~20 lines)

3. **Move and split ideas feature**:
   - Extract sidebar → `writing/components/ideas/IdeaSidebar.tsx` (~100 lines)
   - Create `writing/components/ideas/IdeaCard.tsx` (~80 lines)
   - Create `writing/components/ideas/IdeasList.tsx` (~100 lines)
   - Create `writing/components/ideas/queries.ts` (~150 lines) - move from monolithic
   - Create `writing/components/ideas/types.ts` (~30 lines)

4. **Move view files to domain root**:
   ```bash
   mv frontend/src/views/WritingView.tsx frontend/src/writing/
   mv frontend/src/views/IdeasLibraryView.tsx frontend/src/writing/
   mv frontend/src/views/ArchiveView.tsx frontend/src/writing/
   ```

5. **Refactor WritingView.tsx**:
   - Import from `./components/editor/` and `./components/ideas/`
   - Keep only layout and state coordination (~150 lines)
   - No business logic - just appearance

6. **Update imports** in App.tsx to `@/writing/WritingView`

### Phase 6: Reorganize Research Domain (30 min)

**Goal**: Create feature folders with complete co-location

1. **Create feature folders**:
   ```bash
   mkdir -p frontend/src/research/components/{stream,feed-sources,news-feed,reddit}
   ```

2. **Organize stream feature**:
   ```bash
   mv frontend/src/components/research/StreamArticleCard.tsx frontend/src/research/components/stream/
   ```
   - Create `research/components/stream/StreamFilters.tsx` (~80 lines)
   - Create `research/components/stream/queries.ts` (~100 lines) - article queries
   - Create `research/components/stream/types.ts` (~20 lines)

3. **Organize feed-sources feature**:
   ```bash
   mv frontend/src/components/research/FeedSourceCard.tsx frontend/src/research/components/feed-sources/
   mv frontend/src/components/research/FeedSourceDialog.tsx frontend/src/research/components/feed-sources/
   ```
   - Create `research/components/feed-sources/FeedSourceList.tsx` (~100 lines)
   - Create `research/components/feed-sources/queries.ts` (~200 lines) - CRUD, sync, test
   - Create `research/components/feed-sources/types.ts` (~40 lines)

4. **Organize news-feed feature** (split NewsFeedDialog 657 lines):
   - `research/components/news-feed/NewsFeedDialog.tsx` - Coordinator (~150 lines)
   - `research/components/news-feed/NewsFilters.tsx` - Filter toolbar (~100 lines)
   - `research/components/news-feed/NewsArticleList.tsx` - Article list (~150 lines)
   - `research/components/news-feed/NewsFeedSettings.tsx` - Settings panel (~80 lines)
   - `research/components/news-feed/queries.ts` (~100 lines)
   - `research/components/news-feed/types.ts` (~20 lines)

5. **Organize reddit feature**:
   - Create `research/components/reddit/RedditCard.tsx` (~80 lines)
   - Create `research/components/reddit/queries.ts` (~50 lines)
   - Create `research/components/reddit/types.ts` (~15 lines)

6. **Move view files to domain root**:
   ```bash
   mv frontend/src/views/StreamView.tsx frontend/src/research/
   mv frontend/src/views/FeedSourcesView.tsx frontend/src/research/
   mv frontend/src/components/research/NewsFeedView.tsx frontend/src/research/
   mv frontend/src/components/research/RedditView.tsx frontend/src/research/
   ```

7. **Update view imports** to use feature folders:
   - Import from `./components/stream/`, `./components/feed-sources/`, etc.
   - Views handle layout only (~150-200 lines each)

8. **Update App.tsx** to import from `@/research/StreamView`, etc.

### Phase 7: Reorganize System Domain (30 min)

**Goal**: Create feature folders with complete co-location

1. **Create feature folders**:
   ```bash
   mkdir -p frontend/src/system/components/{settings,storage,logs,tasks}
   ```

2. **Organize settings feature** (split SettingsView 454 lines):
   - `system/components/settings/SettingsSection.tsx` - Reusable wrapper (~60 lines)
   - `system/components/settings/StorageSettings.tsx` - Storage config (~100 lines)
   - `system/components/settings/WritingSettings.tsx` - Writing prefs (~80 lines)
   - `system/components/settings/AppearanceSettings.tsx` - Theme, UI (~80 lines)
   - `system/components/settings/queries.ts` (~80 lines) - get/update settings
   - `system/components/settings/types.ts` (~30 lines)

3. **Organize storage feature**:
   - Extract from StorageView → `system/components/storage/StorageMetrics.tsx` (~100 lines)
   - `system/components/storage/BackupList.tsx` (~100 lines)
   - `system/components/storage/queries.ts` (~150 lines) - backup, restore, export
   - `system/components/storage/types.ts` (~25 lines)

4. **Organize logs feature**:
   - Extract from LogsView → `system/components/logs/LogsFilters.tsx` (~80 lines)
   - `system/components/logs/LogsTable.tsx` (~120 lines)
   - `system/components/logs/queries.ts` (~100 lines) - get, filter, export, clear
   - `system/components/logs/types.ts` (~20 lines)

5. **Organize tasks feature**:
   - Extract from TasksView → `system/components/tasks/TaskCard.tsx` (~70 lines)
   - `system/components/tasks/TaskList.tsx` (~100 lines)
   - `system/components/tasks/queries.ts` (~100 lines) - list, toggle, run
   - `system/components/tasks/types.ts` (~25 lines)

6. **Move view files to domain root**:
   ```bash
   mv frontend/src/components/system/SettingsView.tsx frontend/src/system/
   mv frontend/src/components/system/StorageView.tsx frontend/src/system/
   mv frontend/src/components/system/LogsView.tsx frontend/src/system/
   mv frontend/src/components/system/TasksView.tsx frontend/src/system/
   ```

7. **Refactor view files**:
   - SettingsView.tsx - Import from `./components/settings/`, layout only (~150 lines)
   - StorageView.tsx - Import from `./components/storage/`, layout only (~150 lines)
   - LogsView.tsx - Import from `./components/logs/`, layout only (~150 lines)
   - TasksView.tsx - Import from `./components/tasks/`, layout only (~120 lines)

8. **Update App.tsx** to import from `@/system/SettingsView`, etc.

### Phase 8: Update Import Paths & Path Aliases (30 min)

**Goal**: Set up TypeScript path aliases for clean imports

1. **Update tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/core/*": ["./src/core/*"],
         "@/writing/*": ["./src/writing/*"],
         "@/research/*": ["./src/research/*"],
         "@/system/*": ["./src/system/*"],
         "@/setup/*": ["./src/setup/*"]
       }
     }
   }
   ```

2. **Update vite.config.ts**:
   ```typescript
   import path from 'path';
   
   export default defineConfig({
     resolve: {
       alias: {
         '@/core': path.resolve(__dirname, './src/core'),
         '@/writing': path.resolve(__dirname, './src/writing'),
         '@/research': path.resolve(__dirname, './src/research'),
         '@/system': path.resolve(__dirname, './src/system'),
         '@/setup': path.resolve(__dirname, './src/setup'),
       },
     },
   });
   ```

3. **Update imports throughout codebase**:
   - Replace relative imports with path aliases
   - Use global search/replace for common patterns
   - Test compilation after each domain update

4. **Verify builds**:
   ```bash
   npm run build
   npm run tauri build
   ```

---

## 3-Tier View Hierarchy ⭐

### Layer 1: Main View (App.tsx)
**Responsibility**: Application shell only
- Top navigation bar
- Sidebar navigation
- Theme provider
- Routes to domain views

**Never changes** once established

### Layer 2: Domain View (ResearchView.tsx)
**Responsibility**: Domain coordination only
- Domain-level tabs/navigation (Stream | Sources | News | Reddit)
- Decides which component to show
- No business logic - pure routing

**Example**:
```tsx
// research/ResearchView.tsx
<Tabs value={activeFeature}>
  <TabsList>
    <TabsTrigger value="stream">Stream</TabsTrigger>
    <TabsTrigger value="sources">Feed Sources</TabsTrigger>
  </TabsList>
  <TabsContent value="stream">
    <StreamView />
  </TabsContent>
  <TabsContent value="sources">
    <FeedSourcesView />
  </TabsContent>
</Tabs>
```

### Layer 3: Component View (stream/StreamView.tsx)
**Responsibility**: Feature-specific layout + logic
- Component-specific UI
- Business logic
- Data fetching (queries)
- Optional sub-menus if needed

**Example**:
```tsx
// research/components/stream/StreamView.tsx
export default function StreamView() {
  const { data: articles } = useNewsArticles();
  
  return (
    <div className="h-full flex flex-col">
      <StreamFilters />
      <div className="articles-grid">
        {articles.map(a => <StreamArticleCard article={a} />)}
      </div>
    </div>
  );
}
```

### Complete Structure
```
research/
├── ResearchView.tsx              # Domain coordinator (Layer 2)
└── components/
    └── stream/                   # ✨ Complete feature
        ├── StreamView.tsx        # Component view (Layer 3)
        ├── StreamArticleCard.tsx
        ├── StreamFilters.tsx
        ├── queries.ts            # Only stream queries
        └── types.ts
```

**Benefits**: 
- Clear separation of concerns
- Each layer has one job
- Easy to find where to make changes
- Complete feature isolation

### Real-World Example: Working on "Stream Filters"

**OLD way** (domain-level queries):
```
1. Edit StreamView.tsx in research/views/
2. Edit StreamFilters.tsx in research/components/
3. Edit queries.ts in research/hooks/ (400 lines - find stream queries)
4. Three different directories, large files
```

**NEW way** (feature co-location):
```
1. cd research/components/stream/
2. Everything is here:
   - StreamView.tsx (in research/ root)
   - StreamFilters.tsx (in stream/)
   - StreamArticleCard.tsx (in stream/)
   - queries.ts (in stream/, only 100 lines - all stream-related)
   - types.ts (in stream/)
3. One feature folder, small focused files
```

**Time saved**: ~30% less context switching, ~50% faster file navigation

---

## Benefits

### 1. Complete Feature Isolation ⭐ NEW
- **Everything for a feature in one folder** - component + queries + types together
- **No hunting across directories** - need editor? Go to `writing/components/editor/`
- **Easy deletion** - remove entire feature by deleting one folder
- **No cross-feature dependencies** - editor queries don't mix with ideas queries

### 2. Domain Alignment
- Frontend structure mirrors backend (writing/, research/, system/, core/)
- Each domain organized by features (just like backend components/)
- Clear ownership boundaries for features
- Easier to understand data flow (queries → components → views)

### 3. Code Discoverability
- **Feature-first navigation** - developer thinks "I need the editor" → `writing/components/editor/`
- No more hunting through flat components/ directory
- Consistent structure: every feature has same pattern (component.tsx, queries.ts, types.ts)
- Self-documenting folders tell you exactly what's inside

### 4. Maintainability
- **Smaller files** (<200 lines per file, <50 lines for queries)
- **Co-located code** - edit component and queries without switching directories
- **Feature-scoped queries** - only see queries relevant to that component
- Separation of concerns (core vs domain vs feature logic)

### 5. Parallel Development
- Multiple developers can work on different **features** without conflicts
- Even more granular than domain-level - two devs can work in same domain on different features
- Clear module boundaries reduce merge conflicts
- Independent testing per feature (not just per domain)

### 6. Performance
- Better code splitting with **feature-based lazy loading**
- Smaller bundle chunks (feature-specific, not domain-wide)
- Improved tree-shaking - import only the feature you need
- Queries loaded on-demand with feature components

### 7. Testing
- **Feature-level tests** - test editor independently from ideas
- Mock feature queries without affecting other features
- Test components in complete isolation
- Clear test file structure mirrors feature structure

### 8. Scalability
- **Add new features easily** - create new folder, follow pattern
- Remove features without touching other code
- Refactor features independently
- Future-proof for feature expansion (analytics/, integrations/, etc.)

### 9. Developer Experience
- **Mental model matches code** - "I'm working on the stream feature" → `research/components/stream/`
- Less cognitive load - only see code related to current feature
- New developers onboard faster - predictable structure
- Code reviews focus on feature folders, easier to understand scope

---

## Migration Strategy Recommendation

### Option A: Quick Cleanup → Finish MVP → Full Refactor ⭐ RECOMMENDED
**Timeline**: Phase 1 now (30 min) → Complete Tasks #9-#12 → Phases 2-8 after MVP

**Pros**:
- ✅ Immediate cleanup (dead code removed)
- ✅ No risk to current working code
- ✅ Complete feature work with stable foundation
- ✅ Refactor when everything is proven to work

**Cons**:
- ⚠️ Technical debt remains during sprint
- ⚠️ Refactoring deferred to post-MVP

**Best for**: Current situation - 67% complete, 4 tasks remaining

### Option B: Full Refactoring Now
**Timeline**: Phases 1-8 consecutively (4-6 hours)

**Pros**:
- ✅ Clean structure immediately
- ✅ All future work in organized codebase
- ✅ No migration debt

**Cons**:
- ⚠️ High risk of breaking changes
- ⚠️ Delays feature completion by 1-2 days
- ⚠️ Large PR, harder to review

**Best for**: Between sprints or after MVP

### Option C: Hybrid Approach
**Timeline**: Phases 1-4 now (2 hours) → Resume feature work → Phases 5-8 later

**Pros**:
- ✅ Core infrastructure organized
- ✅ queries.ts split helps immediately
- ✅ Lower risk than full refactor

**Cons**:
- ⚠️ Still breaks imports during migration
- ⚠️ Partial completion leaves mixed state
- ⚠️ Requires careful testing mid-migration

**Best for**: If sprints will take >1 week

---

## Risk Assessment

### High Risk Changes
- Splitting queries.ts (Phase 4) - Updates ~50+ import statements
- Moving UI components (Phase 3) - Affects every component
- Path alias changes (Phase 8) - Requires build config updates

### Medium Risk Changes
- Splitting large components (Phases 5-7) - Contained within domains
- Moving views (Phases 5-7) - Only affects App.tsx routing

### Low Risk Changes
- Creating folder structure (Phase 2) - No code changes
- Deleting dead code (Phase 1) - Already complete ✅

### Mitigation Strategies
1. **Git workflow**: Create feature branch, commit after each phase
2. **Testing**: Run `npm run build` after each phase
3. **Incremental**: One domain at a time (writing → research → system)
4. **Rollback plan**: Each phase is independently revertible
5. **Documentation**: Update import examples in each PR

---

## Testing Checklist

After refactoring, verify:

- [ ] All views load without errors
- [ ] All queries execute successfully
- [ ] All mutations work correctly
- [ ] No TypeScript errors
- [ ] Bundle size hasn't increased significantly
- [ ] Hot reload still works in dev mode
- [ ] Production build succeeds
- [ ] Tauri build succeeds
- [ ] All navigation works
- [ ] All lazy-loaded routes load correctly

---

## Rollback Plan

If issues arise during refactoring:

1. **Phase-level rollback**: Use git to revert specific phases
2. **Keep working**: Original code remains in git history
3. **Incremental fixes**: Fix issues in-place rather than full rollback
4. **Fallback**: Can always defer to Option A (post-MVP refactoring)

---

## Success Metrics

### Quantitative
- ✅ No files over 300 lines (except views with complex layouts)
- ✅ queries.ts split from 1152 → 4 files (~200-400 lines each)
- ✅ NewsFeedDialog split from 657 → 4 files (~150 lines each)
- ✅ SettingsView split from 454 → 5 files (~200 lines max)
- ✅ WritingView split from 388 → 3 files (~200 lines max)
- ✅ Bundle size maintained or reduced
- ✅ Build time maintained or improved

### Qualitative
- ✅ Developer can find any component in <10 seconds
- ✅ New features go in obvious domain location
- ✅ Import paths are clean and readable
- ✅ Code review comments decrease (better organization)
- ✅ Onboarding new developers is easier

---

## Next Steps

**Immediate** (Phase 1 - COMPLETE ✅):
- [x] Delete dead code files
- [x] Create this REFACTOR_FRONTEND.md

**After MVP** (Tasks #9-#12 complete):
1. Create feature branch: `git checkout -b refactor/frontend-domains`
2. Execute Phases 2-8 sequentially
3. Test thoroughly after each phase
4. Create PR with detailed migration notes
5. Review and merge

**During Sprint** (if Option C chosen):
1. Execute Phases 2-4 (core infrastructure + queries split)
2. Continue with Tasks #9-#12
3. Execute Phases 5-8 after task completion

---

**Last Updated**: December 15, 2025  
**Status**: Phase 1 Complete, Awaiting MVP completion for Phases 2-8
