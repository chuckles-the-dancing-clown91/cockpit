# Ideas Workflow - Quick Reference

## UI Flow Diagram

```
Ideas Library View
┌─────────────────────────────────────────────┐
│  Ideas Library          [New Idea] ←────────┼─── Opens NewIdeaDialog
│  ┌─────────────────────────────────────┐    │
│  │ Search  [Status ▼] [Priority ▼]    │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Idea 1  │  │  Idea 2  │  │  Idea 3  │  │
│  │ ●Priority│  │ ●Priority│  │ ●Priority│  │  ← Click card
│  │  Title   │  │  Title   │  │  Title   │  │    opens
│  │  Summary │  │  Summary │  │  Summary │  │    IdeaDetailModal
│  │  [🗑️]    │  │  [🗑️]    │  │  [🗑️]    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
         │
         └──────────────┐
                        ▼
NewIdeaDialog          IdeaDetailModal
┌─────────────────┐    ┌──────────────────────────────────┐
│ Create Idea  [X]│    │ Edit Idea                    [X] │
├─────────────────┤    ├──────────────────────────────────┤
│ Title*          │    │ [Details] [Notes] [References]   │
│ ┌─────────────┐ │    │ ┌──────────────────────────────┐ │
│ │             │ │    │ │ Details Tab:                 │ │
│ └─────────────┘ │    │ │   Title: ┌─────────────────┐ │ │
│                 │    │ │          │                 │ │ │
│ Summary         │    │ │          └─────────────────┘ │ │
│ ┌─────────────┐ │    │ │   Status: [in_progress ▼]   │ │
│ │             │ │    │ │   Priority: [Medium ▼]      │ │
│ │             │ │    │ │   Target: ┌───────────────┐ │ │
│ └─────────────┘ │    │ │           │               │ │ │
│                 │    │ │           └───────────────┘ │ │
│ Status          │    │ │   [Save Details]             │ │
│ [in_progress ▼] │    │ └──────────────────────────────┘ │
│                 │    │ ┌──────────────────────────────┐ │
│ Priority        │    │ │ Notes Tab:                   │ │
│ [Low ▼]         │    │ │ ┌──────────────────────────┐ │ │
│                 │    │ │ │ Markdown notes...        │ │ │
│ Target          │    │ │ │                          │ │ │
│ ┌─────────────┐ │    │ │ │                          │ │ │
│ │             │ │    │ │ └──────────────────────────┘ │ │
│ └─────────────┘ │    │ │ [Save Notes]                 │ │
│                 │    │ └──────────────────────────────┘ │
│ [Create Idea]   │    │ ┌──────────────────────────────┐ │
└─────────────────┘    │ │ References Tab:              │ │
                       │ │   [+ Add Reference]          │ │
                       │ │   ┌────────────────────────┐ │ │
                       │ │   │ Article Title          │ │ │
                       │ │   │ [manual] 2024-01-15    │ │ │
                       │ │   │ [👁️] [🔗] [🗑️]          │ │ │
                       │ │   └────────────────────────┘ │ │
                       │ │   ┌────────────────────────┐ │ │
                       │ │   │ Another Reference      │ │ │
                       │ │   │ [article] 2024-01-14   │ │ │
                       │ │   │ [👁️] [🔗] [🗑️]          │ │ │
                       │ │   └────────────────────────┘ │ │
                       │ └──────────────────────────────┘ │
                       └──────────────────────────────────┘
                                    │
                                    │ [+ Add Reference]
                                    ▼
                       AddReferenceDialog
                       ┌──────────────────────┐
                       │ Add Reference    [X] │
                       ├──────────────────────┤
                       │ [Manual URL] [Feed]  │
                       ├──────────────────────┤
                       │ Title*               │
                       │ ┌──────────────────┐ │
                       │ │                  │ │
                       │ └──────────────────┘ │
                       │                      │
                       │ URL*                 │
                       │ ┌──────────────────┐ │
                       │ │ https://...      │ │
                       │ └──────────────────┘ │
                       │                      │
                       │ Description          │
                       │ ┌──────────────────┐ │
                       │ │                  │ │
                       │ └──────────────────┘ │
                       │                      │
                       │ [Add Reference]      │
                       └──────────────────────┘
```

