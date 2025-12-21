import type { FeedSourceConfig } from '@/shared/types';

export type NewsSettingsOutput = {
  hasApiKey: boolean;
};

export type SaveNewsSettingsInput = {
  apiKey?: string | null;
};

export type CreateFeedSourceInput = {
  name: string;
  sourceType: string;
  apiKey?: string | null;
  config?: FeedSourceConfig | null;
  schedule?: string | null;
};

export type UpdateFeedSourcePatch = {
  name?: string | null;
  enabled?: boolean | null;
  apiKey?: string | null;
  config?: FeedSourceConfig | null;
  schedule?: string | null;
};
