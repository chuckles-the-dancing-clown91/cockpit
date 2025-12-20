import { useMemo, useState } from 'react';
import { Badge, Button, Dialog, Flex, Select, Switch, Text, TextArea, TextField } from '@radix-ui/themes';
import type { CreateResearchAccountInput, NewsSource, ResearchAccount, ResearchStream, UpsertResearchStreamInput } from '../types';
import { researchListNewsSources } from '../api/research';
import { useEffect } from 'react';

type ProviderOption = {
  value: string;
  label: string;
};

const providers: ProviderOption[] = [{ value: 'newsdata', label: 'NewsData.io' }];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ResearchAccount[];
  activeAccount?: ResearchAccount | null;
  stream?: ResearchStream | null;
  onCreateAccount: (input: CreateResearchAccountInput) => Promise<ResearchAccount>;
  onCreateStream: (input: UpsertResearchStreamInput) => Promise<void>;
};

export function StreamDialog({
  open,
  onOpenChange,
  accounts,
  activeAccount,
  stream,
  onCreateAccount,
  onCreateStream,
}: Props) {
  const [provider, setProvider] = useState(activeAccount?.provider || 'newsdata');
  const [name, setName] = useState('US Headlines');
  const [query, setQuery] = useState('');
  const [titleContains, setTitleContains] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [countries, setCountries] = useState<string[]>(['us']);
  const [domainInput, setDomainInput] = useState('');
  // NewsData "domain" filter values (source IDs from /sources)
  const [domains, setDomains] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<NewsSource[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [excludeCountryInput, setExcludeCountryInput] = useState('');
  const [excludeCountries, setExcludeCountries] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [excludeCategoryInput, setExcludeCategoryInput] = useState('');
  const [excludeCategories, setExcludeCategories] = useState<string[]>([]);
  const [excludeLanguageInput, setExcludeLanguageInput] = useState('');
  const [excludeLanguages, setExcludeLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState('relevancy');
  const [size, setSize] = useState('10');
  const [fullContent, setFullContent] = useState(false);
  const [removeDuplicate, setRemoveDuplicate] = useState(true);
  const [language, setLanguage] = useState('en');
  const [apiKey, setApiKey] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [timeframe, setTimeframe] = useState<string | undefined>(undefined);
  const [interval, setInterval] = useState('15m');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSources, setIsFetchingSources] = useState(false);

  const existingAccount = useMemo(() => {
    if (activeAccount && activeAccount.provider === provider) return activeAccount;
    return accounts.find((a) => a.provider === provider);
  }, [accounts, provider, activeAccount]);

  const requiresApiKey = !existingAccount;

  const addKeyword = () => {
    const val = keywordInput.trim();
    if (!val) return;
    setKeywords((prev) => Array.from(new Set([...prev, val])).slice(0, 10));
    setKeywordInput('');
  };

  const addCountry = () => {
    const val = countryInput.trim();
    if (!val) return;
    setCountries((prev) => Array.from(new Set([...prev, val.toLowerCase()])).slice(0, 5));
    setCountryInput('');
  };

  const addDomain = () => {
    const val = domainInput.trim();
    if (!val) return;
    setDomains((prev) => Array.from(new Set([...prev, val])).slice(0, 5));
    setDomainInput('');
  };

  const addExcludeCountry = () => {
    const val = excludeCountryInput.trim();
    if (!val) return;
    setExcludeCountries((prev) => Array.from(new Set([...prev, val.toLowerCase()])).slice(0, 5));
    setExcludeCountryInput('');
  };

  const addCategory = () => {
    const val = categoryInput.trim();
    if (!val) return;
    setCategories((prev) => Array.from(new Set([...prev, val.toLowerCase()])).slice(0, 5));
    setCategoryInput('');
  };

  const addExcludeCategory = () => {
    const val = excludeCategoryInput.trim();
    if (!val) return;
    setExcludeCategories((prev) => Array.from(new Set([...prev, val.toLowerCase()])).slice(0, 5));
    setExcludeCategoryInput('');
  };

  const addExcludeLanguage = () => {
    const val = excludeLanguageInput.trim();
    if (!val) return;
    setExcludeLanguages((prev) => Array.from(new Set([...prev, val.toLowerCase()])).slice(0, 5));
    setExcludeLanguageInput('');
  };

  const fetchSources = async () => {
    if (!existingAccount || provider !== 'newsdata') return;
    setIsFetchingSources(true);
    try {
      const country = countries.length ? countries[0] : undefined;
      const languageParam = language || undefined;
      const list = await researchListNewsSources({
        country,
        language: languageParam,
        search: sourceSearch || undefined,
      });
      setSourceOptions(list);
    } catch (e) {
      // ignore for now; backend will log
    } finally {
      setIsFetchingSources(false);
    }
  };

  // Auto-fetch sources when dialog opens and account is ready
  useEffect(() => {
    if (open && existingAccount && provider === 'newsdata' && sourceOptions.length === 0) {
      fetchSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingAccount?.id, provider]);

  // Prefill from existing stream when editing; reset when creating.
  useEffect(() => {
    if (!open) return;
    if (stream) {
      setProvider(stream.provider || activeAccount?.provider || 'newsdata');
      setName(stream.name || '');
      const cfg: any = stream.config || {};
      setQuery(cfg.query ?? '');
      setTitleContains(cfg.qInTitle ?? '');
      setKeywords(Array.isArray(cfg.keywords) ? cfg.keywords : []);
      setCountries(Array.isArray(cfg.countries) && cfg.countries.length ? cfg.countries : ['us']);
      setExcludeCountries(Array.isArray(cfg.excludeCountries) ? cfg.excludeCountries : []);
      setCategories(Array.isArray(cfg.categories) ? cfg.categories : []);
      setExcludeCategories(Array.isArray(cfg.excludeCategories) ? cfg.excludeCategories : []);
      setLanguage(cfg.language ?? 'en');
      setExcludeLanguages(Array.isArray(cfg.excludeLanguages) ? cfg.excludeLanguages : []);
      setTimeframe(cfg.timeframe ?? undefined);
      setDomains(Array.isArray(cfg.domains) ? cfg.domains : []);
      setSort(cfg.sort ?? 'relevancy');
      setSize(cfg.size ? String(cfg.size) : '10');
      setFullContent(Boolean(cfg.full_content));
      setRemoveDuplicate(cfg.removeduplicate !== 0);
      const sched: any = stream.schedule || {};
      setInterval(sched.interval ?? '15m');
      setSourceOptions([]);
      return;
    }
    setProvider(activeAccount?.provider || 'newsdata');
    setName('US Headlines');
    setQuery('');
    setTitleContains('');
    setKeywords([]);
    setCountries(['us']);
    setExcludeCountries([]);
    setCategories([]);
    setExcludeCategories([]);
    setLanguage('en');
    setExcludeLanguages([]);
    setTimeframe(undefined);
    setDomains([]);
    setSort('relevancy');
    setSize('10');
    setFullContent(false);
    setRemoveDuplicate(true);
    setInterval('15m');
    setSourceOptions([]);
  }, [open, stream?.id, activeAccount?.id]);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const account =
        existingAccount ??
        (await onCreateAccount({
          provider,
          displayName: provider,
          allowedCaps: ['readStream', 'search'],
          auth: { apiKey },
        }));

      await onCreateStream({
        id: stream?.id,
        accountId: account.id,
        name,
        provider,
        enabled: true,
        config: {
          query: query || undefined,
          qInTitle: titleContains || undefined,
          keywords,
          countries,
          excludeCountries,
          categories,
          excludeCategories,
          language: language || undefined,
          excludeLanguages,
          image: includeImages ? 1 : 0,
          timeframe: timeframe || undefined,
          domains,
          sort,
          size: Number(size),
          full_content: fullContent ? 1 : 0,
          removeduplicate: removeDuplicate ? 1 : 0,
          max_pages: 3,
        },
        schedule: { interval },
      });
      onOpenChange(false);
      setApiKey('');
      setQuery('');
      setTitleContains('');
      setKeywords([]);
      setCountries(['us']);
      setExcludeCountries([]);
      setCategories([]);
      setExcludeCategories([]);
      setExcludeLanguages([]);
      setDomains([]);
      setTimeframe(undefined);
      setSourceOptions([]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="500px">
        <Dialog.Title>Create Stream</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Choose a provider, set filters, and we’ll sync on the selected interval (default country US).
        </Dialog.Description>
        <Flex direction="column" gap="3">
          {existingAccount && provider === 'newsdata' && (
            <Button size="1" variant="soft" onClick={fetchSources}>
              {isFetchingSources ? 'Fetching sources…' : 'Refresh sources (domains)'}
            </Button>
          )}
          <label>
            <Text size="2">Provider</Text>
            <Select.Root value={provider} onValueChange={setProvider}>
              <Select.Trigger />
              <Select.Content>
                {providers.map((p) => (
                  <Select.Item key={p.value} value={p.value}>
                    {p.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          <TextField.Root
            label="Stream Name"
            placeholder="Finance daily"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField.Root
            placeholder="Keyword query (q)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <TextField.Root
            placeholder="Title contains (qInTitle)"
            value={titleContains}
            onChange={(e) => setTitleContains(e.target.value)}
          />

          <Flex direction="column" gap="1">
            <Text size="2">Keywords (max 10)</Text>
            <Flex gap="2">
              <TextField.Root
                placeholder="Add keyword and press enter"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
              />
              <Button size="1" onClick={addKeyword}>
                Add
              </Button>
            </Flex>
            <Flex gap="1" wrap="wrap">
              {keywords.map((k) => (
                <Badge key={k} variant="soft" color="gray" onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))}>
                  {k} ✕
                </Badge>
              ))}
            </Flex>
          </Flex>

          <Flex gap="2">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Countries (max 5)</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="us"
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCountry();
                    }
                  }}
                />
                <Button size="1" onClick={addCountry}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {countries.map((c) => (
                  <Badge key={c} variant="soft" color="gray" onClick={() => setCountries((prev) => prev.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Domains (max 5)</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="Add domain id (e.g. nytimes)"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                />
                <Button size="1" onClick={addDomain}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {domains.map((d) => (
                  <Badge key={d} variant="soft" color="gray" onClick={() => setDomains((prev) => prev.filter((x) => x !== d))}>
                    {d} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
          </Flex>

          {provider === 'newsdata' && existingAccount && (
            <Flex direction="column" gap="1">
              <Text size="2">Domains (from synced sources)</Text>
              <Flex gap="2" align="center">
                <TextField.Root
                  placeholder="Filter sources"
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                />
                <Button size="1" variant="ghost" onClick={fetchSources}>
                  Filter
                </Button>
              </Flex>
              {sourceOptions.length === 0 ? (
                <Text size="2" color="gray">
                  No sources loaded yet. Click “Refresh sources (domains)” above (or save API key again).
                </Text>
              ) : (
                <Flex direction="column" gap="1" style={{ maxHeight: 160, overflow: 'auto' }}>
                  {sourceOptions.map((s) => {
                    const isSelected = domains.includes(s.sourceId);
                    return (
                      <Flex
                        key={s.sourceId}
                        align="center"
                        gap="2"
                        style={{
                          padding: '6px',
                          border: '1px solid var(--gray-5)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-3)' : undefined,
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setDomains((prev) => prev.filter((d) => d !== s.sourceId));
                          } else if (domains.length < 5 && s.sourceId) {
                            setDomains((prev) => [...prev, s.sourceId]);
                          }
                        }}
                      >
                        <Text size="2" weight="bold">
                          {s.name}
                        </Text>
                        <Text size="1" color="gray">
                          {s.sourceId}
                        </Text>
                        {s.category?.[0] && (
                          <Badge variant="soft" color="gray">
                            {s.category[0]}
                          </Badge>
                        )}
                        {s.country && (
                          <Badge variant="soft" color="gray">
                            {s.country}
                          </Badge>
                        )}
                      </Flex>
                    );
                  })}
                </Flex>
              )}
            </Flex>
          )}

          <TextField.Root
            placeholder="Language (default en)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />

          <Flex gap="2">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Exclude countries</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="exclude (au)"
                  value={excludeCountryInput}
                  onChange={(e) => setExcludeCountryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExcludeCountry();
                    }
                  }}
                />
                <Button size="1" onClick={addExcludeCountry}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {excludeCountries.map((c) => (
                  <Badge key={c} variant="soft" color="gray" onClick={() => setExcludeCountries((prev) => prev.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Exclude languages</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="exclude language"
                  value={excludeLanguageInput}
                  onChange={(e) => setExcludeLanguageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExcludeLanguage();
                    }
                  }}
                />
                <Button size="1" onClick={addExcludeLanguage}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {excludeLanguages.map((l) => (
                  <Badge key={l} variant="soft" color="gray" onClick={() => setExcludeLanguages((prev) => prev.filter((x) => x !== l))}>
                    {l} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
          </Flex>

          <Flex gap="2">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Categories</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="top, sports..."
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button size="1" onClick={addCategory}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {categories.map((c) => (
                  <Badge key={c} variant="soft" color="gray" onClick={() => setCategories((prev) => prev.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2">Exclude categories</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="exclude category"
                  value={excludeCategoryInput}
                  onChange={(e) => setExcludeCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExcludeCategory();
                    }
                  }}
                />
                <Button size="1" onClick={addExcludeCategory}>
                  Add
                </Button>
              </Flex>
              <Flex gap="1" wrap="wrap">
                {excludeCategories.map((c) => (
                  <Badge key={c} variant="soft" color="gray" onClick={() => setExcludeCategories((prev) => prev.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </Flex>
            </Flex>
          </Flex>

          <TextField.Root
            placeholder="Timeframe (e.g. 6 or 15m)"
            value={timeframe ?? ''}
            onChange={(e) => setTimeframe(e.target.value || undefined)}
          />

          <label>
            <Text size="2">Sync interval</Text>
            <Select.Root value={interval} onValueChange={setInterval}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="5m">Every 5 minutes</Select.Item>
                <Select.Item value="10m">Every 10 minutes</Select.Item>
                <Select.Item value="15m">Every 15 minutes</Select.Item>
                <Select.Item value="30m">Every 30 minutes</Select.Item>
                <Select.Item value="45m">Every 45 minutes</Select.Item>
                <Select.Item value="1h">Every hour</Select.Item>
                <Select.Item value="5h">Every 5 hours</Select.Item>
                <Select.Item value="12h">Every 12 hours</Select.Item>
                <Select.Item value="24h">Once a day</Select.Item>
              </Select.Content>
            </Select.Root>
          </label>

          <Flex align="center" gap="2">
            <Switch checked={includeImages} onCheckedChange={(v) => setIncludeImages(Boolean(v))} />
            <Text size="2">Only articles with images</Text>
          </Flex>

          {requiresApiKey && (
            <TextField.Root
              placeholder="API key (required first time for this provider)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          )}

          <TextArea
            readOnly
            value="Saving the provider will trigger source sync; domains can be selected once fetched. Scheduling uses the interval above."
          />

          <Flex gap="2" justify="end">
            <Dialog.Close asChild>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleCreate} disabled={isSaving || (requiresApiKey && !apiKey.trim())}>
              {requiresApiKey ? 'Save key & create stream' : 'Create stream'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );

}
