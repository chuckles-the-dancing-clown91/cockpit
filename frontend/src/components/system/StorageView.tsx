import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { ScrollArea } from '../ui/ScrollArea';
import { Separator } from '../ui/Separator';

// Mock storage data - will be replaced with backend integration
const mockStorageStats = {
  totalSize: 45.6, // MB
  tables: [
    { name: 'news_articles', size: 28.4, records: 1247 },
    { name: 'ideas', size: 8.2, records: 156 },
    { name: 'system_tasks', size: 2.1, records: 8 },
    { name: 'system_task_runs', size: 4.3, records: 892 },
    { name: 'news_sources', size: 0.8, records: 12 },
    { name: 'news_settings', size: 1.8, records: 45 },
  ],
  backups: [
    { name: 'backup-2024-12-11-09-00.db', size: 44.2, date: '2024-12-11 09:00:00' },
    { name: 'backup-2024-12-10-09-00.db', size: 43.8, date: '2024-12-10 09:00:00' },
    { name: 'backup-2024-12-09-09-00.db', size: 42.1, date: '2024-12-09 09:00:00' },
  ],
  lastBackup: '2024-12-11 09:00:00',
  autoBackupEnabled: true,
};

export default function StorageView() {
  const [stats] = useState(mockStorageStats);
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });
  const [cleanupDays, setCleanupDays] = useState(90);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // TODO: Call backend to export database
    console.log('Exporting database with date range:', exportDateRange);
    // invoke('export_database', { startDate: exportDateRange.start, endDate: exportDateRange.end })
    setTimeout(() => setIsExporting(false), 1500);
  };

  const handleImport = async () => {
    setIsImporting(true);
    // TODO: Call backend to import database
    console.log('Importing database');
    // invoke('import_database')
    setTimeout(() => setIsImporting(false), 1500);
  };

  const handleCleanup = async () => {
    if (!confirm(`Delete all data older than ${cleanupDays} days? This cannot be undone.`)) {
      return;
    }
    setIsCleaningUp(true);
    // TODO: Call backend to cleanup old data
    console.log(`Cleaning up data older than ${cleanupDays} days`);
    // invoke('cleanup_old_data', { days: cleanupDays })
    setTimeout(() => setIsCleaningUp(false), 2000);
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    // TODO: Call backend to create backup
    console.log('Creating manual backup');
    // invoke('create_backup')
    setTimeout(() => setIsCreatingBackup(false), 1500);
  };

  const handleRestoreBackup = async (backupName: string) => {
    if (!confirm(`Restore from ${backupName}? Current data will be overwritten.`)) {
      return;
    }
    // TODO: Call backend to restore backup
    console.log('Restoring backup:', backupName);
    // invoke('restore_backup', { filename: backupName })
  };

  const handleDeleteBackup = async (backupName: string) => {
    if (!confirm(`Delete backup ${backupName}?`)) {
      return;
    }
    // TODO: Call backend to delete backup
    console.log('Deleting backup:', backupName);
    // invoke('delete_backup', { filename: backupName })
  };

  const formatSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
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
              <div className="text-sm text-muted-foreground">Total Database Size</div>
              <div className="text-3xl font-bold mt-1">{formatSize(stats.totalSize)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Records</div>
              <div className="text-3xl font-bold mt-1">
                {stats.tables.reduce((sum, t) => sum + t.records, 0).toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Last Backup</div>
              <div className="text-lg font-semibold mt-1">
                {stats.lastBackup ? formatDate(stats.lastBackup) : 'Never'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Auto-backup: {stats.autoBackupEnabled ? '✓ Enabled' : '✗ Disabled'}
              </div>
            </Card>
          </div>

          {/* Table Sizes */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">💾 Table Statistics</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Storage breakdown by database table
              </p>
            </div>
            <div className="space-y-3">
              {stats.tables.map((table) => {
                const percentage = (table.size / stats.totalSize) * 100;
                return (
                  <div key={table.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{table.name}</span>
                      <span className="text-muted-foreground">
                        {formatSize(table.size)} · {table.records.toLocaleString()} records
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
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? 'Exporting...' : '📤 Export Database'}
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isImporting}
                  variant="outline"
                  className="flex-1"
                >
                  {isImporting ? 'Importing...' : '📥 Import Database'}
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
                disabled={isCreatingBackup}
                size="sm"
              >
                {isCreatingBackup ? 'Creating...' : '+ Create Backup'}
              </Button>
            </div>

            {stats.backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2">💾</div>
                <p>No backups yet</p>
                <p className="text-sm mt-1">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.backups.map((backup) => (
                  <div 
                    key={backup.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(backup.date)} · {formatSize(backup.size)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRestoreBackup(backup.name)}
                      >
                        Restore
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteBackup(backup.name)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
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
                      This will permanently delete articles, archived content, and task run history 
                      older than {cleanupDays} days. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCleanup}
                disabled={isCleaningUp}
                variant="outline"
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                {isCleaningUp ? 'Cleaning up...' : '🗑️ Run Cleanup'}
              </Button>
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
