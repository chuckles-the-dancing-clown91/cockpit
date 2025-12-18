import { invoke } from '@tauri-apps/api/core';
import type { Note, NoteEntityType, NoteType } from '@/shared/types';

interface GetOrCreateArgs {
  entityType: NoteEntityType;
  entityId: number;
  noteType?: NoteType;
}

interface UpsertArgs extends GetOrCreateArgs {
  bodyHtml: string;
}

interface AppendArgs extends GetOrCreateArgs {
  snippetText: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

/**
 * Map backend response to frontend Note type
 */
function mapNote(raw: any): Note {
  return {
    id: Number(raw.id),
    entityType: raw.entityType || raw.entity_type,
    entityId: Number(raw.entityId || raw.entity_id),
    noteType: raw.noteType || raw.note_type || 'main',
    bodyHtml: raw.bodyHtml || raw.body_html || '',
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

/**
 * Get or create a note for an entity
 * Returns existing note or creates empty one
 */
export async function notesGetOrCreate(args: GetOrCreateArgs): Promise<Note> {
  const raw = await invoke('notes_get_or_create', {
    entityType: args.entityType,
    entityId: args.entityId,
    noteType: args.noteType || 'main',
  });
  return mapNote(raw);
}

/**
 * Create or update a note's content
 */
export async function notesUpsert(args: UpsertArgs): Promise<Note> {
  const raw = await invoke('notes_upsert', {
    entityType: args.entityType,
    entityId: args.entityId,
    noteType: args.noteType || 'main',
    bodyHtml: args.bodyHtml,
  });
  return mapNote(raw);
}

/**
 * Append a snippet to a note with divider
 * Automatically adds <hr /> if note has existing content
 */
export async function notesAppendSnippet(args: AppendArgs): Promise<Note> {
  const raw = await invoke('notes_append_snippet', {
    entityType: args.entityType,
    entityId: args.entityId,
    noteType: args.noteType || 'main',
    snippetText: args.snippetText,
    sourceUrl: args.sourceUrl,
    sourceTitle: args.sourceTitle,
  });
  return mapNote(raw);
}
