import { Card, Flex, Text, Button, Badge, Switch } from '@radix-ui/themes';
import type { ResearchAccount } from '../types';

type Props = {
  accounts: ResearchAccount[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddProvider: () => void;
  onToggleEnabled: (account: ResearchAccount, enabled: boolean) => void;
  onRemove: (id: number) => void;
  onEdit: (account: ResearchAccount) => void;
};

export function AccountsList({
  accounts,
  selectedId,
  onSelect,
  onAddProvider,
  onToggleEnabled,
  onRemove,
  onEdit,
}: Props) {
  return (
    <Flex direction="column" gap="3" style={{ height: '100%' }}>
      <Flex justify="between" align="center">
        <Text weight="bold">Sync Providers</Text>
        <Button size="1" onClick={onAddProvider} variant="surface">
          Add Provider
        </Button>
      </Flex>
      <Flex direction="column" gap="2" style={{ overflowY: 'auto', flex: 1 }}>
        {accounts.map((acc) => (
          <Card
            key={acc.id}
            onClick={() => onSelect(acc.id)}
            style={{
              cursor: 'pointer',
              border: acc.id === selectedId ? '1px solid var(--accent-8)' : undefined,
            }}
          >
            <Flex justify="between" align="center" gap="2">
              <Flex direction="column" gap="1">
                <Text weight="bold">{acc.displayName}</Text>
                <Text size="2" color="gray">
                  {acc.provider}
                </Text>
                <Flex gap="1" wrap="wrap">
                  {acc.allowedCaps.map((cap) => (
                    <Badge key={cap} color="gray" variant="soft">
                      {cap}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
              <Switch
                checked={acc.enabled}
                onCheckedChange={(val) => onToggleEnabled(acc, Boolean(val))}
                aria-label="Enable account"
              />
              <Flex gap="1">
                <Button size="1" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(acc); }}>
                  Edit
                </Button>
                <Button size="1" color="red" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemove(acc.id); }}>
                  Remove
                </Button>
              </Flex>
            </Flex>
          </Card>
        ))}
        {accounts.length === 0 && (
          <Card>
            <Flex direction="column" gap="2" align="start">
              <Text size="2" color="gray">
                No providers
              </Text>
              <Button size="1" onClick={onAddProvider}>
                Add Provider
              </Button>
            </Flex>
          </Card>
        )}
      </Flex>
    </Flex>
  );
}
