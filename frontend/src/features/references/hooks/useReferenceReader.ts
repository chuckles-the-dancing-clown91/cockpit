import { useQuery } from '@tanstack/react-query';
import { getReferenceReaderSnapshot } from '@/core/api/tauri';
import { queryKeys } from '@/shared/queryKeys';

export function useReferenceReader(referenceId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.references.reader(referenceId!),
    queryFn: () => getReferenceReaderSnapshot(referenceId!),
    enabled: Boolean(referenceId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
