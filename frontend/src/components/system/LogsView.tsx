import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ScrollArea } from '../ui/ScrollArea';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'all';

interface LogEntry {
  id: string;
  timestamp: string;
  level: Exclude<LogLevel, 'all'>;
  module: string;
  message: string;
}

// Mock log data - will be replaced with backend integration
const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '2024-12-11 20:45:23', level: 'info', module: 'news', message: 'Successfully fetched 12 articles from TechCrunch' },
  { id: '2', timestamp: '2024-12-11 20:45:21', level: 'debug', module: 'scheduler', message: 'Task "fetch_news" triggered by schedule' },
  { id: '3', timestamp: '2024-12-11 20:45:20', level: 'info', module: 'scheduler', message: 'Running scheduled task: fetch_news' },
  { id: '4', timestamp: '2024-12-11 20:30:15', level: 'warn', module: 'news', message: 'Rate limit approaching for News API (85% of quota used)' },
  { id: '5', timestamp: '2024-12-11 20:15:08', level: 'info', module: 'db', message: 'Database backup completed successfully' },
  { id: '6', timestamp: '2024-12-11 20:00:45', level: 'error', module: 'news', message: 'Failed to fetch from Hacker News: Connection timeout' },
  { id: '7', timestamp: '2024-12-11 19:45:32', level: 'info', module: 'crypto', message: 'API key decrypted successfully' },
  { id: '8', timestamp: '2024-12-11 19:30:21', level: 'debug', module: 'db', message: 'Query executed: SELECT * FROM news_articles WHERE created_at > ?' },
  { id: '9', timestamp: '2024-12-11 19:15:17', level: 'warn', module: 'scheduler', message: 'Task "cleanup_old_data" took 2.3s (threshold: 2s)' },
  { id: '10', timestamp: '2024-12-11 19:00:05', level: 'error', module: 'news', message: 'Invalid API key for News API' },
  { id: '11', timestamp: '2024-12-11 18:45:52', level: 'info', module: 'system', message: 'Application started successfully' },
  { id: '12', timestamp: '2024-12-11 18:45:50', level: 'debug', module: 'config', message: 'Loaded configuration from storage/data/config.json' },
];

const mockLogStats = {
  totalSize: 8.4, // MB
  totalLines: 45823,
  oldestEntry: '2024-11-11 09:00:00',
  newestEntry: '2024-12-11 20:45:23',
};

export default function LogsView() {
  const [logs] = useState(mockLogs);
  const [stats] = useState(mockLogStats);
  
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  
  const [isExporting, setIsExporting] = useState(false);
  const [isTruncating, setIsTruncating] = useState(false);

  // Get unique modules from logs
  const modules = ['all', ...Array.from(new Set(logs.map(log => log.module)))];

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (dateStart && log.timestamp < dateStart) return false;
    if (dateEnd && log.timestamp > dateEnd) return false;
    return true;
  });

  const handleExport = async () => {
    setIsExporting(true);
    // TODO: Call backend to export logs
    console.log('Exporting logs with filters:', { levelFilter, moduleFilter, searchQuery, dateStart, dateEnd });
    // invoke('export_logs', { level: levelFilter, module: moduleFilter, search: searchQuery, startDate: dateStart, endDate: dateEnd })
    setTimeout(() => setIsExporting(false), 1500);
  };

  const handleTruncate = async () => {
    if (!confirm('Delete ALL logs? This cannot be undone.')) {
      return;
    }
    setIsTruncating(true);
    // TODO: Call backend to truncate logs
    console.log('Truncating all logs');
    // invoke('truncate_logs')
    setTimeout(() => setIsTruncating(false), 1500);
  };

  const getLevelColor = (level: Exclude<LogLevel, 'all'>) => {
    switch (level) {
      case 'debug': return 'text-gray-400';
      case 'info': return 'text-blue-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
    }
  };

  const getLevelBadge = (level: Exclude<LogLevel, 'all'>) => {
    const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium uppercase';
    switch (level) {
      case 'debug': return `${baseClasses} bg-gray-500/20 text-gray-300`;
      case 'info': return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case 'warn': return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case 'error': return `${baseClasses} bg-red-500/20 text-red-300`;
    }
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
      minute: '2-digit',
      second: '2-digit'
    });
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Size</div>
            <div className="text-2xl font-bold mt-1">{formatSize(stats.totalSize)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Lines</div>
            <div className="text-2xl font-bold mt-1">{stats.totalLines.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Filtered</div>
            <div className="text-2xl font-bold mt-1">{filteredLogs.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Oldest Entry</div>
            <div className="text-sm font-semibold mt-1">{formatDate(stats.oldestEntry)}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel)}>
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger id="module">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(mod => (
                    <SelectItem key={mod} value={mod}>
                      {mod === 'all' ? 'All Modules' : mod}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateStart">Start Date</Label>
              <Input
                id="dateStart"
                type="datetime-local"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input
                id="dateEnd"
                type="datetime-local"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              {isExporting ? 'Exporting...' : '📤 Export Filtered'}
            </Button>
            <Button 
              onClick={() => {
                setLevelFilter('all');
                setModuleFilter('all');
                setSearchQuery('');
                setDateStart('');
                setDateEnd('');
              }}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Log Viewer */}
        <Card className="flex-1 flex flex-col min-h-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">📄 Log Entries</h2>
            <Button 
              onClick={handleTruncate}
              disabled={isTruncating}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              {isTruncating ? 'Truncating...' : '🗑️ Truncate All'}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1 font-mono text-sm">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-2">📄</div>
                  <p>No logs found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {log.timestamp}
                    </span>
                    <span className={getLevelBadge(log.level)}>
                      {log.level}
                    </span>
                    <span className="text-accent font-semibold whitespace-nowrap">
                      [{log.module}]
                    </span>
                    <span className={getLevelColor(log.level)}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
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
