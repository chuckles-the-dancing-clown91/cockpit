import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidation, queryKeys } from '@/shared/queryKeys';
import type {
  CreateResearchAccountInput,
  ListResearchItemsInput,
  ResearchAccount,
  ResearchItem,
  ResearchStream,
  UpdateResearchAccountInput,
  UpsertResearchStreamInput,
} from '@/shared/types';
import * as api from '../api/research';

export function useResearchAccounts() {
  return useQuery({
    queryKey: queryKeys.research.accounts.list(),
    queryFn: api.researchListAccounts,
    staleTime: 30_000,
  });
}

export function useUpsertResearchAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResearchAccountInput) => api.researchUpsertAccount(input),
    onSuccess: () => {
      qc.invalidateQueries(invalidation.invalidateResearchAccounts());
    },
  });
}

export function useUpdateResearchAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateResearchAccountInput) => api.researchUpdateAccount(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(invalidation.invalidateResearchAccounts());
      if (vars.id) {
        qc.invalidateQueries(invalidation.invalidateResearchAccount(vars.id));
        qc.invalidateQueries(invalidation.invalidateResearchStreams(vars.id));
      }
    },
  });
}

export function useDeleteResearchAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.researchDeleteAccount(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries(invalidation.invalidateResearchAccounts());
      qc.invalidateQueries(invalidation.invalidateResearchStreams(id));
      qc.invalidateQueries(invalidation.invalidateResearchItems());
    },
  });
}

export function useResearchStreams(accountId?: number | null) {
  return useQuery({
    queryKey: queryKeys.research.streams.list(accountId ?? null),
    queryFn: () => api.researchListStreams(accountId ?? undefined),
    staleTime: 30_000,
  });
}

export function useUpsertResearchStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertResearchStreamInput) => api.researchUpsertStream(input),
    onSuccess: (saved) => {
      qc.invalidateQueries(invalidation.invalidateResearchStreams(saved.accountId));
      qc.invalidateQueries(invalidation.invalidateResearchItems());
    },
  });
}

export function useDeleteResearchStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.researchDeleteStream(id),
    onSuccess: () => {
      qc.invalidateQueries(invalidation.invalidateResearchStreams());
      qc.invalidateQueries(invalidation.invalidateResearchItems());
    },
  });
}

export function useSyncResearchStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (streamId: number) => api.researchSyncStreamNow(streamId),
    onSuccess: (_, streamId) => {
      qc.invalidateQueries(invalidation.invalidateResearchStreams());
      qc.invalidateQueries(invalidation.invalidateResearchItems({ streamId }));
    },
  });
}

export function useResearchItems(filters: ListResearchItemsInput = {}) {
  return useQuery<ResearchItem[]>({
    queryKey: queryKeys.research.items.list(filters || {}),
    queryFn: () => api.researchListItems(filters),
    staleTime: 20_000,
  });
}

export function useSetResearchItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: string }) =>
      api.researchSetItemStatus(itemId, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(invalidation.invalidateResearchItems());
      qc.invalidateQueries(invalidation.invalidateResearchItem(vars.itemId));
    },
  });
}
