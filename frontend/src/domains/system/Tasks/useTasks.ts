import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSystemTasks,
  getTaskHistory,
  runSystemTaskNow,
  updateSystemTask,
  type UpdateTaskInput,
} from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';

export function useTasks() {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: listSystemTasks,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.tasks.history(),
    queryFn: () => getTaskHistory({ limit: 50 }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const runTask = useMutation({
    mutationFn: runSystemTaskNow,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.history() });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to run task: ${error.message}`);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskType, input }: { taskType: string; input: UpdateTaskInput }) =>
      updateSystemTask(taskType, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  return {
    tasks: tasksQuery.data,
    isLoadingTasks: tasksQuery.isLoading,
    history: historyQuery.data,
    isLoadingHistory: historyQuery.isLoading,
    runTask,
    updateTask,
  };
}
