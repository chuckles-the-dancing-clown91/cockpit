/**
 * Writing React Query hooks
 * 
 * Provides optimistic updates, caching, and state management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Writing,
  CreateWritingInput,
  SaveDraftInput,
  UpdateWritingMetaInput,
  PublishWritingInput,
  LinkIdeaToWritingInput,
  WritingType,
  WritingStatus,
  GetWritingInput,
  ListLinkedIdeasInput,
  ListWritingsInput,
} from '../types';
import * as api from '../api/writing';

// Query keys factory
export const writingKeys = {
  all: ['writings'] as const,
  lists: () => [...writingKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...writingKeys.lists(), filters] as const,
  details: () => [...writingKeys.all, 'detail'] as const,
  detail: (id: number) => [...writingKeys.details(), id] as const,
  linkedIdeas: (id: number) => [...writingKeys.detail(id), 'linked-ideas'] as const,
};

/**
 * List all writings
 */
export function useWritingList(filters: ListWritingsInput = {}) {
  return useQuery({
    queryKey: writingKeys.list(filters || {}),
    queryFn: () => api.writingList(filters),
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get single writing by ID
 */
export function useWriting(writingId: number | null) {
  return useQuery({
    queryKey: writingId ? writingKeys.detail(writingId) : ['writings', 'detail', 'null'],
    queryFn: () => api.writingGet({ writingId: writingId! } satisfies GetWritingInput),
    enabled: writingId !== null,
    staleTime: 10_000, // 10 seconds
  });
}

/**
 * Create a new writing
 */
export function useCreateWriting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateWritingInput) => api.writingCreate(input),
    onSuccess: (newWriting) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: writingKeys.lists() });
      
      // Optimistically set the new writing in cache
      queryClient.setQueryData(writingKeys.detail(newWriting.id), newWriting);
    },
  });
}

/**
 * Save draft content (debounced autosave)
 */
export function useSaveDraft(writingId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contentJson: any) => api.writingSaveDraft({ writingId, contentJson }),
    onMutate: async (contentJson) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: writingKeys.detail(writingId) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<Writing>(writingKeys.detail(writingId));
      
      // Optimistically update
      if (previous) {
        queryClient.setQueryData<Writing>(writingKeys.detail(writingId), {
          ...previous,
          contentJson,
          updatedAt: new Date().toISOString(),
        });
      }
      
      return { previous };
    },
    onError: (err, contentJson, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(writingKeys.detail(writingId), context.previous);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: writingKeys.detail(writingId) });
    },
  });
}

/**
 * Update writing metadata
 */
export function useUpdateWritingMeta(writingId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: Omit<UpdateWritingMetaInput, 'writingId'>) =>
      api.writingUpdateMeta({ writingId, ...input }),
    onSuccess: (updated) => {
      // Update cache
      queryClient.setQueryData(writingKeys.detail(writingId), updated);
      
      // Invalidate list queries (status/type might have changed)
      queryClient.invalidateQueries({ queryKey: writingKeys.lists() });
    },
  });
}

/**
 * Publish a writing
 */
export function usePublishWriting(writingId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.writingPublish({ writingId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(writingKeys.detail(writingId), updated);
      queryClient.invalidateQueries({ queryKey: writingKeys.lists() });
    },
  });
}

/**
 * Link an idea to a writing
 */
export function useLinkIdea(writingId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ideaId: number) => api.writingLinkIdea({ writingId, ideaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingKeys.linkedIdeas(writingId) });
    },
  });
}

/**
 * Unlink an idea from a writing
 */
export function useUnlinkIdea(writingId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ideaId: number) => api.writingUnlinkIdea({ writingId, ideaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingKeys.linkedIdeas(writingId) });
    },
  });
}

/**
 * Get ideas linked to a writing
 */
export function useLinkedIdeas(writingId: number) {
  return useQuery({
    queryKey: writingKeys.linkedIdeas(writingId),
    queryFn: () => api.writingListLinkedIdeas({ writingId } satisfies ListLinkedIdeasInput),
    staleTime: 30_000,
  });
}
