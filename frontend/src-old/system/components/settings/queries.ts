/**
 * TanStack Query hooks for App Settings
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type SettingValue = {
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
};

export type AppSettings = {
  general: Record<string, SettingValue>;
  news: Record<string, SettingValue>;
  writing: Record<string, SettingValue>;
  appearance: Record<string, SettingValue>;
  advanced: Record<string, SettingValue>;
};

export type UpdateSettingInput = {
  key: string;
  value: unknown;
};

// ============================================================================
// App Settings Queries
// ============================================================================

export function useAppSettings() {
  return useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        console.log('[Settings] Fetching app settings...');
        const result = await invoke<AppSettings>('get_app_settings');
        console.log('[Settings] Loaded settings:', result);
        return result;
      } catch (error) {
        console.error('[Settings] Failed to fetch settings:', error);
        throw error;
      }
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSettingInput) => {
      await invoke('update_setting', { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: UpdateSettingInput[]) => {
      await invoke('update_settings', { inputs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });
}
