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

export interface ReferenceReaderSnapshot {
  referenceId: number;
  url: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  contentText: string;
}

// News Article interface
export interface NewsArticle {
  id: number;
  articleId: string | null;
  title: string;
  excerpt: string | null;
  url: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  sourceDomain: string | null;
  sourceId: string | null;
  tags: string[];
  country: string[];
  language: string | null;
  category: string | null;
  publishedAt: string | null;
  fetchedAt: string | null;
  addedVia: string | null;
  isStarred: boolean;
  isDismissed: boolean;
  isRead: boolean;
  addedToIdeasAt: string | null;
  dismissedAt: string | null;
}

// Feed Source interface
export interface FeedSource {
  id: number;
  name: string;
  sourceType: string;
  enabled: boolean;
  hasApiKey: boolean;
  config: FeedSourceConfig | null;
  taskId: number | null;
  schedule: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  articleCount: number;
  errorCount: number;
  apiCallsToday: number;
  apiQuotaDaily: number | null;
  createdAt: string;
  updatedAt: string;
}

export type FeedSourceConfig = {
  schedule?: string | null;
  newsdata?: {
    language?: string | null;
    countries?: string[] | null;
    categories?: string[] | null;
    domains?: string[] | null;
    exclude_domains?: string[] | null;
    query?: string | null;
    max_pages?: number | null;
    use_archive?: boolean | null;
    from_date?: string | null;
    to_date?: string | null;
  } | null;
  reddit?: {
    subreddits?: string[] | null;
    sort?: string | null;
    time_filter?: string | null;
    limit?: number | null;
  } | null;
  rss?: {
    feed_url?: string | null;
    update_interval_minutes?: number | null;
  } | null;
};

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

// ========== Research / Connectors ==========

export type ResearchCapability =
  | "readStream"
  | "search"
  | "publishPost"
  | "publishReply"
  | "reactVote";

export interface ResearchAccount {
  id: number;
  provider: string;
  displayName: string;
  enabled: boolean;
  allowedCaps: ResearchCapability[];
  permissions?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchStream {
  id: number;
  accountId: number;
  name: string;
  provider: string;
  enabled: boolean;
  config?: unknown;
  schedule?: unknown;
  lastSyncAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchItem {
  id: number;
  accountId?: number | null;
  streamId?: number | null;
  sourceType: string;
  externalId: string;
  url?: string | null;
  title: string;
  excerpt?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  status: string;
  tags?: unknown;
  payload?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResearchAccountInput {
  provider: string;
  displayName: string;
  enabled?: boolean;
  allowedCaps: ResearchCapability[];
  permissions?: unknown;
  auth?: unknown;
}

export interface UpdateResearchAccountInput {
  id: number;
  provider?: string;
  displayName?: string;
  enabled?: boolean;
  allowedCaps?: ResearchCapability[];
  permissions?: unknown;
  auth?: unknown;
}

export interface UpsertResearchStreamInput {
  id?: number;
  accountId: number;
  name: string;
  provider: string;
  enabled?: boolean;
  config?: unknown;
  schedule?: unknown;
}

export interface ListResearchItemsInput {
  provider?: string;
  accountId?: number;
  streamId?: number;
  status?: string;
  search?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// News sources (NewsData.io) catalog
export interface NewsSourceDto {
  id: number;
  sourceId: string;
  name: string;
  url: string | null;
  country: string | null;
  language: string | null;
  category: string[];
  isActive: boolean;
  isMuted: boolean;
}

export type NewsSource = NewsSourceDto;

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

export interface GetWritingInput {
  writingId: number;
}

export interface ListLinkedIdeasInput {
  writingId: number;
}

export interface ListWritingsInput {
  status?: WritingStatus;
  writingType?: WritingType;
  search?: string;
  archived?: boolean;
  sort?: string;
  seriesName?: string;
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
