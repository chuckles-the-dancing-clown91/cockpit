import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Select,
  Spinner,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ExternalLink, Plus, RotateCw, Settings2, Trash2 } from 'lucide-react';

import { TagsInput } from '@/core/components/TagsInput';
import { toast } from '@/core/lib/toast';
import { useFeedSources } from '@/features/research/hooks/useFeedSources';
import { useNewsSettings } from '@/features/research/hooks/useNewsSettings';
import { useNewsSources } from '@/features/research/hooks/useNewsSources';
import type { FeedSource, FeedSourceConfig, NewsSourceDto } from '@/shared/types';

type SourceTypeOption = {
  key: string;
  label: string;
  requiresApiKey?: boolean;
};

const SOURCE_TYPES: SourceTypeOption[] = [
  { key: 'newsdata', label: 'NewsData.io', requiresApiKey: true },
  { key: 'reddit', label: 'Reddit (coming soon)' },
  { key: 'rss', label: 'RSS (coming soon)' },
];

const SCHEDULE_PRESETS: Array<{ label: string; cron: string }> = [
  { label: 'Every 5 min', cron: '0 0/5 * * * * *' },
  { label: 'Every 10 min', cron: '0 0/10 * * * * *' },
  { label: 'Every 15 min', cron: '0 0/15 * * * * *' },
  { label: 'Every 30 min', cron: '0 0/30 * * * * *' },
  { label: 'Every 45 min', cron: '0 0/45 * * * * *' },
  { label: 'Every hour', cron: '0 0 * * * * *' },
  { label: 'Every 5 hours', cron: '0 0 */5 * * * *' },
  { label: 'Every 12 hours', cron: '0 0 */12 * * * *' },
  { label: 'Once a day', cron: '0 0 0 * * * *' },
];

function scheduleLabel(cron: string | null | undefined): string {
  if (!cron) return 'Manual';
  const preset = SCHEDULE_PRESETS.find((p) => p.cron === cron);
  return preset?.label ?? cron;
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string') as string[];
}

type NewsDataFormState = {
  language: string;
  query: string;
  countries: string[];
  categories: string[];
  domains: string[];
  excludeDomains: string[];
};

function normalizeLower(raw: string) {
  return raw.trim().toLowerCase();
}

function seedNewsDataStateFromConfig(config: FeedSourceConfig | null | undefined): NewsDataFormState {
  const cfg = config?.newsdata ?? undefined;
  return {
    language: typeof cfg?.language === 'string' ? cfg.language : 'en',
    query: typeof cfg?.query === 'string' ? cfg.query : '',
    countries: safeStringArray(cfg?.countries).map(normalizeLower),
    categories: safeStringArray(cfg?.categories).map(normalizeLower),
    domains: safeStringArray(cfg?.domains).map(normalizeLower),
    excludeDomains: safeStringArray(cfg?.exclude_domains).map(normalizeLower),
  };
}

function buildNewsDataConfig(state: NewsDataFormState): FeedSourceConfig {
  return {
    newsdata: {
      language: state.language.trim() || null,
      query: state.query.trim() || null,
      countries: state.countries.map(normalizeLower),
      categories: state.categories.map(normalizeLower),
      domains: state.domains.map(normalizeLower),
      exclude_domains: state.excludeDomains.map(normalizeLower),
    },
  };
}

