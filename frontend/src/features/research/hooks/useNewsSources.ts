import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listNewsSources, syncNewsSourcesNow } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

export function useNewsSources(params?: { country?: string; language?: string; search?: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.newsSources.list(params),
    queryFn: () => listNewsSources(params),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncNewsSourcesNow(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.newsSources.all() });
      toast.success('News source catalog synced');
    },
    onError: (e) => {
      toast.error('Failed to sync news source catalog', String(e));
    },
  });

  return { query, syncMutation };
}

