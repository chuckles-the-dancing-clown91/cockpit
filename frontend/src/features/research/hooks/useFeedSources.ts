import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFeedSource,
  deleteFeedSource,
  listFeedSources,
  syncFeedSourceNow,
  toggleFeedSource,
  updateFeedSource,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';
import type { FeedSource } from '@/shared/types';

import type { CreateFeedSourceInput, UpdateFeedSourcePatch } from '../types';

export function useFeedSources() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.sources.all(),
    queryFn: listFeedSources,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateFeedSourceInput) => createFeedSource(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.sources.all() });
      toast.success('Feed source created');
    },
    onError: (e) => {
      toast.error('Failed to create feed source', String(e));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (p: { id: number; patch: UpdateFeedSourcePatch }) =>
      updateFeedSource(p.id, p.patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.sources.all() });
      toast.success('Feed source updated');
    },
    onError: (e) => {
      toast.error('Failed to update feed source', String(e));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeedSource(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.sources.all() });
      toast.success('Feed source removed');
    },
    onError: (e) => {
      toast.error('Failed to remove feed source', String(e));
    },
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: (p: { id: number; enabled: boolean }) => toggleFeedSource(p.id, p.enabled),
    onSuccess: async (_saved: FeedSource) => {
      await qc.invalidateQueries({ queryKey: queryKeys.sources.all() });
    },
    onError: (e) => {
      toast.error('Failed to toggle feed source', String(e));
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: (p: { id: number }) => syncFeedSourceNow(p.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.sources.all() });
      toast.success('Sync started');
    },
    onError: (e) => {
      toast.error('Failed to sync feed source', String(e));
    },
  });

  return {
    ...query,
    query,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleEnabledMutation,
    syncNowMutation,
  };
}
