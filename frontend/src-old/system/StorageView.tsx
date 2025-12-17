import { useState } from 'react';
import { Card } from '@/core/components/ui/Card';
import { Button } from '@/core/components/ui/Button';
import { Label } from '@/core/components/ui/Label';
import { Input } from '@/core/components/ui/Input';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import { Separator } from '@/core/components/ui/Separator';
import { Loader2 } from 'lucide-react';
import { toast } from '@/core/lib/toast';
import { useStorageStats, useListBackups, useCreateBackup, useRestoreBackup, useDeleteBackup, useExportData, useImportData, useCleanupLogs, useCleanupNews } from '../hooks/queries';

export default function StorageView() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useStorageStats();
  const { data: backups, isLoading: backupsLoading, error: backupsError } = useListBackups();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const deleteBackup = useDeleteBackup();
  const exportData = useExportData();
  const importData = useImportData();
  const cleanupLogs = useCleanupLogs();
  const cleanupNews = useCleanupNews();
  
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });
  const [cleanupDays, setCleanupDays] = useState(90);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleExport = async () => {
    try {
      const result = await exportData.mutateAsync();
      const fileName = result.filePath.split('/').pop() || result.filePath;
      toast.success('Data exported successfully', {
        description: `${result.recordCounts.ideas} ideas, ${result.recordCounts.newsArticles} articles exported to ${fileName}`,
      });
    } catch (error) {
      toast.error('Failed to export data', {
        description: String(error),
      });
    }
  };

  const handleImport = async () => {
    try {
      // Use Tauri dialog plugin for file picker
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      const filePath = await open({
        multiple: false,
        directory: false,
        title: 'Select Export File to Import',
        filters: [{
          name: 'JSON Export Files',
          extensions: ['json']
        }]
      });
      
      if (!filePath) {
        // User cancelled
        return;
      }
      
      const result = await importData.mutateAsync(filePath);
      
      toast.success('Data imported successfully', {
        description: `Added ${result.recordsAdded} records, skipped ${result.recordsSkipped} duplicates${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
      });
      
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast.warning('Some records had errors', {
          description: `${result.errors.length} records failed to import. Check console for details.`,
        });
      }
    } catch (error) {
      toast.error('Failed to import data', {
        description: String(error),
      });
    }
  };

  const handleCleanupLogs = async () => {
    if (!confirm(`Delete log files older than ${cleanupDays} days? This cannot be undone.`)) {
      return;
    }
    setIsCleaningUp(true);
    try {
      const result = await cleanupLogs.mutateAsync(cleanupDays);
      toast.success('Logs cleaned up', {
        description: `Deleted ${result.filesDeleted} files, freed ${(result.spaceFreedBytes / (1024 * 1024)).toFixed(2)} MB`,
      });
    } catch (error) {
      toast.error('Failed to cleanup logs', {
        description: String(error),
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCleanupNews = async () => {
    if (!confirm(`Delete dismissed news articles older than ${cleanupDays} days? This cannot be undone.`)) {
      return;
    }
    setIsCleaningUp(true);
    try {
      const result = await cleanupNews.mutateAsync(cleanupDays);
      toast.success('Dismissed articles cleaned up', {
        description: `Deleted ${result.filesDeleted} articles`,
      });
    } catch (error) {
      toast.error('Failed to cleanup news', {
        description: String(error),
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup.mutateAsync();
      toast.success('Backup created successfully', {
        description: `Saved to ${result.filePath.split('/').pop()}`,
      });
    } catch (error) {
      toast.error('Failed to create backup', {
        description: String(error),
      });
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {
    const backupName = backupPath.split('/').pop() || backupPath;
    if (!confirm(`Restore from ${backupName}? Current data will be overwritten and the app will need to restart.`)) {
      return;
    }
    
    try {
      await restoreBackup.mutateAsync(backupPath);
      toast.success('Backup restored successfully', {
        description: 'Please restart the application',
      });
    } catch (error) {
      toast.error('Failed to restore backup', {
        description: String(error),
      });
    }
  };

  const handleDeleteBackup = async (backupPath: string) => {
    const fileName = backupPath.split('/').pop() || backupPath;
    if (!confirm(`Delete backup ${fileName}?`)) {
      return;
    }
    
    try {
      await deleteBackup.mutateAsync(backupPath);
      toast.success('Backup deleted', {
        description: `${fileName} has been removed`,
      });
    } catch (error) {
      toast.error('Failed to delete backup', {
        description: String(error),
      });
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (statsLoading || backupsLoading) {
    return (
      <div className="layout-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading storage information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (statsError || backupsError) {
    return (
      <div className="layout-container flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Failed to load storage data</p>
          <p className="text-sm text-muted-foreground">{String(statsError || backupsError)}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalSize = stats.totalBytes;
  const dataSize = stats.dataBytes;
  const logsSize = stats.logsBytes;
  const cacheSize = stats.cacheBytes;
  const backupSize = stats.backupBytes;
  const exportSize = stats.exportBytes;
  
  const lastBackupTimestamp = backups && backups.length > 0 ? backups[0].timestamp : null;

  return (
    <div className="layout-container">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Storage Management</h1>
            <p className="text-muted-foreground mt-1">
              Monitor database size, manage backups, and export data
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Storage Size</div>
              <div className="text-3xl font-bold mt-1">{formatSize(totalSize)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Database Size</div>
              <div className="text-3xl font-bold mt-1">{formatSize(dataSize)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Last Backup</div>
              <div className="text-lg font-semibold mt-1">
                {lastBackupTimestamp ? formatDate(lastBackupTimestamp) : 'Never'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {backups?.length || 0} backup{backups && backups.length !== 1 ? 's' : ''} available
              </div>
            </Card>
          </div>

          {/* Storage Breakdown */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">💾 Storage Breakdown</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Storage usage by category
              </p>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Database', size: dataSize, color: 'bg-blue-500' },
                { name: 'Logs', size: logsSize, color: 'bg-yellow-500' },
                { name: 'Backups', size: backupSize, color: 'bg-green-500' },
                { name: 'Cache', size: cacheSize, color: 'bg-purple-500' },
                { name: 'Exports', size: exportSize, color: 'bg-orange-500' },
              ].map((item) => {
                const percentage = totalSize > 0 ? (item.size / totalSize) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatSize(item.size)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Export/Import */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">📤 Export & Import</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Export data for backup or transfer to another system
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Export Date Range (Optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="date"
                      value={exportDateRange.start}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                      placeholder="Start date"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={exportDateRange.end}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                      placeholder="End date"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to export all data
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleExport}
                  disabled={exportData.isPending}
                  className="flex-1"
                >
                  {exportData.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    '📤 Export Database'
                  )}
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importData.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {importData.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    '📥 Import Database'
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Note:</strong> Exported files are saved to <code className="font-mono">storage/exports/</code>. 
                Importing will merge data, not replace existing records.
              </div>
            </div>
          </Card>

          {/* Backups */}
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">💿 Backup Management</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create, restore, and manage database backups
                </p>
              </div>
              <Button 
                onClick={handleCreateBackup}
                disabled={createBackup.isPending}
                size="sm"
              >
                {createBackup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  '+ Create Backup'
                )}
              </Button>
            </div>

            {!backups || backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2">💾</div>
                <p>No backups yet</p>
                <p className="text-sm mt-1">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => {
                  const backupName = backup.filePath.split('/').pop() || backup.filePath;
                  return (
                    <div 
                      key={backup.filePath}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium font-mono text-sm">{backupName}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(backup.timestamp)} · {formatSize(backup.fileSize)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup.filePath)}
                          disabled={restoreBackup.isPending}
                        >
                          {restoreBackup.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Restoring...
                            </>
                          ) : (
                            'Restore'
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteBackup(backup.filePath)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Cleanup */}
          <Card className="p-6 border-orange-500/50">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🗑️ Data Cleanup</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Remove old data to free up space
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cleanupDays">Delete data older than (days)</Label>
                <Input
                  id="cleanupDays"
                  type="number"
                  min="7"
                  max="365"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-orange-500">Warning: Permanent Action</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      This will permanently delete log files and dismissed news articles
                      older than {cleanupDays} days. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleCleanupLogs}
                  disabled={isCleaningUp}
                  variant="outline"
                  className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500/10"
                >
                  {isCleaningUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  📄 Clean Logs
                </Button>
                <Button 
                  onClick={handleCleanupNews}
                  disabled={isCleaningUp}
                  variant="outline"
                  className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500/10"
                >
                  {isCleaningUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  📰 Clean News
                </Button>
              </div>
            </div>
          </Card>

          {/* Database Info */}
          <Card className="p-6 bg-muted/30">
            <div className="mb-3">
              <h3 className="text-sm font-semibold">📍 Database Location</h3>
            </div>
            <code className="block text-xs font-mono bg-background/50 p-3 rounded border border-border">
              ./storage/data/db.sql
            </code>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>• Backups are stored in <code className="font-mono">./storage/backups/</code></p>
              <p>• Exports are saved to <code className="font-mono">./storage/exports/</code></p>
              <p>• Configure backup settings in <a href="#" className="text-accent hover:underline">Settings</a></p>
            </div>
          </Card>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
