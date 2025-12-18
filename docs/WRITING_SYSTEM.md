# Writing System Architecture

Complete documentation for the Writing system with TipTap JSON editor.

**Status**: Production-ready ✅  
**Completed**: December 18, 2025  
**Backend Files**: 6 modules (text.rs, dto.rs, service.rs, commands.rs, mod.rs, main.rs)  
**Frontend Files**: 10 components (types, API, hooks, 5 React components, feature exports)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend API Reference](#backend-api-reference)
4. [Frontend Hooks Reference](#frontend-hooks-reference)
5. [Component Guide](#component-guide)
6. [Integration Guide](#integration-guide)
7. [TipTap JSON Schema](#tiptap-json-schema)
8. [Workflow Examples](#workflow-examples)

---

## Overview

The Writing system provides a full-featured writing workspace with:
- **TipTap Rich Text Editor** - JSON-based content storage (lossless editing)
- **3-Column Layout** - Ideas (25%) | Editor (50%) | Metadata (25%)
- **Autosave** - 1.5s debounced autosave + Ctrl+S keyboard shortcut
- **Optimistic Updates** - React Query mutations with rollback on error
- **Metadata Management** - Title, slug, excerpt, type, status, tags, series
- **Idea Linking** - Many-to-many relationships with ideas
- **Word Counting** - Auto-calculated from extracted plain text
- **Publishing Workflow** - Draft → In Progress → Review → Published → Archived

### Key Features

✅ **Production-ready components**  
✅ **Type-safe** Rust backend + TypeScript frontend  
✅ **Optimistic UI** with error recovery  
✅ **Keyboard shortcuts** (Ctrl+S to save)  
✅ **Text extraction** for search indexing  
✅ **Transaction safety** for multi-table operations  
✅ **Flexible metadata** (tags, series, publishing info)

---

## Architecture

### Storage Model

**Content Format**: TipTap JSON stored as string in `writings.content_markdown` column

**Why TipTap JSON?**
- Lossless editing (no HTML/Markdown conversion artifacts)
- Structured data for programmatic manipulation
- Easy to extend with custom nodes
- Direct mapping to editor state

**Text Extraction**: Recursive walker extracts plain text for:
- Search indexing
- Word counting
- Preview generation

### Data Flow

```
User Edit → TipTap Editor → JSON onChange
  ↓
Local State (WritingWorkspace)
  ↓
1.5s Debounce → useSaveDraft() hook
  ↓
Optimistic Update (React Query)
  ↓
Tauri Command (writing_save_draft)
  ↓
Service Layer (save_draft())
  ↓
  1. Parse JSON string
  2. Extract plain text
  3. Calculate word count
  4. Update database
  ↓
Success → Keep optimistic update
Error → Rollback to previous state
```

### 3-Column Layout

```
┌─────────────────────────────────────────────────────────┐
│                   WritingWorkspace                      │
├──────────┬────────────────────────┬────────────────────┤
│          │                        │                    │
│  Ideas   │      TipTap Editor     │    Metadata Panel  │
│  (25%)   │         (50%)          │       (25%)        │
│          │                        │                    │
│ Coming   │  ┌──────────────────┐  │  Title: _______   │
│ Soon     │  │ Toolbar:         │  │  Slug: ________   │
│          │  │ B I H1 H2 List   │  │  Excerpt: _____   │
│ (Future: │  └──────────────────┘  │  Type: [Article]  │
│ Linked   │                        │  Status: [Draft]  │
│ Ideas +  │  # Your Title          │  Tags: _______    │
│ Refs)    │                        │  Series: ______   │
│          │  Your content here...  │  Part: [ 1 ]      │
│          │                        │                    │
│          │  [Autosaved 2s ago]    │  Word Count: 234  │
│          │                        │  [Publish]        │
└──────────┴────────────────────────┴────────────────────┘
```

---

## Backend API Reference

All commands return `Result<T, String>` for error handling.

### 1. `writing_create`

**Purpose**: Create a new writing with initial content

**Input**:
```rust
CreateWritingDraftInput {
  title: String,                      // Required
  writing_type: String,               // "article" | "chapter" | "book"
  link_idea_ids: Option<Vec<i64>>,    // Ideas to link immediately
  initial_content_json: Option<JsonValue>, // TipTap JSON (default: H1 + empty paragraph)
}
```

**Output**:
```rust
WritingDraftDto {
  writing_id: i64,
  writing_type: String,
  title: String,
  slug: String,
  content_json: JsonValue,        // TipTap JSON
  content_text: String,           // Extracted plain text
  excerpt: Option<String>,
  status: String,                 // "draft" | "in_progress" | "review" | "published" | "archived"
  tags: Option<String>,           // Comma-separated
  word_count: i32,
  series_name: Option<String>,
  series_part: Option<i32>,
  is_pinned: bool,
  is_featured: bool,
  created_at: DateTime<Utc>,
  updated_at: DateTime<Utc>,
  published_at: Option<DateTime<Utc>>,
}
```

**Example**:
```typescript
const writing = await invoke<WritingDraftDto>('writing_create', {
  input: {
    title: 'My First Article',
    writingType: 'article',
    linkIdeaIds: [123, 456],
  },
});
```

---

### 2. `writing_get`

**Purpose**: Retrieve a writing by ID

**Input**:
```rust
writing_id: i64
```

**Output**: `WritingDraftDto`

**Example**:
```typescript
const writing = await invoke<WritingDraftDto>('writing_get', {
  writingId: 789,
});
```

---

### 3. `writing_list`

**Purpose**: Query writings with filters

**Input**:
```rust
ListWritingsQuery {
  status: Option<String>,         // Filter by status
  writing_type: Option<String>,   // Filter by type
  series_name: Option<String>,    // Filter by series
  is_pinned: Option<bool>,
  is_featured: Option<bool>,
}
```

**Output**: `Vec<WritingDraftDto>`

**Example**:
```typescript
const drafts = await invoke<WritingDraftDto[]>('writing_list', {
  query: {
    status: 'draft',
    writingType: 'article',
  },
});
```

---

### 4. `writing_update_meta`

**Purpose**: Update metadata fields (not content)

**Input**:
```rust
UpdateWritingDraftMetaInput {
  writing_id: i64,                // Required
  title: Option<String>,
  slug: Option<String>,
  excerpt: Option<String>,
  status: Option<String>,
  writing_type: Option<String>,
  tags: Option<String>,
  series_name: Option<String>,
  series_part: Option<i32>,
  is_pinned: Option<bool>,
  is_featured: Option<bool>,
}
```

**Output**: `WritingDraftDto`

**Example**:
```typescript
const updated = await invoke<WritingDraftDto>('writing_update_meta', {
  input: {
    writingId: 789,
    title: 'Updated Title',
    status: 'in_progress',
    tags: 'rust, tauri, writing',
  },
});
```

---

### 5. `writing_save_draft`

**Purpose**: Save content (JSON) with text extraction and word count

**Input**:
```rust
SaveDraftInput {
  writing_id: i64,           // Required
  content_json: JsonValue,   // TipTap JSON
}
```

**Output**: `WritingDraftDto`

**Example**:
```typescript
const saved = await invoke<WritingDraftDto>('writing_save_draft', {
  input: {
    writingId: 789,
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Content...' }] },
      ],
    },
  },
});
```

---

### 6. `writing_publish`

**Purpose**: Set writing to published status

**Input**:
```rust
PublishWritingInput {
  writing_id: i64,           // Required
  publish_now: bool,         // true = set published_at to NOW()
}
```

**Output**: `WritingDraftDto`

**Example**:
```typescript
const published = await invoke<WritingDraftDto>('writing_publish', {
  input: {
    writingId: 789,
    publishNow: true,
  },
});
```

---

### 7. `writing_link_idea`

**Purpose**: Link an idea to a writing (many-to-many)

**Input**:
```rust
LinkIdeaInput {
  writing_id: i64,
  idea_id: i64,
  purpose: Option<String>,    // "primary" | "secondary" | "mention"
  sort_order: Option<i32>,
}
```

**Output**: `()` (success/error only)

**Example**:
```typescript
await invoke('writing_link_idea', {
  input: {
    writingId: 789,
    ideaId: 123,
    purpose: 'primary',
  },
});
```

---

### 8. `writing_unlink_idea`

**Purpose**: Remove idea link from writing

**Input**:
```rust
LinkIdeaInput {
  writing_id: i64,
  idea_id: i64,
  purpose: Option<String>,    // Ignored for unlink
  sort_order: Option<i32>,    // Ignored for unlink
}
```

**Output**: `()` (success/error only)

**Example**:
```typescript
await invoke('writing_unlink_idea', {
  input: {
    writingId: 789,
    ideaId: 123,
  },
});
```

---

### 9. `writing_list_linked_ideas`

**Purpose**: Get all idea IDs linked to a writing

**Input**:
```rust
writing_id: i64
```

**Output**: `Vec<i64>` (idea IDs)

**Example**:
```typescript
const ideaIds = await invoke<number[]>('writing_list_linked_ideas', {
  writingId: 789,
});
```

---

## Frontend Hooks Reference

All hooks use TanStack Query (React Query v5) with optimistic updates.

### 1. `useWritingList(query?: ListWritingsQuery)`

**Purpose**: Query all writings with filters

**Returns**:
```typescript
{
  data: Writing[] | undefined,
  isLoading: boolean,
  error: Error | null,
  refetch: () => void,
}
```

**Example**:
```tsx
const { data: writings, isLoading } = useWritingList({
  status: 'draft',
  writingType: 'article',
});
```

**Cache**: 30s stale time

---

### 2. `useWriting(id: number | null)`

**Purpose**: Get single writing by ID

**Returns**:
```typescript
{
  data: Writing | undefined,
  isLoading: boolean,
  error: Error | null,
  refetch: () => void,
}
```

**Example**:
```tsx
const { data: writing, isLoading } = useWriting(789);
```

**Cache**: 10s stale time, enabled only when `id !== null`

---

### 3. `useCreateWriting()`

**Purpose**: Create new writing

**Returns**:
```typescript
{
  mutate: (input: CreateWritingInput) => void,
  mutateAsync: (input: CreateWritingInput) => Promise<Writing>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const createWriting = useCreateWriting();

const handleCreate = async () => {
  const writing = await createWriting.mutateAsync({
    title: 'New Article',
    writingType: 'article',
    linkIdeaIds: [123],
  });
  // writing.id available for navigation
};
```

**Side Effects**: Invalidates `['writings']` query

---

### 4. `useSaveDraft()`

**Purpose**: Save content with optimistic update

**Returns**:
```typescript
{
  mutate: (input: SaveDraftInput) => void,
  mutateAsync: (input: SaveDraftInput) => Promise<Writing>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const saveDraft = useSaveDraft();

const handleSave = () => {
  saveDraft.mutate({
    writingId: 789,
    contentJson: editorContent,
  });
};
```

**Side Effects**: 
- Optimistic update: Sets local cache immediately
- On error: Rolls back to previous state
- On success: Keeps optimistic update

---

### 5. `useUpdateWritingMeta()`

**Purpose**: Update metadata fields

**Returns**:
```typescript
{
  mutate: (input: UpdateWritingMetaInput) => void,
  mutateAsync: (input: UpdateWritingMetaInput) => Promise<Writing>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const updateMeta = useUpdateWritingMeta();

const handleUpdate = () => {
  updateMeta.mutate({
    writingId: 789,
    title: 'Updated Title',
    status: 'in_progress',
  });
};
```

**Side Effects**: Invalidates `['writings', id]` and `['writings']`

---

### 6. `usePublishWriting()`

**Purpose**: Publish writing

**Returns**:
```typescript
{
  mutate: (input: PublishWritingInput) => void,
  mutateAsync: (input: PublishWritingInput) => Promise<Writing>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const publishWriting = usePublishWriting();

const handlePublish = () => {
  publishWriting.mutate({
    writingId: 789,
    publishNow: true,
  });
};
```

**Side Effects**: Invalidates `['writings', id]` and `['writings']`

---

### 7. `useLinkIdea()`

**Purpose**: Link idea to writing

**Returns**:
```typescript
{
  mutate: (input: LinkIdeaToWritingInput) => void,
  mutateAsync: (input: LinkIdeaToWritingInput) => Promise<void>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const linkIdea = useLinkIdea();

const handleLink = () => {
  linkIdea.mutate({
    writingId: 789,
    ideaId: 123,
    purpose: 'primary',
  });
};
```

**Side Effects**: Invalidates `['writings', id, 'linkedIdeas']`

---

### 8. `useUnlinkIdea()`

**Purpose**: Remove idea link

**Returns**:
```typescript
{
  mutate: (input: LinkIdeaToWritingInput) => void,
  mutateAsync: (input: LinkIdeaToWritingInput) => Promise<void>,
  isPending: boolean,
  error: Error | null,
}
```

**Example**:
```tsx
const unlinkIdea = useUnlinkIdea();

const handleUnlink = () => {
  unlinkIdea.mutate({
    writingId: 789,
    ideaId: 123,
  });
};
```

**Side Effects**: Invalidates `['writings', id, 'linkedIdeas']`

---

### 9. `useLinkedIdeas(writingId: number | null)`

**Purpose**: Query idea IDs linked to writing

**Returns**:
```typescript
{
  data: number[] | undefined,
  isLoading: boolean,
  error: Error | null,
  refetch: () => void,
}
```

**Example**:
```tsx
const { data: ideaIds } = useLinkedIdeas(789);
// ideaIds = [123, 456, 789]
```

**Cache**: 30s stale time, enabled only when `writingId !== null`

---

## Component Guide

### WritingLibrary

**Purpose**: List/grid view of all writings with filters

**Props**:
```typescript
interface WritingLibraryProps {
  onOpenWriting: (id: number) => void;  // Called when user clicks a writing
}
```

**Features**:
- Status filter dropdown (all/draft/in_progress/review/published/archived)
- Type filter dropdown (all/article/chapter/book)
- Create button (creates "Untitled Writing" with H1 + empty paragraph)
- Cards show: title, type/status badges, excerpt (truncated), word count, updated date
- Empty state with create prompt
- Responsive grid layout

**Usage**:
```tsx
import { WritingLibrary } from '@/features/writing';

<WritingLibrary
  onOpenWriting={(id) => {
    // Navigate to editor or open in tab
    router.push(`/writing/${id}`);
  }}
/>
```

---

### WritingWorkspace

**Purpose**: Main 3-column writing interface

**Props**:
```typescript
interface WritingWorkspaceProps {
  writingId: number;  // Writing to load and edit
}
```

**Features**:
- 3-column layout: Ideas (25%) | Editor (50%) | Metadata (25%)
- Autosave: 1.5s debounced + Ctrl+S keyboard shortcut
- Local content state with dirty tracking
- Editor instance management
- Word count tracking
- Optimistic updates with rollback
- Loading/error states

**Usage**:
```tsx
import { WritingWorkspace } from '@/features/writing';

<WritingWorkspace writingId={789} />
```

---

### WritingEditor

**Purpose**: TipTap rich text editor wrapper

**Props**:
```typescript
interface WritingEditorProps {
  value: JSONContent;                     // TipTap JSON
  onChange: (json: JSONContent) => void;  // Fires on content change
  onEditorReady?: (editor: Editor) => void; // Exposes editor instance
  onStats?: (stats: { words: number }) => void; // Word count updates
  readOnly?: boolean;
}
```

**Extensions**: StarterKit (headings 1-4), Link, Image, Placeholder, CharacterCount

**Usage**:
```tsx
import { WritingEditor } from '@/features/writing';

const [content, setContent] = useState<JSONContent>(initialJson);
const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

<WritingEditor
  value={content}
  onChange={setContent}
  onEditorReady={setEditorInstance}
  onStats={(stats) => console.log('Words:', stats.words)}
/>
```

---

### WritingToolbar

**Purpose**: Formatting controls for TipTap editor

**Props**:
```typescript
interface WritingToolbarProps {
  editor: Editor | null;                  // TipTap editor instance
  onSave?: () => void;                    // Save button callback
  isPending?: boolean;                    // Save button loading state
  wordCount?: number;                     // Display word count
}
```

**Controls**: Undo/Redo, Bold/Italic/Strikethrough, H1/H2/H3, Lists, Code, Image upload

**Usage**:
```tsx
import { WritingToolbar } from '@/features/writing';

<WritingToolbar
  editor={editorInstance}
  onSave={handleSave}
  isPending={saveDraft.isPending}
  wordCount={1234}
/>
```

---

### WritingMetaPanel

**Purpose**: Right sidebar metadata editor

**Props**:
```typescript
interface WritingMetaPanelProps {
  writing: Writing | null;                // Current writing
  onUpdate: (fields: Partial<Writing>) => void; // Update callback
  isPending?: boolean;                    // Update loading state
  onPublish?: () => void;                 // Publish button callback
}
```

**Sections**: Metadata (title, slug, excerpt, type, status), Organization (tags, series), Publishing (word count, timestamps)

**Usage**:
```tsx
import { WritingMetaPanel } from '@/features/writing';

<WritingMetaPanel
  writing={currentWriting}
  onUpdate={(fields) => updateMeta.mutate({ writingId: 789, ...fields })}
  isPending={updateMeta.isPending}
  onPublish={() => publishWriting.mutate({ writingId: 789, publishNow: true })}
/>
```

---

## Integration Guide

### 1. Add to Routing

**In domains/writing/WritingView.tsx:**

```tsx
import { WritingLibrary, WritingWorkspace } from '@/features/writing';
import { Tabs } from '@radix-ui/react-tabs';
import { useState } from 'react';

export function WritingView() {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedWritingId, setSelectedWritingId] = useState<number | null>(null);

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List>
        <Tabs.Trigger value="library">Library</Tabs.Trigger>
        <Tabs.Trigger value="editor">Editor</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="library">
        <WritingLibrary
          onOpenWriting={(id) => {
            setSelectedWritingId(id);
            setActiveTab('editor');
          }}
        />
      </Tabs.Content>

      <Tabs.Content value="editor">
        {selectedWritingId ? (
          <WritingWorkspace writingId={selectedWritingId} />
        ) : (
          <div>Select a writing to edit</div>
        )}
      </Tabs.Content>
    </Tabs.Root>
  );
}
```

---

### 2. "Create Article from Idea" Button

**In domains/writing/IdeasLibraryView.tsx:**

```tsx
import { useCreateWriting } from '@/features/writing';
import { useNavigate } from 'react-router-dom';

export function IdeasLibraryView() {
  const createWriting = useCreateWriting();
  const navigate = useNavigate();

  const handleCreateArticle = async (idea: Idea) => {
    const writing = await createWriting.mutateAsync({
      title: idea.title,
      writingType: 'article',
      linkIdeaIds: [idea.id],
      initialContentJson: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: idea.title }],
          },
          { type: 'paragraph' },
        ],
      },
    });

    // Navigate to editor
    navigate(`/writing/${writing.id}`);
  };

  return (
    <div>
      {ideas.map((idea) => (
        <div key={idea.id}>
          <h3>{idea.title}</h3>
          <button onClick={() => handleCreateArticle(idea)}>
            Create Article
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 3. Ideas/References Sidebar (Future)

**In WritingWorkspace left column:**

```tsx
import { useLinkedIdeas } from '@/features/writing';
import { useIdea } from '@/features/ideas';
import { useReferences } from '@/features/references';

function IdeasSidebar({ writingId }: { writingId: number }) {
  const { data: ideaIds } = useLinkedIdeas(writingId);
  const ideas = useIdeas(ideaIds); // Batch query

  return (
    <div>
      <h3>Linked Ideas</h3>
      {ideas.map((idea) => (
        <div key={idea.id}>
          <h4>{idea.title}</h4>
          <ReferencesList ideaId={idea.id} /> {/* Show references for each idea */}
        </div>
      ))}
    </div>
  );
}
```

---

## TipTap JSON Schema

### Document Structure

```typescript
interface JSONContent {
  type: 'doc';
  content: Node[];
}

interface Node {
  type: string;               // 'heading' | 'paragraph' | 'bulletList' | 'orderedList' | 'codeBlock' | 'image'
  attrs?: Record<string, any>; // Node-specific attributes
  content?: Node[];            // Child nodes (for text/marks)
  marks?: Mark[];              // Inline formatting
}

interface Mark {
  type: string;               // 'bold' | 'italic' | 'strike' | 'link'
  attrs?: Record<string, any>; // Mark-specific attributes (e.g., href for link)
}
```

### Example: Complete Document

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        { "type": "text", "text": "My Article Title" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "This is a paragraph with " },
        {
          "type": "text",
          "text": "bold text",
          "marks": [{ "type": "bold" }]
        },
        { "type": "text", "text": " and " },
        {
          "type": "text",
          "text": "a link",
          "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }]
        },
        { "type": "text", "text": "." }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "First item" }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Second item" }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "codeBlock",
      "content": [
        { "type": "text", "text": "const example = 'code';" }
      ]
    },
    {
      "type": "image",
      "attrs": {
        "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
        "alt": "Example image"
      }
    }
  ]
}
```

### Minimal Empty Document

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        { "type": "text", "text": "Untitled" }
      ]
    },
    { "type": "paragraph" }
  ]
}
```

---

## Workflow Examples

### Complete Writing Lifecycle

```typescript
// 1. Create from scratch
const createWriting = useCreateWriting();
const writing = await createWriting.mutateAsync({
  title: 'My First Article',
  writingType: 'article',
});

// 2. Edit content
const saveDraft = useSaveDraft();
saveDraft.mutate({
  writingId: writing.id,
  contentJson: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Updated Title' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Updated content...' }],
      },
    ],
  },
});

