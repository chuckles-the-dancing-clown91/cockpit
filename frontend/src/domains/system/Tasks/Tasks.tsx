import { Flex, Card, Heading, Text, Button, Badge, Switch, TextField } from '@radix-ui/themes';
import { useTasks } from './useTasks';
import { Play, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useState } from 'react';
import { LoadingState, ErrorState } from '@/core/components/ui';

export function Tasks() {
  const { tasks, history, isLoadingTasks, isLoadingHistory, runTask, updateTask } = useTasks();
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [cronSchedule, setCronSchedule] = useState('');

  const handleToggleTask = async (taskId: number, currentEnabled: boolean) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    await updateTask.mutateAsync({
      taskType: task.taskType,
      input: { enabled: !currentEnabled },
    });
  };

  const handleUpdateSchedule = async (taskType: string) => {
    await updateTask.mutateAsync({
      taskType,
      input: { frequency_cron: cronSchedule },
    });
    setEditingTask(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge color="green">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge color="red">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge color="blue">
            <Clock className="w-3 h-3" />
            Running
          </Badge>
        );
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  if (isLoadingTasks) {
    return <LoadingState />;
  }

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: '1200px' }}>
      <Heading size="6">Scheduled Tasks</Heading>

      {/* Task List */}
      <Flex direction="column" gap="3">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <Card key={task.id}>
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start">
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="3">
                      <Heading size="4">{task.name}</Heading>
                      {task.enabled ? (
                        <Badge color="green">Enabled</Badge>
                      ) : (
                        <Badge color="gray">Disabled</Badge>
                      )}
                      {task.lastStatus && getStatusBadge(task.lastStatus)}
                    </Flex>
                    <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                      {task.taskType} • {task.component}
                    </Text>
                  </Flex>
                  <Flex gap="2">
                    <Button
                      variant="outline"
                      size="2"
                      onClick={() => runTask.mutate(task.taskType)}
                      disabled={runTask.isPending}
                    >
                      <Play className="w-4 h-4" />
                      Run Now
                    </Button>
                  </Flex>
                </Flex>

                <Flex direction="column" gap="2">
                  {task.frequencyCron && (
                    <Flex align="center" gap="2">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-soft)' }} />
                      <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Cron:</Text>
                      {editingTask === task.id ? (
                        <Flex gap="2" align="center">
                          <TextField.Root
                            size="1"
                            value={cronSchedule}
                            onChange={(e) => setCronSchedule(e.target.value)}
                            placeholder={task.frequencyCron}
                            style={{ width: '200px' }}
                          />
                          <Button size="1" onClick={() => handleUpdateSchedule(task.taskType)}>
                            Save
                          </Button>
                          <Button size="1" variant="ghost" onClick={() => setEditingTask(null)}>
                            Cancel
                          </Button>
                        </Flex>
                      ) : (
                        <Flex gap="2" align="center">
                          <Text size="2" style={{ fontFamily: 'monospace' }}>
                            {task.frequencyCron}
                          </Text>
                          <Button
                            size="1"
                            variant="ghost"
                            onClick={() => {
                              setEditingTask(task.id);
                              setCronSchedule(task.frequencyCron || '');
                            }}
                          >
                            Edit
                          </Button>
                        </Flex>
                      )}
                    </Flex>
                  )}
                  {task.frequencySeconds && (
                    <Flex align="center" gap="2">
                      <Clock className="w-4 h-4" style={{ color: 'var(--color-text-soft)' }} />
                      <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Interval:</Text>
                      <Text size="2">{task.frequencySeconds}s</Text>
                    </Flex>
                  )}

                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      {task.lastRunAt && (
                        <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                          Last run: {new Date(task.lastRunAt).toLocaleString()}
                        </Text>
                      )}
                      {task.errorCount > 0 && (
                        <Text size="2" color="red">
                          Errors: {task.errorCount}
                        </Text>
                      )}
                    </Flex>
                    <Flex align="center" gap="2">
                      <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Enabled</Text>
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggleTask(task.id, task.enabled)}
                      />
                    </Flex>
                  </Flex>

                  {task.lastResult && (
                    <Flex direction="column" gap="1">
                      <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Last result:</Text>
                      <Text size="1" style={{ 
                        fontFamily: 'monospace',
                        padding: 'var(--space-2)',
                        background: 'var(--color-surface-soft)',
                        borderRadius: 'var(--radius-2)',
                      }}>
                        {task.lastResult}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            </Card>
          ))
        ) : (
          <Card>
            <Text color="gray">No tasks found</Text>
          </Card>
        )}
      </Flex>

      {/* Recent Task History */}
      <Card>
        <Flex direction="column" gap="3">
          <Heading size="4">Recent Executions</Heading>
          {history && history.length > 0 ? (
            <Flex direction="column" gap="2">
              {history.slice(0, 10).map((run) => (
                <Flex
                  key={run.id}
                  justify="between"
                  align="center"
                  p="3"
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-2)',
                  }}
                >
                  <Flex direction="column" gap="1">
                    <Text weight="medium">{run.task_type.replace('_', ' ').toUpperCase()}</Text>
                    <Text size="2" color="gray">
                      Started: {new Date(run.started_at).toLocaleString()}
                    </Text>
                    {run.result_message && (
                      <Text size="2" color="gray">
                        {run.result_message}
                      </Text>
                    )}
                    {run.error_message && (
                      <Text size="2" color="red">
                        Error: {run.error_message}
                      </Text>
                    )}
                  </Flex>
                  {getStatusBadge(run.status)}
                </Flex>
              ))}
            </Flex>
          ) : (
            <Text color="gray">No execution history</Text>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
