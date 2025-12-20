import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Grid, Separator, Text } from '@radix-ui/themes';
import { toast } from '@/core/lib/toast';
import {
  useDeleteResearchAccount,
  useResearchAccounts,
  useResearchItems,
  useResearchStreams,
  useSetResearchItemStatus,
  useUpdateResearchAccount,
  useUpsertResearchAccount,
  useUpsertResearchStream,
} from '@/features/research';
import { AccountsList } from '@/features/research/components/AccountsList';
import { ItemDetail } from '@/features/research/components/ItemDetail';
import { ItemsList } from '@/features/research/components/ItemsList';
import { ProviderDialog } from '@/features/research/components/ProviderDialog';
import { StreamDialog } from '@/features/research/components/StreamDialog';
import { StreamsManagerDialog } from '@/features/research/components/StreamsManagerDialog';
import type {
  CreateResearchAccountInput,
  ResearchAccount,
  ResearchItem,
  ResearchStream,
  UpsertResearchStreamInput,
} from '@/features/research';

export function StreamView() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ status?: string; search?: string }>({});

  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [streamsDialogOpen, setStreamsDialogOpen] = useState(false);
  const [streamDialogOpen, setStreamDialogOpen] = useState(false);

  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [editingStreamId, setEditingStreamId] = useState<number | null>(null);

  const { data: accounts = [] } = useResearchAccounts();
  const { mutateAsync: createAccount } = useUpsertResearchAccount();
  const { mutateAsync: updateAccount } = useUpdateResearchAccount();
  const { mutateAsync: deleteAccount } = useDeleteResearchAccount();

  const { data: streams = [] } = useResearchStreams(selectedAccountId ?? undefined);
  const { mutateAsync: upsertStream } = useUpsertResearchStream();

  const { data: items = [] } = useResearchItems({
    accountId: selectedAccountId ?? undefined,
    status: filters.status,
    search: filters.search,
  });
  const { mutateAsync: setStatus } = useSetResearchItemStatus();

  const selectedItem: ResearchItem | null = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const activeAccount: ResearchAccount | null = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const editingProvider: ResearchAccount | null = useMemo(
    () => accounts.find((a) => a.id === editingProviderId) ?? null,
    [accounts, editingProviderId],
  );

  const editingStream: ResearchStream | null = useMemo(
    () => streams.find((s) => s.id === editingStreamId) ?? null,
    [streams, editingStreamId],
  );

  useEffect(() => {
    if (selectedAccountId == null && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleToggleAccount = async (acc: ResearchAccount, enabled: boolean) => {
    try {
      await updateAccount({ id: acc.id, enabled });
      toast.success('Provider updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update provider');
    }
  };

  const handleRemoveAccount = async (id: number) => {
    try {
      await deleteAccount(id);
      toast.success('Provider removed');
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove provider');
    }
  };

  const handleSaveProvider = async (input: CreateResearchAccountInput & { id?: number }) => {
    if (input.id) {
      return await updateAccount(input as any);
    }
    const saved = await createAccount(input);
    setSelectedAccountId(saved.id);
    return saved;
  };

  const handleSaveStream = async (input: UpsertResearchStreamInput) => {
    await upsertStream(input);
    toast.success('Stream saved');
  };

  const handleStatus = async (id: number, status: string) => {
    try {
      await setStatus({ itemId: id, status });
      toast.success('Status updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  return (
    <Box style={{ height: '100%', overflow: 'hidden', padding: 'var(--space-6)' }}>
      <Flex justify="between" align="center" mb="3">
        <Text size="5" weight="bold">
          Research
        </Text>
        <Button
          size="2"
          onClick={() => {
            setEditingStreamId(null);
            setStreamDialogOpen(true);
          }}
        >
          Create Stream
        </Button>
      </Flex>

      <Flex gap="3" style={{ height: 'calc(100% - 40px)' }}>
        <Box style={{ width: '25%', overflow: 'hidden' }}>
          <AccountsList
            accounts={accounts}
            selectedId={selectedAccountId}
            onSelect={(id) => setSelectedAccountId(id)}
            onAddProvider={() => {
              setEditingProviderId(null);
              setProviderDialogOpen(true);
            }}
            onToggleEnabled={handleToggleAccount}
            onRemove={handleRemoveAccount}
            onEdit={(acc) => {
              setSelectedAccountId(acc.id);
              setStreamsDialogOpen(true);
            }}
          />
        </Box>

        <Separator orientation="vertical" style={{ height: '100%' }} />

        <Box style={{ flex: 1, overflow: 'hidden' }}>
          <Grid columns="2" gap="3" style={{ height: '100%' }}>
            <Box style={{ overflow: 'hidden' }}>
              <ItemsList
                items={items}
                selectedId={selectedItemId}
                onSelect={setSelectedItemId}
                onStatus={handleStatus}
                onFilterChange={(f) => setFilters(f)}
              />
            </Box>
            <Box style={{ overflow: 'hidden' }}>
              <ItemDetail item={selectedItem} />
            </Box>
          </Grid>
        </Box>
      </Flex>

      <ProviderDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        account={editingProvider}
        onSave={handleSaveProvider}
        onAfterSave={(acc, isNew) => {
          setSelectedAccountId(acc.id);
          if (isNew) {
            setEditingStreamId(null);
            setStreamDialogOpen(true);
          }
        }}
      />

      <StreamsManagerDialog
        open={streamsDialogOpen}
        onOpenChange={setStreamsDialogOpen}
        streams={streams}
        onCreate={() => {
          setEditingStreamId(null);
          setStreamDialogOpen(true);
          setStreamsDialogOpen(false);
        }}
        onEdit={(s) => {
          setEditingStreamId(s.id);
          setStreamDialogOpen(true);
          setStreamsDialogOpen(false);
        }}
      />

      <StreamDialog
        open={streamDialogOpen}
        onOpenChange={(open) => {
          setStreamDialogOpen(open);
          if (!open) setEditingStreamId(null);
        }}
        accounts={accounts}
        activeAccount={activeAccount}
        stream={editingStream}
        onCreateAccount={handleSaveProvider}
        onCreateStream={handleSaveStream}
      />
    </Box>
  );
}

