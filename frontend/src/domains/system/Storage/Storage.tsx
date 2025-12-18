import { Flex, Card, Heading, Text, Button, Progress, Grid } from '@radix-ui/themes';
import { useStorage } from './useStorage';
import { Database, Archive, FileText, FolderArchive, Download, Upload, Trash2, RotateCcw } from 'lucide-react';
import { LoadingState, LoadingInline, EmptyState, EmptyInline, ErrorState } from '@/core/components/ui';
import { useDialog } from '@/core/providers/DialogProvider';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function Storage() {
  const dialog = useDialog();
  const {
    stats,
    backups,
    isLoadingStats,
    isLoadingBackups,
    statsError,
    backupsError,
    createBackup,
    deleteBackup,
    restoreBackup,
    exportDatabase,
    cleanupLogs,
    cleanupNews,
  } = useStorage();

  if (isLoadingStats) {
    return <LoadingState />;
  }

  if (statsError) {
    return <ErrorState message={statsError instanceof Error ? statsError.message : 'Failed to load storage stats'} />;
  }

  const totalUsed = stats?.totalBytes || 0;
  const limitBytes = 50 * 1024 * 1024 * 1024; // 50 GB default limit
  const usagePercent = limitBytes > 0 ? (totalUsed / limitBytes) * 100 : 0;

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: '1200px' }}>
      <Heading size="6">Storage Management</Heading>

      {/* Storage Overview */}
      <Card>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Heading size="4">Storage Usage</Heading>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              {formatBytes(totalUsed)} / 50 GB
            </Text>
          </Flex>

          <Progress value={usagePercent} max={100} />

          <Grid columns="5" gap="4" style={{ marginTop: 'var(--space-2)' }}>
            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <Database className="w-4 h-4" />
                <Text size="2" color="gray">Database</Text>
              </Flex>
              <Text weight="bold">{stats ? formatBytes(stats.dataBytes) : '...'}</Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <FileText className="w-4 h-4" />
                <Text size="2" color="gray">Logs</Text>
              </Flex>
              <Text weight="bold">{stats ? formatBytes(stats.logsBytes) : '...'}</Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <FolderArchive className="w-4 h-4" />
                <Text size="2" color="gray">Cache</Text>
              </Flex>
              <Text weight="bold">{stats ? formatBytes(stats.cacheBytes) : '...'}</Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <Archive className="w-4 h-4" />
                <Text size="2" color="gray">Backups</Text>
              </Flex>
              <Text weight="bold">{stats ? formatBytes(stats.backupBytes) : '...'}</Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <Download className="w-4 h-4" />
                <Text size="2" color="gray">Exports</Text>
              </Flex>
              <Text weight="bold">{stats ? formatBytes(stats.exportBytes) : '...'}</Text>
            </Flex>
          </Grid>
        </Flex>
      </Card>

      {/* Backup Management */}
      <Card>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Heading size="4">Database Backups</Heading>
            <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
              <Archive className="w-4 h-4" />
              Create Backup
            </Button>
          </Flex>

          {isLoadingBackups ? (
            <LoadingInline />
          ) : backupsError ? (
            <ErrorState message={backupsError instanceof Error ? backupsError.message : 'Failed to load backups'} />
          ) : backups && backups.length > 0 ? (
            <Flex direction="column" gap="2">
              {backups.map((backup) => {
                const filename = backup.filePath.split('/').pop() || backup.filePath;
                return (
                  <Flex
                    key={backup.filePath}
                    justify="between"
                    align="center"
                    p="3"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-2)',
                    }}
                  >
                    <Flex direction="column" gap="1">
                      <Text weight="medium">{filename}</Text>
                      <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                        {new Date(backup.timestamp).toLocaleString()} • {formatBytes(backup.fileSize)}
                      </Text>
                    </Flex>
                    <Flex gap="2">
                      <Button
                        variant="soft"
                        onClick={async () => {
                          const confirmed = await dialog.confirm({
                            title: 'Restore Database',
                            description: `Are you sure you want to restore from ${filename}? The app will need to restart.`,
                          });
                          if (confirmed) {
                            restoreBackup.mutate(backup.filePath);
                          }
                        }}
                        disabled={restoreBackup.isPending}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        color="red"
                        onClick={async () => {
                          const confirmed = await dialog.confirm({
                            title: 'Delete Backup',
                            description: `Are you sure you want to delete ${filename}?`,
                          });
                          if (confirmed) {
                            deleteBackup.mutate(backup.filePath);
                          }
                        }}
                        disabled={deleteBackup.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          ) : (
            <EmptyInline
              icon={Archive}
              message="No backups found. Create your first backup to get started."
            />
          )}
        </Flex>
      </Card>

      {/* Quick Actions */}
      <Card>
        <Flex direction="column" gap="4">
          <Heading size="4">Maintenance</Heading>

          <Grid columns="3" gap="3">
            <Button
              variant="outline"
              onClick={() => exportDatabase.mutate()}
              disabled={exportDatabase.isPending}
            >
              <Upload className="w-4 h-4" />
              Export Database
            </Button>

            <Button
              variant="outline"
              onClick={() => cleanupLogs.mutate()}
              disabled={cleanupLogs.isPending}
            >
              <FileText className="w-4 h-4" />
              Cleanup Logs
            </Button>

            <Button
              variant="outline"
              onClick={() => cleanupNews.mutate()}
              disabled={cleanupNews.isPending}
            >
              <Database className="w-4 h-4" />
              Cleanup Old News
            </Button>
          </Grid>
        </Flex>
      </Card>
    </Flex>
  );
}
