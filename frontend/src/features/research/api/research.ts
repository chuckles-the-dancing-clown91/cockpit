import { invoke } from '@tauri-apps/api/core';
import { invokeInput, invokeNoArgs } from '@/core/api/invoke';
import type {
  CreateResearchAccountInput,
  ListResearchItemsInput,
  ResearchAccount,
  ResearchCapability,
  ResearchItem,
  ResearchStream,
  UpdateResearchAccountInput,
  UpsertResearchStreamInput,
} from '@/shared/types';

const mapAccount = (raw: any): ResearchAccount => ({
  id: Number(raw.id),
  provider: raw.provider,
  displayName: raw.displayName ?? raw.display_name ?? '',
  enabled: Boolean(raw.enabled),
  allowedCaps: (raw.allowedCaps ?? raw.allowed_caps ?? []) as ResearchCapability[],
  permissions: raw.permissions,
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
});

const mapStream = (raw: any): ResearchStream => ({
  id: Number(raw.id),
  accountId: Number(raw.accountId ?? raw.account_id),
  name: raw.name,
  provider: raw.provider,
  enabled: Boolean(raw.enabled),
  config: raw.config ?? raw.config_json,
  schedule: raw.schedule ?? raw.schedule_json,
  lastSyncAt: raw.lastSyncAt ?? raw.last_sync_at ?? null,
  lastError: raw.lastError ?? raw.last_error ?? null,
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
});

const mapItem = (raw: any): ResearchItem => ({
  id: Number(raw.id),
  accountId: raw.accountId ?? raw.account_id ?? null,
  streamId: raw.streamId ?? raw.stream_id ?? null,
  sourceType: raw.sourceType ?? raw.source_type,
  externalId: raw.externalId ?? raw.external_id,
  url: raw.url ?? null,
  title: raw.title,
  excerpt: raw.excerpt ?? null,
  author: raw.author ?? null,
  publishedAt: raw.publishedAt ?? raw.published_at ?? null,
  status: raw.status,
  tags: raw.tags ?? raw.tags_json,
  payload: raw.payload ?? raw.payload_json,
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
});

export async function researchListAccounts(): Promise<ResearchAccount[]> {
  const raw = await invokeNoArgs<any[]>('research_list_accounts');
  return (raw || []).map(mapAccount);
}

export async function researchUpsertAccount(
  input: CreateResearchAccountInput,
): Promise<ResearchAccount> {
  const raw = await invokeInput<any, CreateResearchAccountInput>('research_upsert_account', input);
  return mapAccount(raw);
}

export async function researchUpdateAccount(
  input: UpdateResearchAccountInput,
): Promise<ResearchAccount> {
  const raw = await invokeInput<any, UpdateResearchAccountInput>('research_update_account', input);
  return mapAccount(raw);
}

export async function researchDeleteAccount(id: number): Promise<void> {
  await invoke('research_delete_account', { id });
}

export async function researchTestAccount(id: number): Promise<void> {
  await invoke('research_test_account', { id });
}

export async function researchListStreams(accountId?: number | null): Promise<ResearchStream[]> {
  const args = accountId ? { account_id: accountId } : {};
  const raw = await invoke<any[]>('research_list_streams', args);
  return (raw || []).map(mapStream);
}

export async function researchUpsertStream(
  input: UpsertResearchStreamInput,
): Promise<ResearchStream> {
  const raw = await invokeInput<any, UpsertResearchStreamInput>('research_upsert_stream', input);
  return mapStream(raw);
}

export async function researchDeleteStream(id: number): Promise<void> {
  await invoke('research_delete_stream', { id });
}

export async function researchSyncStreamNow(streamId: number): Promise<void> {
  await invoke('research_sync_stream_now', { stream_id: streamId });
}

export async function researchListItems(filters: ListResearchItemsInput = {}): Promise<ResearchItem[]> {
  const raw = await invoke<any[]>('research_list_items', { query: filters });
  return (raw || []).map(mapItem);
}

export async function researchSetItemStatus(itemId: number, status: string): Promise<void> {
  await invoke('research_set_item_status', { item_id: itemId, status });
}

// News sources for NewsData.io domain selection
export async function researchListNewsSources(params: {
  country?: string;
  language?: string;
  search?: string;
}): Promise<import('@/shared/types').NewsSource[]> {
  const { country, language, search } = params;
  const raw = await invoke<any[]>('list_news_sources', {
    country: country || undefined,
    language: language || undefined,
    search: search || undefined,
  });
  return (raw || []).map((s: any) => ({
    id: Number(s.id),
    sourceId: String(s.sourceId ?? s.source_id),
    name: s.name ?? 'Unknown source',
    url: s.url ?? null,
    category: (s.category ?? []) as string[],
    language: s.language ?? null,
    country: s.country ?? null,
  }));
}
