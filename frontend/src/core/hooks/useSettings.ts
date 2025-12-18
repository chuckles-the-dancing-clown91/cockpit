import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppSettings, updateAppSettings, type AppSettingsDto } from '@/core/api/tauri';
import { SettingKey, type SettingValueType, type FeatureCapabilities } from '@/shared/settings';
import { queryKeys, invalidation } from '@/shared/queryKeys';
import { toast } from '@/core/lib/toast';

/**
 * Hook to get all application settings
 */
export function useSettings() {
  return useQuery<AppSettingsDto>({
    queryKey: queryKeys.settings.all(),
    queryFn: getAppSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get a specific setting value with type safety
 * 
 * @example
 * const theme = useSetting(SettingKey.AppTheme); // Returns string | undefined
 * const autoSync = useSetting(SettingKey.NewsAutoSync); // Returns boolean | undefined
 */
export function useSetting<K extends SettingKey>(
  key: K
): SettingValueType<K> | undefined {
  const { data: settings } = useSettings();
  
  if (!settings) return undefined;
  
  // Determine category from key prefix
  const category = key.split('.')[0] as keyof AppSettingsDto;
  const categorySettings = settings[category];
  
  if (!categorySettings) return undefined;
  
  const setting = categorySettings[key];
  return setting?.value as SettingValueType<K> | undefined;
}

/**
 * Hook to update settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Record<SettingKey, unknown>>) => {
      const settingsArray = Object.entries(updates).map(([key, value]) => ({
        key,
        value,
      }));
      
      return updateAppSettings({ settings: settingsArray });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(invalidation.invalidateSettings());
      toast.success('Settings updated', 'Your changes have been saved.');
    },
    onError: (error: Error) => {
      toast.error('Failed to update settings', error.message);
    },
  });
}

/**
 * Hook to update a single setting with type safety
 */
export function useUpdateSetting<K extends SettingKey>() {
  const { mutateAsync: updateSettings } = useUpdateSettings();
  
  return async (key: K, value: SettingValueType<K>) => {
    await updateSettings({ [key]: value });
  };
}

/**
 * Hook to get feature capabilities based on configured settings
 * 
 * Determines which features are enabled based on API key presence
 * and user preferences.
 */
export function useCapabilities(): FeatureCapabilities | undefined {
  const { data: settings } = useSettings();
  
  if (!settings) return undefined;
  
  const newsApiKey = settings.news?.[SettingKey.NewsDataApiKey]?.value as string | undefined;
  const newsAutoSync = settings.news?.[SettingKey.NewsAutoSync]?.value as boolean | undefined;
  
  return {
    news: {
      enabled: Boolean(newsApiKey && newsApiKey.length > 0),
      autoSync: Boolean(newsAutoSync),
    },
    google: {
      enabled: false, // TODO: Add when Google integration added
    },
    reddit: {
      enabled: false, // TODO: Add when Reddit integration added
    },
    x: {
      enabled: false, // TODO: Add when X integration added
    },
  };
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureEnabled(feature: keyof FeatureCapabilities): boolean {
  const capabilities = useCapabilities();
  return capabilities?.[feature]?.enabled ?? false;
}
