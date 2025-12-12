import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';

type TaskStatus = 'idle' | 'running' | 'success' | 'failed';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun: string | null;
  nextRun: string;
  status: TaskStatus;
  lastError: string | null;
  executionCount: number;
  averageDuration: number; // seconds
}

interface TaskRun {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // seconds
  status: 'running' | 'success' | 'failed';
  error: string | null;
}

// Mock task data - will be replaced with backend integration
const mockTasks: ScheduledTask[] = [
  {
    id: '1',
    name: 'fetch_news',
    description: 'Fetch latest articles from configured news sources',
    schedule: '*/15 * * * *', // Every 15 minutes
    enabled: true,
    lastRun: '2024-12-11 20:45:00',
    nextRun: '2024-12-11 21:00:00',
    status: 'success',
    lastError: null,
    executionCount: 1247,
    averageDuration: 3.2,
  },
  {
    id: '2',
    name: 'cleanup_old_data',
    description: 'Remove articles and archived content older than retention period',
    schedule: '0 3 * * *', // Daily at 3 AM
    enabled: true,
    lastRun: '2024-12-11 03:00:00',
    nextRun: '2024-12-12 03:00:00',
    status: 'success',
    lastError: null,
    executionCount: 45,
    averageDuration: 12.8,
  },
  {
    id: '3',
    name: 'backup_database',
    description: 'Create automatic backup of the database',
    schedule: '0 */6 * * *', // Every 6 hours
    enabled: true,
    lastRun: '2024-12-11 18:00:00',
    nextRun: '2024-12-12 00:00:00',
    status: 'success',
    lastError: null,
    executionCount: 180,
    averageDuration: 2.1,
  },
  {
    id: '4',
    name: 'sync_reddit',
    description: 'Check modqueue and sync Reddit posts',
    schedule: '*/30 * * * *', // Every 30 minutes
    enabled: false,
    lastRun: '2024-12-10 15:30:00',
    nextRun: '2024-12-11 16:00:00',
    status: 'failed',
    lastError: 'Reddit API rate limit exceeded',
    executionCount: 624,
    averageDuration: 1.5,
  },
  {
    id: '5',
    name: 'rotate_logs',
    description: 'Compress and archive old log files',
    schedule: '0 0 * * *', // Daily at midnight
    enabled: true,
    lastRun: '2024-12-11 00:00:00',
    nextRun: '2024-12-12 00:00:00',
    status: 'success',
    lastError: null,
    executionCount: 92,
    averageDuration: 0.8,
  },
];

const mockTaskRuns: TaskRun[] = [
  { id: '1', taskId: '1', taskName: 'fetch_news', startTime: '2024-12-11 20:45:00', endTime: '2024-12-11 20:45:03', duration: 3.2, status: 'success', error: null },
  { id: '2', taskId: '1', taskName: 'fetch_news', startTime: '2024-12-11 20:30:00', endTime: '2024-12-11 20:30:03', duration: 3.1, status: 'success', error: null },
  { id: '3', taskId: '2', taskName: 'cleanup_old_data', startTime: '2024-12-11 03:00:00', endTime: '2024-12-11 03:00:12', duration: 12.8, status: 'success', error: null },
  { id: '4', taskId: '4', taskName: 'sync_reddit', startTime: '2024-12-10 15:30:00', endTime: '2024-12-10 15:30:02', duration: 2.1, status: 'failed', error: 'Reddit API rate limit exceeded' },
  { id: '5', taskId: '3', taskName: 'backup_database', startTime: '2024-12-11 18:00:00', endTime: '2024-12-11 18:00:02', duration: 2.1, status: 'success', error: null },
  { id: '6', taskId: '1', taskName: 'fetch_news', startTime: '2024-12-11 20:15:00', endTime: '2024-12-11 20:15:03', duration: 3.4, status: 'success', error: null },
  { id: '7', taskId: '5', taskName: 'rotate_logs', startTime: '2024-12-11 00:00:00', endTime: '2024-12-11 00:00:01', duration: 0.8, status: 'success', error: null },
];

