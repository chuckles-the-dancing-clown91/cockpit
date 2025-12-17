import { useState } from 'react';
import { Card } from '@/core/components/ui/Card';
import { Button } from '@/core/components/ui/Button';
import { Input } from '@/core/components/ui/Input';
import { Label } from '@/core/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/Select';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import { Loader2 } from 'lucide-react';
import { toast } from '@/core/lib/toast';
import { useGetLogs, useGetLogStats, useExportLogs, useClearLogs } from '../hooks/queries';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'ALL';

export default function LogsView() {
  const [levelFilter, setLevelFilter] = useState<LogLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: logs, isLoading: logsLoading, error: logsError } = useGetLogs(
    levelFilter === 'ALL' ? undefined : levelFilter,
    100,
    0
  );
  const { data: stats, isLoading: statsLoading } = useGetLogStats();
  const exportLogs = useExportLogs();
  const clearLogs = useClearLogs();

  // Filter logs by search
  const filteredLogs = logs?.filter(log => {
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.target.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const handleExport = async () => {
    try {
      const filePath = await exportLogs.mutateAsync(levelFilter === 'ALL' ? undefined : levelFilter);
      const fileName = filePath.split('/').pop() || filePath;
      toast.success('Logs exported successfully', {
        description: `Saved to ${fileName}`,
      });
    } catch (error) {
      toast.error('Failed to export logs', {
        description: String(error),
      });
    }
  };

  const handleClear = async () => {
    if (!confirm('Delete ALL logs? This cannot be undone.')) {
      return;
    }
    
    try {
      const result = await clearLogs.mutateAsync();
      toast.success('Logs cleared', {
        description: `Deleted ${result.filesDeleted} files, freed ${(result.spaceFreedBytes / (1024 * 1024)).toFixed(2)} MB`,
      });
    } catch (error) {
      toast.error('Failed to clear logs', {
        description: String(error),
      });
    }
  };

  const getLevelBadge = (level: string) => {
    const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium uppercase';
    switch (level.toUpperCase()) {
      case 'DEBUG': return `${baseClasses} bg-gray-500/20 text-gray-300`;
      case 'INFO': return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case 'WARN': return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case 'ERROR': return `${baseClasses} bg-red-500/20 text-red-300`;
      default: return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="layout-container">
      <div className="p-6 space-y-6 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground mt-1">
            View, filter, and export application logs
          </p>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Logs</div>
              <div className="text-2xl font-bold mt-1">{stats.totalCount.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Last 24 Hours</div>
              <div className="text-2xl font-bold mt-1">{stats.last24hCount.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Errors</div>
              <div className="text-2xl font-bold mt-1 text-red-400">{stats.errorCount.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Warnings</div>
              <div className="text-2xl font-bold mt-1 text-yellow-400">{stats.warnCount.toLocaleString()}</div>
            </Card>
          </div>
        ) : null}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel)}>
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARN">Warn</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search messages and modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleExport}
              disabled={exportLogs.isPending}
              variant="outline"
              size="sm"
            >
              {exportLogs.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              📤 Export Logs
            </Button>
            <Button 
              onClick={handleClear}
              disabled={clearLogs.isPending}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              {clearLogs.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              🗑️ Clear All Logs
            </Button>
          </div>
        </Card>

        {/* Log Viewer */}
        <Card className="flex-1 flex flex-col min-h-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">📄 Log Entries ({filteredLogs.length})</h2>
          </div>

          {logsLoading ? (
            <div className="flex justify-center items-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logsError ? (
            <div className="text-center py-12 text-red-500">
              <div className="text-4xl mb-2">❌</div>
              <p>Failed to load logs</p>
              <p className="text-sm mt-1">{String(logsError)}</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1 font-mono text-sm">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-2">📄</div>
                    <p>No logs found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <div 
                      key={`${log.timestamp}-${idx}`}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </span>
                      <span className={getLevelBadge(log.level)}>
                        {log.level}
                      </span>
                      <span className="text-accent font-semibold whitespace-nowrap">
                        [{log.target}]
                      </span>
                      <span className="text-foreground flex-1">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Log File Info */}
        <Card className="p-4 bg-muted/30">
          <div className="text-sm space-y-1">
            <div className="font-semibold mb-2">📍 Log Files Location</div>
            <code className="block text-xs font-mono bg-background/50 p-2 rounded border border-border">
              ./storage/logs/
            </code>
            <div className="text-xs text-muted-foreground mt-3 space-y-1">
              <p>• Current log: <code className="font-mono">app.log</code></p>
              <p>• Archived logs: <code className="font-mono">app-2024-12-10.log.gz</code></p>
              <p>• Configure log settings in <span className="text-accent">Settings</span></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
