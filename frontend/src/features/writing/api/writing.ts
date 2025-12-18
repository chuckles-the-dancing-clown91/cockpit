/**
 * Writing API - Tauri invoke wrappers
 * 
 * Maps between frontend camelCase and backend snake_case
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Writing,
  CreateWritingInput,
  SaveDraftInput,
  UpdateWritingMetaInput,
  PublishWritingInput,
  LinkIdeaToWritingInput,
  WritingType,
  WritingStatus,
} from '@/shared/types';

/**
 * Map backend WritingDraftDto to frontend Writing
 */
function mapWriting(raw: any): Writing {
  return {
    id: Number(raw.id),
    title: raw.title || '',
    slug: raw.slug ?? null,
    writingType: (raw.writingType || raw.writing_type || 'article') as WritingType,
    status: (raw.status || 'draft') as WritingStatus,
    contentJson: raw.contentJson || raw.content_json || { type: 'doc', content: [] },
    contentText: raw.contentText || raw.content_text || '',
    excerpt: raw.excerpt ?? null,
    tags: raw.tags ?? null,
    wordCount: Number(raw.wordCount || raw.word_count || 0),
    seriesName: raw.seriesName || raw.series_name ?? null,
    seriesPart: raw.seriesPart || raw.series_part ?? null,
    isPinned: Boolean(raw.isPinned ?? raw.is_pinned ?? false),
    isFeatured: Boolean(raw.isFeatured ?? raw.is_featured ?? false),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    publishedAt: raw.publishedAt || raw.published_at ?? null,
  };
}

/**
 * Create a new writing
 */
export async function writingCreate(input: CreateWritingInput): Promise<Writing> {
  const raw = await invoke('writing_create', { input });
  return mapWriting(raw);
}

/**
 * Get writing by ID
 */
export async function writingGet(writingId: number): Promise<Writing> {
  const raw = await invoke('writing_get', { writingId });
  return mapWriting(raw);
}

/**
 * List all writings with optional filters
 */
export async function writingList(query?: {
  status?: WritingStatus;
  writingType?: WritingType;
  seriesName?: string;
  isPinned?: boolean;
  isFeatured?: boolean;
}): Promise<Writing[]> {
  const raw = await invoke('writing_list', { query: query || {} });
  return (raw as any[]).map(mapWriting);
}

/**
 * Update writing metadata
 */
export async function writingUpdateMeta(input: UpdateWritingMetaInput): Promise<Writing> {
  const raw = await invoke('writing_update_meta', { input });
  return mapWriting(raw);
}

/**
 * Save draft content (TipTap JSON)
 */
export async function writingSaveDraft(input: SaveDraftInput): Promise<Writing> {
  const raw = await invoke('writing_save_draft', { input });
  return mapWriting(raw);
}

/**
 * Publish a writing
 */
export async function writingPublish(input: PublishWritingInput): Promise<Writing> {
  const raw = await invoke('writing_publish', { input });
  return mapWriting(raw);
}

/**
 * Link an idea to a writing
 */
export async function writingLinkIdea(input: LinkIdeaToWritingInput): Promise<void> {
  await invoke('writing_link_idea', { input });
}

/**
 * Unlink an idea from a writing
 */
export async function writingUnlinkIdea(input: LinkIdeaToWritingInput): Promise<void> {
  await invoke('writing_unlink_idea', { input });
}

/**
 * List ideas linked to a writing
 */
export async function writingListLinkedIdeas(writingId: number): Promise<number[]> {
  return await invoke('writing_list_linked_ideas', { writingId });
}