export function ResearchSourcesView() {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<FeedSource | null>(null);

  const feedSources = useFeedSources();

  return (
    <Box style={{ height: '100%', overflow: 'auto' }}>
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between">
          <div>
            <Heading size="5">Feed Sources</Heading>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              Configure ingestion providers (NewsData, Reddit, RSS, etc.).
            </Text>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Add source
          </Button>
        </Flex>

        <Card>
          <Flex direction="column" gap="3">
            {feedSources.query.isLoading ? (
              <Flex align="center" gap="2" style={{ padding: 'var(--space-4)' }}>
                <Spinner />
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                  Loading sources...
                </Text>
              </Flex>
            ) : feedSources.query.data?.length ? (
              <Flex direction="column" gap="2">
                {feedSources.query.data.map((s) => (
                  <Card key={s.id} variant="surface" style={{ cursor: 'pointer' }}>
                    <Flex align="center" justify="between" gap="3">
                      <Flex
                        direction="column"
                        gap="1"
                        style={{ minWidth: 0 }}
                        onClick={() => setEditingSource(s)}
                      >
                        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                          <Text
                            weight="medium"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {s.name}
                          </Text>
                          <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
                            {SOURCE_TYPES.find((t) => t.key === s.sourceType)?.label ?? s.sourceType}
                          </Text>
                        </Flex>
                        <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                          {s.enabled ? scheduleLabel(s.schedule) : 'Disabled'}
                          {s.lastSyncAt ? ` • Last sync ${new Date(s.lastSyncAt).toLocaleString()}` : ''}
                          {s.lastError ? ` • Last error: ${s.lastError}` : ''}
                        </Text>
                      </Flex>

                      <Flex align="center" gap="3">
                        <Flex align="center" gap="2">
                          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                            Enabled
                          </Text>
                          <Switch
                            checked={s.enabled}
                            onCheckedChange={(checked) =>
                              feedSources.toggleEnabledMutation.mutate({ id: s.id, enabled: checked })
                            }
                          />
                        </Flex>

                        <IconButton
                          variant="soft"
                          title="Sync now"
                          onClick={() => feedSources.syncNowMutation.mutate({ id: s.id })}
                        >
                          <RotateCw size={16} />
                        </IconButton>

                        <IconButton variant="soft" title="Edit" onClick={() => setEditingSource(s)}>
                          <Settings2 size={16} />
                        </IconButton>
                        <IconButton
                          variant="soft"
                          color="red"
                          title="Remove"
                          onClick={() => feedSources.deleteMutation.mutate(s.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Flex direction="column" align="center" gap="3" style={{ padding: 'var(--space-6)' }}>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                  No feed sources
                </Text>
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus size={16} /> Add source
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>

      <AddSourceDialog open={isAddOpen} onOpenChange={setIsAddOpen} onCreated={(s) => setEditingSource(s)} />
      <EditSourceDialog
        open={Boolean(editingSource)}
        onOpenChange={(open) => {
          if (!open) setEditingSource(null);
        }}
        source={editingSource}
      />
    </Box>
  );
}

function AddSourceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (source: FeedSource) => void;
}) {
  const feedSources = useFeedSources();
  const newsSettings = useNewsSettings();
  const newsSources = useNewsSources();

  const [name, setName] = React.useState('');
  const [sourceType, setSourceType] = React.useState<string>('newsdata');
  const [apiKey, setApiKey] = React.useState('');

  const [scheduleCron, setScheduleCron] = React.useState<string>(SCHEDULE_PRESETS[0].cron);
  const [newsData, setNewsData] = React.useState<NewsDataFormState>(() => seedNewsDataStateFromConfig(undefined));

  const [setupCatalogOpen, setSetupCatalogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName('');
      setSourceType('newsdata');
      setApiKey('');
      setScheduleCron(SCHEDULE_PRESETS[0].cron);
      setNewsData(seedNewsDataStateFromConfig(undefined));
      setSetupCatalogOpen(false);
    }
  }, [open]);

  const selectedSourceType = SOURCE_TYPES.find((t) => t.key === sourceType) ?? SOURCE_TYPES[0];
  const needsApiKey = Boolean(selectedSourceType.requiresApiKey);

  const canSave = name.trim().length > 0 && (!needsApiKey || apiKey.trim().length > 0);

  async function handleSave() {
    if (sourceType !== 'newsdata') {
      toast.info('Not implemented', 'Only NewsData sources are implemented end-to-end right now.');
      return;
    }

    const config = buildNewsDataConfig(newsData);
    feedSources.createMutation.mutate(
      {
        name: name.trim(),
        sourceType,
        apiKey: apiKey.trim(),
        schedule: scheduleCron,
        config,
      },
      {
        onSuccess: (created) => {
          onOpenChange(false);
          onCreated?.(created);
        },
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900 }}>
        <Dialog.Title>Add feed source</Dialog.Title>
        <Dialog.Description>Configure an ingestion source and its sync schedule.</Dialog.Description>

        <Flex direction="column" gap="4" style={{ marginTop: 'var(--space-4)' }}>
          <Flex direction="column" gap="2">
            <Text weight="medium">Name</Text>
            <TextField.Root
              placeholder="e.g., NewsData — Tech + Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Flex>

          <Flex direction="column" gap="2">
            <Text weight="medium">Type</Text>
            <Select.Root value={sourceType} onValueChange={setSourceType}>
              <Select.Trigger />
              <Select.Content>
                {SOURCE_TYPES.map((t) => (
                  <Select.Item key={t.key} value={t.key}>
                    {t.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {needsApiKey ? (
            <Card variant="surface">
              <Flex direction="column" gap="3">
                <Flex direction="column" gap="2">
                  <Text weight="medium">API key</Text>
                  <TextField.Root
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your API key"
                  />
                </Flex>

                {!newsSettings.query.data?.hasApiKey ? (
                  <Flex align="center" justify="between" gap="3">
                    <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                      Optional: save this key for syncing the NewsData source catalog (domain dropdown).
                    </Text>
                    <Button variant="soft" onClick={() => setSetupCatalogOpen(true)} disabled={!apiKey.trim()}>
                      Setup catalog
                    </Button>
                  </Flex>
                ) : null}
              </Flex>
            </Card>
          ) : (
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              This source type is stubbed in the UI but not implemented end-to-end yet.
            </Text>
          )}

          {sourceType === 'newsdata' ? (
            <NewsDataSourceForm
              state={newsData}
              onChange={setNewsData}
              newsSources={newsSources.query.data ?? []}
              onSyncCatalog={() => newsSources.syncMutation.mutate()}
              catalogSyncDisabled={!newsSettings.query.data?.hasApiKey}
              catalogSyncLoading={newsSources.syncMutation.isPending}
            />
          ) : null}

          <Card>
            <Flex direction="column" gap="2">
              <Text weight="medium">Schedule</Text>
              <Select.Root value={scheduleCron} onValueChange={setScheduleCron}>
                <Select.Trigger />
                <Select.Content>
                  {SCHEDULE_PRESETS.map((p) => (
                    <Select.Item key={p.cron} value={p.cron}>
                      {p.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          </Card>
        </Flex>

        <Flex gap="3" justify="end" style={{ marginTop: 'var(--space-5)' }}>
          <Button variant="soft" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save source
          </Button>
        </Flex>

        <Dialog.Root open={setupCatalogOpen} onOpenChange={setSetupCatalogOpen}>
          <Dialog.Content style={{ maxWidth: 520 }}>
            <Dialog.Title>Setup source catalog</Dialog.Title>
            <Dialog.Description>Save a NewsData.io API key to sync available sources for the dropdown.</Dialog.Description>

            <Flex direction="column" gap="3" style={{ marginTop: 'var(--space-4)' }}>
              <Flex direction="column" gap="2">
                <Text weight="medium">API key</Text>
                <TextField.Root value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </Flex>

              <Flex gap="3" justify="end">
                <Button variant="soft" onClick={() => setSetupCatalogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await newsSettings.saveMutation.mutateAsync({ apiKey: apiKey.trim() });
                    await newsSources.syncMutation.mutateAsync();
                    setSetupCatalogOpen(false);
                  }}
                  disabled={!apiKey.trim()}
                >
                  Save & sync
                </Button>
              </Flex>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function EditSourceDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FeedSource | null;
}) {
  const feedSources = useFeedSources();
  const newsSources = useNewsSources();

  const [name, setName] = React.useState('');
  const [enabled, setEnabled] = React.useState(true);
  const [scheduleCron, setScheduleCron] = React.useState<string>(SCHEDULE_PRESETS[0].cron);
  const [apiKey, setApiKey] = React.useState('');
  const [newsData, setNewsData] = React.useState<NewsDataFormState>(() => seedNewsDataStateFromConfig(undefined));

  React.useEffect(() => {
    if (source) {
      setName(source.name);
      setEnabled(source.enabled);
      setScheduleCron(source.schedule ?? SCHEDULE_PRESETS[0].cron);
      setApiKey('');
      setNewsData(seedNewsDataStateFromConfig(source.config));
    }
  }, [source]);

  if (!source) return null;

  const canSave = name.trim().length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900 }}>
        <Dialog.Title>Edit feed source</Dialog.Title>
        <Dialog.Description>
          {SOURCE_TYPES.find((t) => t.key === source.sourceType)?.label ?? source.sourceType}
        </Dialog.Description>

        <Flex direction="column" gap="4" style={{ marginTop: 'var(--space-4)' }}>
          <Flex direction="column" gap="2">
            <Text weight="medium">Name</Text>
            <TextField.Root value={name} onChange={(e) => setName(e.target.value)} />
          </Flex>

          <Flex direction="column" gap="2">
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              API key (leave blank to keep existing)
            </Text>
            <TextField.Root
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••"
            />
          </Flex>

          {source.sourceType === 'newsdata' ? (
            <NewsDataSourceForm
              state={newsData}
              onChange={setNewsData}
              newsSources={newsSources.query.data ?? []}
              onSyncCatalog={() => newsSources.syncMutation.mutate()}
              catalogSyncDisabled={false}
              catalogSyncLoading={newsSources.syncMutation.isPending}
            />
          ) : (
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              Provider type not implemented.
            </Text>
          )}

          <Card>
            <Flex direction="column" gap="3">
              <Text weight="medium">Sync</Text>
              <Flex align="center" justify="between">
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                  Enabled
                </Text>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                  Interval
                </Text>
                <Select.Root value={scheduleCron} onValueChange={setScheduleCron} disabled={!enabled}>
                  <Select.Trigger />
                  <Select.Content>
                    {SCHEDULE_PRESETS.map((p) => (
                      <Select.Item key={p.cron} value={p.cron}>
                        {p.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
          </Card>
        </Flex>

        <Flex gap="3" justify="between" style={{ marginTop: 'var(--space-5)' }}>
          <Button variant="soft" color="red" onClick={() => feedSources.deleteMutation.mutate(source.id)}>
            <Trash2 size={16} /> Remove source
          </Button>
          <Flex gap="3">
            <Button variant="soft" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!canSave) return;
                const config = source.sourceType === 'newsdata' ? buildNewsDataConfig(newsData) : source.config;
                feedSources.updateMutation.mutate(
                  {
                    id: source.id,
                    patch: {
                      name: name.trim(),
                      enabled,
                      schedule: scheduleCron,
                      config,
                      apiKey: apiKey.trim() || undefined,
                    },
                  },
                  {
                    onSuccess: () => onOpenChange(false),
                  },
                );
              }}
              disabled={!canSave}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function NewsDataSourceForm({
  state,
  onChange,
  newsSources,
  onSyncCatalog,
  catalogSyncDisabled,
  catalogSyncLoading,
}: {
  state: NewsDataFormState;
  onChange: (next: NewsDataFormState) => void;
  newsSources: NewsSourceDto[];
  onSyncCatalog: () => void;
  catalogSyncDisabled: boolean;
  catalogSyncLoading: boolean;
}) {
  const [domainToAdd, setDomainToAdd] = React.useState<string>('');

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between">
          <Text weight="medium">NewsData.io</Text>
          <Flex gap="2">
            <Button variant="soft" onClick={onSyncCatalog} disabled={catalogSyncDisabled || catalogSyncLoading}>
              <RotateCw size={16} /> Sync catalog
            </Button>
            <Button variant="soft" onClick={() => window.open('https://newsdata.io', '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={16} /> Docs
            </Button>
          </Flex>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Query
          </Text>
          <TextField.Root
            value={state.query}
            onChange={(e) => onChange({ ...state, query: e.target.value })}
            placeholder="Optional"
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Language
          </Text>
          <TextField.Root
            value={state.language}
            onChange={(e) => onChange({ ...state, language: e.target.value })}
            placeholder="e.g. en"
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Countries
          </Text>
          <TagsInput
            value={state.countries}
            onChange={(countries) => onChange({ ...state, countries })}
            placeholder="us, ca, gb..."
            normalize={normalizeLower}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Categories
          </Text>
          <TagsInput
            value={state.categories}
            onChange={(categories) => onChange({ ...state, categories })}
            placeholder="technology, business..."
            normalize={normalizeLower}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Source domains (up to 5)
          </Text>
          <Flex gap="2" align="center">
            <Select.Root value={domainToAdd} onValueChange={setDomainToAdd} disabled={!newsSources.length}>
              <Select.Trigger placeholder={newsSources.length ? 'Select a source' : 'Sync catalog to populate'} />
              <Select.Content>
                <ScrollArea style={{ height: 280 }}>
                  {newsSources.map((s) => (
                    <Select.Item key={s.sourceId} value={s.sourceId}>
                      {s.name}
                    </Select.Item>
                  ))}
                </ScrollArea>
              </Select.Content>
            </Select.Root>
            <Button
              variant="soft"
              onClick={() => {
                const next = domainToAdd.trim();
                if (!next) return;
                if (state.domains.includes(next)) return;
                if (state.domains.length >= 5) return;
                onChange({ ...state, domains: [...state.domains, next] });
                setDomainToAdd('');
              }}
              disabled={!domainToAdd || state.domains.length >= 5}
            >
              <Plus size={16} /> Add
            </Button>
          </Flex>
          <TagsInput
            value={state.domains}
            onChange={(domains) => onChange({ ...state, domains })}
            placeholder="source_id codes"
            maxTags={5}
            normalize={normalizeLower}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Exclude domains
          </Text>
          <TagsInput
            value={state.excludeDomains}
            onChange={(excludeDomains) => onChange({ ...state, excludeDomains })}
            placeholder="example.com"
            normalize={normalizeLower}
          />
        </Flex>
      </Flex>
    </Card>
  );
}