## Button Actions

### Ideas Library View
- **[New Idea]** → Opens NewIdeaDialog
- **Click Card** → Opens IdeaDetailModal
- **[🗑️] on Card** → Shows delete confirmation

### NewIdeaDialog
- **[Create Idea]** → Creates idea, navigates to editor
- **[X]** → Closes dialog

### IdeaDetailModal
- **Details Tab**:
  - **[Save Details]** → Updates idea metadata
- **Notes Tab**:
  - **[Save Notes]** → Updates idea.notes_markdown
- **References Tab**:
  - **[+ Add Reference]** → Opens AddReferenceDialog
  - **[👁️]** → Opens article in ArticleModal
  - **[🔗]** → Opens URL in external browser
  - **[🗑️]** → Deletes reference (with confirmation)

### AddReferenceDialog
- **[Manual URL] tab**:
  - Enter title, URL, description
  - **[Add Reference]** → Creates reference
- **[From Feed] tab**:
  - (Future) Pick article from news feed

## Keyboard Shortcuts

### Global
- **Escape** → Closes any open dialog/modal

### NewIdeaDialog
- **Enter** (in title field) → Focuses next field
- **Ctrl/Cmd + Enter** → Submits form

### IdeaDetailModal
- **Tab** → Navigate between tabs
- **Ctrl/Cmd + S** → Saves current tab

## Data Flow

```
User Action          Frontend              Backend              Database
───────────          ────────              ───────              ────────
Click "New Idea"
   ↓
NewIdeaDialog opens
   ↓
Fill form, click Create
   ↓                 
                  useMutation
                     ↓
                  invoke('create_idea')
                     ↓
                                      create_idea_handler
                                           ↓
                                      validate input
                                           ↓
                                      insert into ideas
                                           ↓
                                      return IdeaDto
                     ↓
                  invalidate queries
                     ↓
                  refetch ideas
                     ↓
                  navigate to editor
                     ↓
Toast: "Idea created"


Click idea card
   ↓
IdeaDetailModal opens
   ↓
                  useQuery(['idea', id])
                     ↓
                  invoke('get_idea')
                     ↓
                                      get_idea_handler
                                           ↓
                                      SELECT FROM ideas WHERE id
                                           ↓
                                      return IdeaDto
                     ↓
                  populate form fields
                     ↓

                  useQuery(['idea_references', id])
                     ↓
                  invoke('list_idea_references')
                     ↓
                                      list_idea_references_handler
                                           ↓
                                      SELECT FROM idea_references
                                           WHERE idea_id = ?
                                           ↓
                                      return Vec<IdeaReferenceDto>
                     ↓
                  render references list


Click "Add Reference"
   ↓
AddReferenceDialog opens
   ↓
Fill form, click Add
   ↓
                  useMutation
                     ↓
                  invoke('add_reference_to_idea')
                     ↓
                                      add_reference_to_idea_handler
                                           ↓
                                      validate input
                                           ↓
                                      INSERT INTO idea_references
                                           ↓
                                      return IdeaReferenceDto
                     ↓
                  invalidate ['idea_references', id]
                     ↓
                  refetch references
                     ↓
                  close dialog
                     ↓
Toast: "Reference added"
```

## Component Hierarchy

```
IdeasLibraryView
├── NewIdeaDialog
│   └── [Form fields]
├── IdeaDetailModal
│   ├── [Tabs.Root]
│   │   ├── Details Tab
│   │   │   └── [Form fields]
│   │   ├── Notes Tab
│   │   │   └── [Textarea]
│   │   └── References Tab
│   │       └── [References list]
│   ├── AddReferenceDialog
│   │   └── [Tabs with forms]
│   ├── ArticleModal
│   │   └── [WebviewWindow]
│   └── ConfirmDialog
│       └── [Delete confirmation]
└── ConfirmDialog
    └── [Delete idea confirmation]
```

## State Management

### Local State (useState)
```tsx
// Dialog visibility
const [newIdeaOpen, setNewIdeaOpen] = useState(false);
const [detailModalOpen, setDetailModalOpen] = useState(false);
const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);

// Form fields
const [title, setTitle] = useState('');
const [summary, setSummary] = useState('');
// ... etc
```

