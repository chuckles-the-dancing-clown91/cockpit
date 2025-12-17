/**
 * Shared domain types aligned with backend
 * Single source of truth for all type definitions
 */

// Idea Status - matches backend enum exactly
export type IdeaStatus = 'in_progress' | 'stalled' | 'complete';

// Idea Priority
export type IdeaPriority = 'low' | 'medium' | 'high';

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
