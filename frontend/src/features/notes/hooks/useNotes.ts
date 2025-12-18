import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NoteEntityType, NoteType } from '@/shared/types';
import { notesAppendSnippet, notesGetOrCreate, notesUpsert } from '../api/notes';

/**
 * Query key factory for notes
 */
export function noteKey(entityType: NoteEntityType, entityId: number, noteType: NoteType = 'main') {
  return ['notes', entityType, entityId, noteType] as const;
}

/**
 * Get or create a note for an entity
 * Automatically creates empty note if it doesn't exist
 */
export function useNote(
  entityType: NoteEntityType,
  entityId: number,
  noteType: NoteType = 'main'
) {
  return useQuery({
    queryKey: noteKey(entityType, entityId, noteType),
    queryFn: () => notesGetOrCreate({ entityType, entityId, noteType }),
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Save or update a note's content
 */
export function useSaveNote(
  entityType: NoteEntityType,
  entityId: number,
  noteType: NoteType = 'main'
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bodyHtml: string) =>
      notesUpsert({ entityType, entityId, noteType, bodyHtml }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: noteKey(entityType, entityId, noteType),
      });
    },
  });
}

/**
 * Append a snippet to a note (with divider)
 * Use for "Copy to Notes" actions from webview or article viewer
 */
export function useAppendSnippet(
  entityType: NoteEntityType,
  entityId: number,
  noteType: NoteType = 'main'
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (args: {
      snippetText: string;
      sourceUrl?: string;
      sourceTitle?: string;
    }) => notesAppendSnippet({ entityType, entityId, noteType, ...args }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: noteKey(entityType, entityId, noteType),
      });
    },
  });
}
