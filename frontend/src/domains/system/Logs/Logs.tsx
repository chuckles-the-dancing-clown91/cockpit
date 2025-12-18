import { useState } from 'react';
import { Flex, Card, Heading, Select, Button, TextField, Text } from '@radix-ui/themes';
import { useLogs } from './useLogs';
import { Download, Trash2, RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState } from '@/core/components/ui';
import { useDialog } from '@/core/providers/DialogProvider';

export function Logs() {
  const dialog = useDialog();
  const [level, setLevel] = useState<string>('all');
  const [component, setComponent] = useState<string>('all');
  const [search, setSearch] = useState('');
  const { logs, isLoading, logsError, stats, statsError, exportLogs, clearLogs, refetch } = useLogs(level);

  if (isLoading) {
    return <LoadingState />;
  }

  // Extract unique components from logs
  const uniqueComponents = logs ? Array.from(new Set(logs.map(log => log.target))).sort() : [];

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = !search || 
      log.message.toLowerCase().includes(search.toLowerCase()) || 
      log.target.toLowerCase().includes(search.toLowerCase());
    const matchesComponent = component === 'all' || log.target === component;
    return matchesSearch && matchesComponent;
  });

  const getLevelColor = (logLevel: string) => {
    switch (logLevel.toUpperCase()) {
      case 'ERROR':
        return 'var(--red-9)';
      case 'WARN':
        return 'var(--orange-9)';
      case 'INFO':
        return 'var(--blue-9)';
      case 'DEBUG':
        return 'var(--gray-9)';
      default:
        return 'var(--gray-11)';
    }
  };

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: '1400px' }}>
      <Flex justify="between" align="center">
        <Heading size="6">Application Logs</Heading>
        <Flex gap="2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportLogs.mutate()} disabled={exportLogs.isPending}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            color="red"
            onClick={async () => {
              const confirmed = await dialog.confirm({
                title: 'Clear All Logs',
                description: 'Are you sure you want to clear all logs? This cannot be undone.',
              });
              if (confirmed) {
                clearLogs.mutate();
              }
            }}
            disabled={clearLogs.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </Flex>
      </Flex>

      {/* Stats */}
      {statsError ? (
        <ErrorState message={statsError instanceof Error ? statsError.message : 'Failed to load log statistics'} />
      ) : stats && (
        <Card>
          <Flex gap="6">
            <Flex direction="column" gap="1">
              <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Total Logs</Text>
              <Text size="4" weight="bold">{stats.totalCount.toLocaleString()}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" style={{ color: 'var(--red-9)' }}>Errors</Text>
              <Text size="4" weight="bold">{stats.errorCount.toLocaleString()}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" style={{ color: 'var(--orange-9)' }}>Warnings</Text>
              <Text size="4" weight="bold">{stats.warnCount.toLocaleString()}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" style={{ color: 'var(--blue-9)' }}>Info</Text>
              <Text size="4" weight="bold">{stats.infoCount.toLocaleString()}</Text>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <Flex gap="3" align="end">
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Text size="2" weight="medium">Search</Text>
            <TextField.Root
              placeholder="Search messages or targets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Flex>
          <Flex direction="column" gap="2" style={{ width: '200px' }}>
            <Text size="2" weight="medium">Level</Text>
            <Select.Root value={level} onValueChange={setLevel}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="all">All Levels</Select.Item>
                <Select.Item value="error">Error</Select.Item>
                <Select.Item value="warn">Warning</Select.Item>
                <Select.Item value="info">Info</Select.Item>
                <Select.Item value="debug">Debug</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="2" style={{ width: '250px' }}>
            <Text size="2" weight="medium">Component</Text>
            <Select.Root value={component} onValueChange={setComponent}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="all">All Components</Select.Item>
                {uniqueComponents.map((comp) => (
                  <Select.Item key={comp} value={comp}>
                    {comp}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Card>

      {/* Log Entries */}
      <Card>
        <Flex direction="column" gap="2" style={{ maxHeight: '600px', overflow: 'auto' }}>
          {logsError ? (
            <ErrorState message={logsError instanceof Error ? logsError.message : 'Failed to load logs'} />
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <Flex direction="column" gap="0" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            {filteredLogs.map((log, idx) => (
              <Flex
                key={idx}
                gap="3"
                p="2"
                style={{
                  borderBottom: idx < filteredLogs.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                }}
              >
                <Text style={{ color: 'var(--gray-9)', minWidth: '180px' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </Text>
                <Text
                  weight="bold"
                  style={{
                    color: getLevelColor(log.level),
                    minWidth: '70px',
                  }}
                >
                  {log.level.toUpperCase()}
                </Text>
                <Text style={{ color: 'var(--gray-11)', minWidth: '200px', fontSize: '12px' }}>
                  {log.target}
                </Text>
                <Text style={{ flex: 1, wordBreak: 'break-word' }}>{log.message}</Text>
              </Flex>
            ))}
            </Flex>
          ) : (
            <Flex align="center" justify="center" p="8">
              <Text style={{ color: 'var(--color-text-soft)' }}>No logs found</Text>
            </Flex>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
