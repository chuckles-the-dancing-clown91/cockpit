import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listIdeas,
  getIdea,
  createIdea,
  updateIdeaMetadata,
  updateIdeaNotes,
  deleteIdea,
  archiveIdea,
  restoreIdea,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';
import type { Idea, IdeaStatus, IdeaPriority } from '@/shared/types';
import { priorityToNumber } from '@/shared/types';

/**
 * Hook for fetching all ideas
 */
export function useIdeas() {
  return useQuery({
    queryKey: queryKeys.ideas.all(),
    queryFn: listIdeas,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook for fetching a single idea by ID
 */
export function useIdea(id: number | null) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(id!),
    queryFn: () => getIdea(id!),
    enabled: !!id, // Only run query if ID is provided
    staleTime: 60000,
  });
}

/**
 * Hook for creating a new idea
 */
export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      summary?: string;
      status?: IdeaStatus;
      priority?: IdeaPriority;
      target?: string;
    }) => createIdea({
      ...input,
      priority: input.priority ? priorityToNumber(input.priority) : undefined,
    }),
    onSuccess: (newIdea) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success(`Created: ${newIdea.title}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create idea: ${error.message}`);
    },
  });
}

/**
 * Hook for updating idea metadata
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: number;
      title?: string;
      summary?: string;
      status?: IdeaStatus;
      priority?: IdeaPriority;
      target?: string;
    }) => updateIdeaMetadata({
      ...input,
      priority: input.priority ? priorityToNumber(input.priority) : undefined,
    }),
    onSuccess: (updatedIdea) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(updatedIdea.id) });
      toast.success('Idea updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update idea: ${error.message}`);
    },
  });
}

/**
 * Hook for updating idea notes
 */
export function useUpdateIdeaNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notesMarkdown }: { id: number; notesMarkdown: string }) =>
      updateIdeaNotes(id, notesMarkdown),
    onSuccess: (updatedIdea) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(updatedIdea.id) });
      toast.success('Notes saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save notes: ${error.message}`);
    },
  });
}

/**
 * Hook for deleting an idea
 */
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteIdea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete idea: ${error.message}`);
    },
  });
}

/**
 * Hook for archiving an idea
 */
export function useArchiveIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => archiveIdea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive idea: ${error.message}`);
    },
  });
}

/**
 * Hook for restoring an archived idea
 */
export function useRestoreIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreIdea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore idea: ${error.message}`);
    },
  });
}
