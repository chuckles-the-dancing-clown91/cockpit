import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getNewsSettings, saveNewsSettings } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

import type { NewsSettingsOutput, SaveNewsSettingsInput } from '../types';

export function useNewsSettings() {
  const qc = useQueryClient();

  const query = useQuery<NewsSettingsOutput>({
    queryKey: queryKeys.newsSettings.all(),
    queryFn: getNewsSettings,
  });

  const saveMutation = useMutation({
    mutationFn: (input: SaveNewsSettingsInput) => saveNewsSettings(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.newsSettings.all() });
      toast.success('Client settings saved');
    },
    onError: (e) => {
      toast.error('Failed to save client settings', String(e));
    },
  });

  return { query, saveMutation };
}

