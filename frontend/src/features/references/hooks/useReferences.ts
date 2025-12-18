import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listIdeaReferences,
  addReferenceToIdea,
  removeReference,
  updateReferenceNotes,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

/**
 * Hook for fetching references for an idea
 */
export function useIdeaReferences(ideaId: number | null) {
  return useQuery({
    queryKey: queryKeys.references.list(ideaId!),
    queryFn: () => listIdeaReferences(ideaId!),
    enabled: !!ideaId,
    staleTime: 30000,
  });
}

/**
 * Hook for adding a reference to an idea
 */
export function useAddReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      ideaId: number;
      referenceType: string;
      newsArticleId?: number;
      title?: string;
      url?: string;
      description?: string;
      sourceId?: number;
    }) => addReferenceToIdea(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.references.list(variables.ideaId) });
      toast.success('Reference added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add reference: ${error.message}`);
    },
  });
}

/**
 * Hook for removing a reference
 */
export function useRemoveReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceId: number) => removeReference(referenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.references._def });
      toast.success('Reference removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove reference: ${error.message}`);
    },
  });
}

/**
 * Hook for updating reference notes
 */
export function useUpdateReferenceNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ referenceId, notesMarkdown }: { referenceId: number; notesMarkdown: string }) =>
      updateReferenceNotes(referenceId, notesMarkdown),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.references._def });
      toast.success('Notes updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update notes: ${error.message}`);
    },
  });
}
