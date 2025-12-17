import { useState } from 'react';
import { Card } from '@/core/components/ui/Card';
import { Button } from '@/core/components/ui/Button';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/core/lib/toast';
import {
  useListSystemTasks,
  useGetTaskHistory,
  useRunTaskNow,
  useUpdateSystemTask,
} from '../hooks/queries';

export default function TasksView() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  
  // Fetch data from backend with auto-refresh
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useListSystemTasks();
  const { data: taskHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useGetTaskHistory(
    selectedTaskId ?? undefined,
    50,
    0
  );
  
  // Calculate real-time stats from actual data
  const stats = {
    totalTasks: tasks.length,
    enabledTasks: tasks.filter(t => t.enabled).length,
    totalErrors: tasks.reduce((sum, t) => sum + (t.errorCount || 0), 0),
    recentRuns: taskHistory.length,
  };
  
  const runTaskMutation = useRunTaskNow();
  const updateTaskMutation = useUpdateSystemTask();

  const handleRunTask = async (taskType: string, taskName: string) => {
    if (!confirm(`Manually trigger task "${taskName}"?`)) {
      return;
    }
    
    try {
      const result = await runTaskMutation.mutateAsync(taskType);
      
      // Refetch data after task execution
      await Promise.all([refetchTasks(), refetchHistory()]);
      
      if (result.status === 'success') {
        toast.success(`Task "${taskName}" completed successfully!`, {
          description: result.message || 'Task executed',
        });
      } else {
        toast.error(`Task "${taskName}" failed`, {
          description: result.errorMessage || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(`Failed to run task "${taskName}"`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleToggleTask = async (taskType: string, taskName: string, currentEnabled: boolean) => {
    const action = currentEnabled ? 'disable' : 'enable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} task "${taskName}"?`)) {
      return;
    }
    
    try {
      await updateTaskMutation.mutateAsync({
        taskType,
        input: { enabled: !currentEnabled },
      });
      
      // Refetch tasks to show updated state
      await refetchTasks();
      
      toast.success(`Task "${taskName}" ${action}d successfully!`);
    } catch (error) {
      toast.error(`Failed to ${action} task "${taskName}"`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-0.5 rounded text-xs font-medium uppercase';
    switch (status?.toLowerCase()) {
      case 'success':
        return `${baseClasses} bg-green-500/20 text-green-300`;
      case 'error':
      case 'failed':
        return `${baseClasses} bg-red-500/20 text-red-300`;
      case 'running':
        return `${baseClasses} bg-blue-500/20 text-blue-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
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

  const parseCron = (cron: string | null) => {
    if (!cron) return 'Manual only';
    const patterns: Record<string, string> = {
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Hourly',
      '0 */6 * * *': 'Every 6 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 3 * * *': 'Daily at 3:00 AM',
      '0 2 * * *': 'Daily at 2:00 AM',
    };
    return patterns[cron] || cron;
  };

  const parseFrequency = (task: typeof tasks[0]) => {
    if (task.frequencyCron) {
      return parseCron(task.frequencyCron);
    }
    if (task.frequencySeconds) {
      const minutes = Math.floor(task.frequencySeconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
      if (minutes > 0) return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
      return `Every ${task.frequencySeconds} seconds`;
    }
    return 'Manual only';
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  if (tasksLoading) {
    return (
      <div className="layout-container">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Scheduled Tasks</h1>
              <p className="text-muted-foreground mt-1">
                Monitor and manage automated background tasks
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTasks();
                refetchHistory();
                toast.success('Tasks refreshed');
              }}
              disabled={tasksLoading || historyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${tasksLoading || historyLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Tasks</div>
              <div className="text-2xl font-bold mt-1">{stats.totalTasks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Enabled</div>
              <div className="text-2xl font-bold mt-1 text-green-400">
                {stats.enabledTasks}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Errors</div>
              <div className="text-2xl font-bold mt-1 text-red-400">
                {stats.totalErrors}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Recent Runs</div>
              <div className="text-2xl font-bold mt-1">
                {stats.recentRuns}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">⚡ Active Tasks</h2>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2">⚙️</div>
                <p>No scheduled tasks configured</p>
              </div>
            ) : (
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
                          {task.lastStatus && (
                            <span className={getStatusBadge(task.lastStatus)}>
                              {task.lastStatus}
                            </span>
                          )}
                          {!task.enabled && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium uppercase bg-gray-500/20 text-gray-400">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {task.component} · {task.taskType}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Schedule:</span>
                            <div className="font-medium">{parseFrequency(task)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Run:</span>
                            <div className="font-medium">{formatDate(task.lastRunAt)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Error Count:</span>
                            <div className={`font-medium ${task.errorCount > 0 ? 'text-red-400' : ''}`}>
                              {task.errorCount}
                            </div>
                          </div>
                        </div>
                        {task.lastStatus === 'error' && task.lastResult && (
                          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                            <strong>Last Error:</strong> {task.lastResult}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRunTask(task.taskType, task.name)}
                          disabled={!task.enabled || runTaskMutation.isPending}
                          title={!task.enabled ? 'Enable task first to run manually' : 'Run this task immediately'}
                        >
                          {runTaskMutation.isPending ? (
                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running...</>
                          ) : (
                            <>▶️ Run Now</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleTask(task.taskType, task.name, task.enabled)}
                          disabled={updateTaskMutation.isPending}
                          title={task.enabled ? 'Disable this scheduled task' : 'Enable this scheduled task'}
                        >
                          {updateTaskMutation.isPending ? (
                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</>
                          ) : (
                            <>{task.enabled ? '⏸️ Disable' : '▶️ Enable'}</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                          title="View execution history for this task"
                        >
                          📊 History
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">📜 Execution History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTask 
                    ? `Showing history for ${selectedTask.name}`
                    : 'Showing all recent executions'
                  }
                </p>
              </div>
              {selectedTaskId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTaskId(null)}
                >
                  Show All
                </Button>
              )}
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-2">
                {taskHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No execution history</p>
                  </div>
                ) : (
                  taskHistory.map((run) => {
                    const task = tasks.find(t => t.id === run.taskId);
                    return (
                      <div 
                        key={run.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={getStatusBadge(run.status)}>
                              {run.status}
                            </span>
                            <span className="font-semibold">{task?.name || 'Unknown Task'}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(run.startedAt)}
                            </span>
                          </div>
                          {run.errorMessage && (
                            <div className="mt-2 text-sm text-red-400">
                              {run.errorMessage}
                            </div>
                          )}
                          {run.result && run.status === 'success' && (
                            <div className="mt-2 text-xs text-muted-foreground font-mono">
                              {run.result.length > 100 ? run.result.substring(0, 100) + '...' : run.result}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDuration(run.durationSecs)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 bg-muted/30">
            <div className="text-sm space-y-2">
              <div className="font-semibold mb-2">⚙️ Scheduler Information</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Tasks are managed by <code className="font-mono">tokio-cron-scheduler</code></p>
                <p>• Execution history is retained for debugging and monitoring</p>
                <p>• Failed tasks will be logged for investigation</p>
                <p>• Configure task settings in <span className="text-accent">Settings</span></p>
              </div>
            </div>
          </Card>

          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
