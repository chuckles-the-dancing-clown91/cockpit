import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Select, TextField, Text } from '@radix-ui/themes';
import type { CreateResearchAccountInput, ResearchAccount } from '../types';
import { invoke } from '@tauri-apps/api/core';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ResearchAccount | null;
  onSave: (input: CreateResearchAccountInput & { id?: number }) => Promise<ResearchAccount>;
  onAfterSave?: (account: ResearchAccount, isNew: boolean) => void;
};

const providers = [
  { value: 'newsdata', label: 'NewsData.io' },
  { value: 'reddit', label: 'Reddit' },
];

export function ProviderDialog({ open, onOpenChange, account, onSave, onAfterSave }: Props) {
  const [provider, setProvider] = useState('newsdata');
  const [displayName, setDisplayName] = useState('NewsData');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setProvider(account.provider);
      setDisplayName(account.displayName);
      setApiKey('');
    } else {
      setProvider('newsdata');
      setDisplayName('NewsData');
      setApiKey('');
    }
  }, [account, open]);

  const requiresApiKey = !account;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isNew = !account?.id;
      const saved = await onSave({
        id: account?.id,
        provider,
        displayName,
        allowedCaps: account?.allowedCaps ?? ['readStream', 'search'],
        auth: apiKey ? { apiKey } : undefined,
      });

      // NewsData: persist API key to news settings and trigger sources sync
      if (provider === 'newsdata' && apiKey.trim()) {
        try {
          await invoke('save_news_settings', { input: { apiKey: apiKey.trim() } });
          await invoke('sync_news_sources_now');
        } catch {
          // keep UX unblocked; sources can be refreshed manually
        }
      }

      onOpenChange(false);
      onAfterSave?.(saved, isNew);
      return saved;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>{account ? 'Edit Provider' : 'Add Provider'}</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Configure a sync provider. First-time setup needs an API key.
        </Dialog.Description>
        <Flex direction="column" gap="3">
          <label>
            <Text size="2">Provider</Text>
            <Select.Root
              value={provider}
              onValueChange={setProvider}
              disabled={Boolean(account)}
            >
              <Select.Trigger placeholder="Provider" />
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
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <TextField.Root
            placeholder={requiresApiKey ? 'API key (required on first setup)' : 'API key (optional to rotate)'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />

          <Flex gap="2" justify="end">
            <Dialog.Close asChild>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSave}
              disabled={isSaving || (requiresApiKey && !apiKey.trim())}
            >
              {account ? 'Save' : 'Save & Continue'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
