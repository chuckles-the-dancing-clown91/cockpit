/**
 * Shared domain types aligned with backend
 * Single source of truth for all type definitions
 */

// Idea Status - matches backend enum exactly
export type IdeaStatus = 'in_progress' | 'stalled' | 'complete';

// Idea Priority
export type IdeaPriority = 'low' | 'medium' | 'high';

/**
 * Convert frontend priority string to backend integer
 * Backend expects: 0 = low, 1 = medium, 2 = high
 */
export function priorityToNumber(priority: IdeaPriority): number {
  const map: Record<IdeaPriority, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };
  return map[priority];
}

/**
 * Convert backend priority integer to frontend string
 * Backend returns: 0 = low, 1 = medium, 2 = high
 */
export function priorityFromNumber(priority: number): IdeaPriority {
  const map: Record<number, IdeaPriority> = {
    0: 'low',
    1: 'medium',
    2: 'high',
  };
  return map[priority] || 'medium'; // Default to medium if invalid
}

// Reference Type
export type ReferenceType = 'manual' | 'article' | 'web';

// Base Idea interface
export interface Idea {
  id: number;
  title: string;
  summary: string | null;
  status: IdeaStatus;
  priority: IdeaPriority;
  target: string | null;
  notesMarkdown: string | null;
  isPinned: boolean;
  dateAdded: string;
  dateUpdated: string;
  dateCompleted: string | null;
  dateRemoved: string | null;
}

// Reference interface
export interface Reference {
  id: number;
  ideaId: number;
  referenceType: ReferenceType;
  title: string | null;
  url: string | null;
  description: string | null;
  notesMarkdown: string | null;
  addedAt: string;
  updatedAt: string;
}

// News Article interface
export interface NewsArticle {
  id: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  sourceId: number | null;
  isStarred: boolean;
  isDismissed: boolean;
  addedToIdeasAt: string | null;
}

// Feed Source interface
export interface FeedSource {
  id: number;
  name: string;
  sourceType: string;
  enabled: boolean;
  apiKey: string | null;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// App Settings interface
export interface AppSettings {
  id: number;
  masterKey: string;
  newsdataApiKey: string | null;
  newsFetchEnabled: boolean;
  newsFetchInterval: number;
  createdAt: string;
  updatedAt: string;
}

// Theme type
export type Theme = 'dark' | 'light' | 'cyberpunk';

// Webview types
export type EntityType = "idea" | "reference" | "writing";

export type ThemeMode = "dark" | "light" | "cyberpunk";

export type NotesAppendMode = "append_with_divider" | "append_plain" | "replace";

/**
 * Where should "Copy to Notes" go?
 * Your desired path: notes > references > idea
 * - Always require referenceId
 * - ideaId optional (but recommended) for traceability
 */
export type NoteTarget =
  | {
      kind: "reference_note";
      referenceId: number;
      ideaId?: number;
    }
  | {
      kind: "idea_note";
      ideaId: number;
    }
  | {
      kind: "writing_note";
      writingId: number;
    };

/**
 * A session context passed when opening the webview.
 * The webview feature shouldn't "know about Ideas" beyond these IDs.
 */
export interface WebviewContext {
  // The URL we are viewing
  url: string;

  // Optional UI title for the modal header
  title?: string;

  // Used for "Copy to Notes" and linking behavior
  noteTarget?: NoteTarget;

  // Optional: if this webview is opened while editing a writing/article
  writingId?: number;

  // Optional: if this webview is opened from an idea detail flow
  ideaId?: number;

  // Optional: reference the canonical Reference row if you already created it
  referenceId?: number;

  // Optional: open behavior
  openExternalByDefault?: boolean;

  // Optional: tagging for logs/metrics
  sourceFeature?: "ideas" | "writing" | "research" | "system";
}

/**
 * The selection payload captured from the webview.
 * This is what context-menu actions consume.
 */
export interface WebviewSelection {
  text: string;
  html?: string;
  // Where on the page it came from (best-effort)
  pageUrl: string;
  // Optional
  title?: string;
  // A tiny excerpt for logging/preview
  preview?: string;
}

/**
 * Actions the webview UI can trigger.
 * Keep this stable; the menu simply enables/disables these.
 */
export type WebviewActionType =
  | "COPY_TO_NOTES"
  | "ADD_REFERENCE_TO_IDEA"
  | "OPEN_EXTERNAL"
  | "COPY_LINK"
  | "DISMISS";

/**
 * Action request dispatched by the webview feature.
 */
export interface WebviewActionRequest {
  type: WebviewActionType;
  context: WebviewContext;
  selection?: WebviewSelection; // present for selection-based actions
}

/**
 * Action result (so UI can toast + update query caches).
 */
export interface WebviewActionResult {
  ok: boolean;
  message?: string;

  // If actions create/link entities, return IDs to help UI
  createdReferenceId?: number;
  linkedIdeaId?: number;

  // For notes appends
  appendedNoteId?: number;
}

// Note types
export type NoteEntityType = 'idea' | 'reference' | 'writing';
export type NoteType = 'main' | 'highlight' | 'annotation' | 'todo' | 'draft_note';

export interface Note {
  id: number;
  entityType: NoteEntityType;
  entityId: number;
  noteType: NoteType;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppendSnippetInput {
  entityType: NoteEntityType;
  entityId: number;
  noteType?: NoteType;
  snippetText: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

// Writing System Types (TipTap JSON content + Draft Management)
// =============================================================================

export type WritingType = 'article' | 'chapter' | 'book';
export type WritingStatus = 'draft' | 'in_progress' | 'review' | 'published' | 'archived';

export interface Writing {
  id: number;
  title: string;
  slug: string | null;
  writingType: WritingType;
  status: WritingStatus;
  contentJson: any; // TipTap JSON document
  contentText: string; // Plain text extract for preview
  excerpt: string | null;
  tags: string | null; // JSON string or comma-separated
  wordCount: number;
  seriesName: string | null;
  seriesPart: number | null;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateWritingInput {
  title: string;
  slug?: string | null;
  writingType: WritingType;
  linkIdeaIds: number[];
  initialContentJson: any; // TipTap JSON
  excerpt?: string | null;
  tags?: string | null;
}

export interface SaveDraftInput {
  writingId: number;
  contentJson: any;
}

export interface UpdateWritingMetaInput {
  writingId: number;
  title?: string;
  slug?: string | null;
  writingType?: WritingType;
  status?: WritingStatus;
  excerpt?: string | null;
  tags?: string | null;
  seriesName?: string | null;
  seriesPart?: number | null;
  isPinned?: boolean;
  isFeatured?: boolean;
}

export interface PublishWritingInput {
  writingId: number;
}

export interface LinkIdeaToWritingInput {
  writingId: number;
  ideaId: number;
}
