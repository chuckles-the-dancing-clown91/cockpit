import { useCallback, useMemo, useState } from 'react';

export type CockpitHistoryEntry = {
  referenceId: number;
  snapshotId: number;
  title?: string;
  url?: string;
};

export function useCockpitHistory(initial?: CockpitHistoryEntry | null) {
  const [entries, setEntries] = useState<CockpitHistoryEntry[]>(() =>
    initial ? [initial] : []
  );
  const [index, setIndex] = useState(initial ? 0 : -1);

  const current = useMemo(() => (index >= 0 ? entries[index] : null), [entries, index]);

  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < entries.length - 1;

  const push = useCallback((entry: CockpitHistoryEntry) => {
    setEntries((prev) => {
      const next = prev.slice(0, index + 1);
      next.push(entry);
      return next;
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  const goBack = useCallback(() => {
    if (!canGoBack) return null;
    setIndex((prev) => prev - 1);
    return entries[index - 1] ?? null;
  }, [canGoBack, entries, index]);

  const goForward = useCallback(() => {
    if (!canGoForward) return null;
    setIndex((prev) => prev + 1);
    return entries[index + 1] ?? null;
  }, [canGoForward, entries, index]);

  return {
    current,
    canGoBack,
    canGoForward,
    push,
    goBack,
    goForward,
  };
}