export function TasksView() {
  const [tasks] = useState(mockTasks);
  const [taskRuns] = useState(mockTaskRuns);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const handleRunTask = async (taskId: string, taskName: string) => {
    if (!confirm(`Manually trigger task "${taskName}"?`)) {
      return;
    }
    // TODO: Call backend to run task
    console.log('Running task:', taskId);
    // invoke('run_task_now', { taskId })
  };

  const handleToggleTask = async (taskId: string, taskName: string, currentEnabled: boolean) => {
    const action = currentEnabled ? 'disable' : 'enable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} task "${taskName}"?`)) {
      return;
    }
    // TODO: Call backend to toggle task
    console.log(`${action} task:`, taskId);
    // invoke('toggle_task', { taskId, enabled: !currentEnabled })
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'idle': return 'text-gray-400';
      case 'running': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium uppercase';
    switch (status) {
      case 'idle': return `${baseClasses} bg-gray-500/20 text-gray-300`;
      case 'running': return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case 'success': return `${baseClasses} bg-green-500/20 text-green-300`;
      case 'failed': return `${baseClasses} bg-red-500/20 text-red-300`;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'Running...';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseCron = (cron: string) => {
    // Simple cron parser for display
    const patterns: Record<string, string> = {
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Hourly',
      '0 */6 * * *': 'Every 6 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 3 * * *': 'Daily at 3:00 AM',
    };
    return patterns[cron] || cron;
  };

  const filteredHistory = selectedTask 
    ? taskRuns.filter(run => run.taskId === selectedTask)
    : taskRuns;

  return (
    <div className="layout-container">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Scheduled Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage automated background tasks
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Tasks</div>
              <div className="text-2xl font-bold mt-1">{tasks.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Enabled</div>
              <div className="text-2xl font-bold mt-1 text-green-400">
                {tasks.filter(t => t.enabled).length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Executions</div>
              <div className="text-2xl font-bold mt-1">
                {tasks.reduce((sum, t) => sum + t.executionCount, 0).toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Failed (24h)</div>
              <div className="text-2xl font-bold mt-1 text-red-400">
                {taskRuns.filter(r => r.status === 'failed').length}
              </div>
            </Card>
          </div>

          {/* Tasks List */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">⚡ Active Tasks</h2>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    task.enabled 
                      ? 'border-border hover:border-accent' 
                      : 'border-border/50 bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{task.name}</h3>
                        <span className={getStatusBadge(task.status)}>
                          {task.status}
                        </span>
                        {!task.enabled && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium uppercase bg-gray-500/20 text-gray-400">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {task.description}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Schedule:</span>
                          <div className="font-medium">{parseCron(task.schedule)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Run:</span>
                          <div className="font-medium">{formatDate(task.lastRun)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next Run:</span>
                          <div className="font-medium">{formatDate(task.nextRun)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Duration:</span>
                          <div className="font-medium">{formatDuration(task.averageDuration)}</div>
                        </div>
                      </div>
                      {task.lastError && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                          <strong>Last Error:</strong> {task.lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRunTask(task.id, task.name)}
                        disabled={!task.enabled}
                      >
                        ▶️ Run Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleTask(task.id, task.name, task.enabled)}
                      >
                        {task.enabled ? '⏸️ Disable' : '▶️ Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                      >
                        📊 History
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Execution History */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">📜 Execution History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTask 
                    ? `Showing history for ${tasks.find(t => t.id === selectedTask)?.name}`
                    : 'Showing all recent executions'
                  }
                </p>
              </div>
              {selectedTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                >
                  Show All
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No execution history</p>
                </div>
              ) : (
                filteredHistory.map((run) => (
                  <div 
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={getStatusBadge(run.status)}>
                          {run.status}
                        </span>
                        <span className="font-semibold">{run.taskName}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(run.startTime)}
                        </span>
                      </div>
                      {run.error && (
                        <div className="mt-2 text-sm text-red-400">
                          {run.error}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(run.duration)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Scheduler Info */}
          <Card className="p-4 bg-muted/30">
            <div className="text-sm space-y-2">
              <div className="font-semibold mb-2">⚙️ Scheduler Information</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Tasks are managed by <code className="font-mono">tokio-cron-scheduler</code></p>
                <p>• Execution history is retained for 30 days</p>
                <p>• Failed tasks will retry up to 3 times with exponential backoff</p>
                <p>• Configure task settings in <span className="text-accent">Settings</span></p>
              </div>
            </div>
          </Card>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