// 3. Update metadata
const updateMeta = useUpdateWritingMeta();
updateMeta.mutate({
  writingId: writing.id,
  status: 'in_progress',
  tags: 'rust, tauri, writing',
});

// 4. Link ideas
const linkIdea = useLinkIdea();
await linkIdea.mutateAsync({
  writingId: writing.id,
  ideaId: 123,
  purpose: 'primary',
});

// 5. Publish
const publishWriting = usePublishWriting();
await publishWriting.mutateAsync({
  writingId: writing.id,
  publishNow: true,
});

// 6. Query published writings
const { data: published } = useWritingList({
  status: 'published',
  writingType: 'article',
});
```

---

### Autosave Pattern

```tsx
import { useEffect, useState } from 'react';
import { useSaveDraft } from '@/features/writing';
import { WritingEditor } from '@/features/writing';
import { useDebounce } from '@/hooks/useDebounce';

function EditorWithAutosave({ writingId }: { writingId: number }) {
  const [content, setContent] = useState<JSONContent>(initialContent);
  const debouncedContent = useDebounce(content, 1500); // 1.5s debounce
  const saveDraft = useSaveDraft();

  // Autosave on debounced content change
  useEffect(() => {
    if (debouncedContent && writingId) {
      saveDraft.mutate({
        writingId,
        contentJson: debouncedContent,
      });
    }
  }, [debouncedContent, writingId]);

  // Manual save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDraft.mutate({
          writingId,
          contentJson: content,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, writingId]);

  return (
    <div>
      <WritingEditor value={content} onChange={setContent} />
      {saveDraft.isPending && <span>Saving...</span>}
      {saveDraft.isSuccess && <span>Saved</span>}
      {saveDraft.isError && <span>Error: {saveDraft.error.message}</span>}
    </div>
  );
}
```

---

## Next Steps

**Integration Tasks** (Not yet complete):
- [ ] Add WritingLibrary to `domains/writing/WritingView.tsx` tabs
- [ ] Integrate WritingWorkspace into routing system
- [ ] Implement ideas/references left sidebar in WritingWorkspace (currently stubbed)
- [ ] Add "Create article from idea" button in IdeasLibraryView
- [ ] Install TipTap npm packages if not already present

**Future Enhancements** (Phase 2):
- [ ] Version management implementation (DTOs exist, commands not created yet)
- [ ] `writing_parent_links` - Book → Chapters structure
- [ ] `idea_relation` - Idea hierarchy/subtopics
- [ ] `article_revisions` - Version history
- [ ] `article_authors` - Co-author support

**Testing Checklist**:
- [ ] Create writing from scratch
- [ ] Edit content with TipTap toolbar
- [ ] Update metadata fields
- [ ] Link/unlink ideas
- [ ] Publish workflow
- [ ] Autosave behavior (1.5s debounce)
- [ ] Ctrl+S keyboard shortcut
- [ ] Optimistic updates with rollback
- [ ] Filter writings by status/type
- [ ] Word count accuracy

---

## Troubleshooting

**"Writing not saving"**:
- Check `writingId` is valid number (not null)
- Check TipTap JSON is valid structure
- Check backend logs: `tail -f backend/storage/logs/app.log`
- Verify mutation not silently failing: Check React Query DevTools

**"Optimistic update not rolling back"**:
- Ensure mutation has `onMutate`, `onError`, `onSettled` callbacks
- Check context variable is passed correctly
- Verify query key matches exactly

**"Word count incorrect"**:
- Text extraction only counts text nodes
- Images, code blocks contribute no words
- Whitespace normalization may differ from TipTap CharacterCount

**"Ideas not linking"**:
- Check `writing_idea_links` table exists (migration 006)
- Verify `linkIdea` mutation invalidates cache
- Check backend returns success (no silent failures)

---

**For more details, see**:
- [TODO.md](../TODO.md) - Writing system completion notes
- [DONE.md](./DONE.md) - Sprint 7 completion details
- [ROADMAP.md](./ROADMAP.md) - Phase 11 architecture overview
