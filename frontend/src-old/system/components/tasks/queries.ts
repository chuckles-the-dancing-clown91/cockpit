/**
 * TanStack Query hooks for Task Scheduler
 */

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type SystemTask = {
  id: number;
  name: string;
  taskType: string;
  component: string;
  frequencyCron: string | null;
  frequencySeconds: number | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: string | null;
  errorCount: number;
};

export type TaskRun = {
  id: number;
  taskId: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  result: string | null;
  errorMessage: string | null;
  durationSecs: number | null;
};

export type RunTaskNowResult = {
  status: string;
  result: string | null;
  errorMessage: string | null;
  message?: string | null;
  finishedAt: string;
};

export type UpdateTaskInput = {
  enabled?: boolean;
  frequencySeconds?: number | null;
  frequencyCron?: string | null;
  name?: string;
};

// ============================================================================
// Task Scheduler Queries
// ============================================================================

export function useListSystemTasks() {
  return useQuery({
    queryKey: ['systemTasks'],
    queryFn: async () => {
      const result = await invoke<SystemTask[]>('list_system_tasks');
      return result;
    },
  });
}

export function useGetTaskHistory(taskId?: number, limit?: number, offset?: number) {
  return useQuery({
    queryKey: ['taskHistory', taskId, limit, offset],
    queryFn: async () => {
      const result = await invoke<TaskRun[]>('get_task_history', {
        taskId,
        limit,
        offset,
      });
      return result;
    },
  });
}

export function useRunTaskNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskType: string) => {
      console.log('[RunTask] Invoking run_system_task_now with taskType:', taskType);
      const result = await invoke<RunTaskNowResult>('run_system_task_now', { taskType });
      console.log('[RunTask] Task execution result:', result);
      return result;
    },
    onSuccess: (result) => {
      console.log('[RunTask] Mutation successful, invalidating queries. Status:', result.status);
      queryClient.invalidateQueries({ queryKey: ['systemTasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskHistory'] });
    },
    onError: (error) => {
      console.error('[RunTask] Mutation failed:', error);
    },
  });
}

export function useUpdateSystemTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskType, input }: { taskType: string; input: UpdateTaskInput }) => {
      const result = await invoke<SystemTask>('update_system_task', { taskType, input });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemTasks'] });
    },
  });
}