### Server State (TanStack Query)
```tsx
// Queries (GET)
const { data: ideas } = useQuery({
  queryKey: ['ideas'],
  queryFn: () => invoke('list_ideas')
});

const { data: idea } = useQuery({
  queryKey: ['idea', ideaId],
  queryFn: () => invoke('get_idea', { id: ideaId })
});

const { data: references } = useQuery({
  queryKey: ['idea_references', ideaId],
  queryFn: () => invoke('list_idea_references', { ideaId })
});

// Mutations (CREATE/UPDATE/DELETE)
const createIdea = useMutation({
  mutationFn: (input) => invoke('create_idea', { input }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ideas'] });
  }
});

const updateMetadata = useMutation({
  mutationFn: (input) => invoke('update_idea_metadata', { id, input }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['idea', id] });
    queryClient.invalidateQueries({ queryKey: ['ideas'] });
  }
});

const deleteReference = useMutation({
  mutationFn: (refId) => invoke('remove_reference', { referenceId: refId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['idea_references', ideaId] });
  }
});
```

## Error Handling

### Frontend
```tsx
const mutation = useMutation({
  mutationFn: async (input) => {
    // Validate input
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    // Call backend
    return await invoke('create_idea', { input });
  },
  onSuccess: () => {
    toast.success('Idea created');
    // ... update UI
  },
  onError: (error: any) => {
    toast.error(error?.message ?? 'Failed to create idea');
  }
});
```

### Backend
```rust
#[tauri::command]
pub async fn add_reference_to_idea_handler(
    state: State<'_, AppState>,
    input: AddReferenceInput,
) -> Result<IdeaReferenceDto, String> {
    components::ideas::references::add_reference_to_idea(&state.db, input)
        .await
        .map_err(|e| {
            tracing::error!("Failed to add reference: {}", e);
            e.to_string()
        })
}
```

## Testing Scenarios

### Happy Path
1. ✅ Create idea with all fields
2. ✅ Edit idea metadata
3. ✅ Add notes to idea
4. ✅ Add manual URL reference
5. ✅ View reference in modal
6. ✅ Delete reference
7. ✅ Delete idea

### Edge Cases
1. ⚠️ Create idea with empty title → Validation error
2. ⚠️ Create idea with title only → Success
3. ⚠️ Add reference without URL → Validation error
4. ⚠️ Save notes with empty content → Success (clears notes)
5. ⚠️ Delete idea with references → Cascade deletes refs
6. ⚠️ Open detail modal for deleted idea → Error handling

### Error Scenarios
1. ❌ Backend unavailable → Toast error
2. ❌ Database locked → Retry logic
3. ❌ Invalid URL format → Validation error
4. ❌ Network error opening article → Browser fallback

## Quick Tips

### For Developers
- All dialogs use Radix UI primitives
- Colors use CSS custom properties (theme-aware)
- Always invalidate queries after mutations
- Toast notifications for all user actions
- Stop event propagation on nested buttons

### For Users
- Click card to edit, don't double-click
- Escape key closes any open dialog
- Toast notifications confirm all actions
- References persist across app restarts
- Delete actions require confirmation

### For Designers
- Modal z-index: 40 (overlay), 50 (content)
- Backdrop blur: 2px
- Border radius: var(--radius-card)
- Padding: p-6 (header), p-4 (cards)
- Shadow: var(--shadow-card-elevated)

## File Locations

### Components
- `frontend/src/writing/components/ideas/NewIdeaDialog.tsx`
- `frontend/src/writing/components/ideas/IdeaDetailModal.tsx`
- `frontend/src/writing/components/editor/AddReferenceDialog.tsx`
- `frontend/src/writing/components/ideas/IdeasLibraryView.tsx`

### Backend
- `backend/src/writing/commands.rs` - Tauri commands
- `backend/src/writing/components/ideas/references.rs` - Handlers
- `backend/src/writing/components/ideas/types.rs` - DTOs
- `backend/src/writing/components/ideas/entities/idea_references.rs` - Entity

### Database
- `backend/migrations/005_idea_references_up.sql`
- `backend/storage/data/db.sql`
