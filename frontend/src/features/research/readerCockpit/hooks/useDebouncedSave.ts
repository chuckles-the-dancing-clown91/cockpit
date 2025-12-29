import { useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type UseDebouncedSaveArgs<T> = {
  value: T;
  enabled: boolean;
  delay?: number;
  onSave: (value: T) => Promise<void>;
};

export function useDebouncedSave<T>({
  value,
  enabled,
  delay = 500,
  onSave,
}: UseDebouncedSaveArgs<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const firstRun = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setStatus('saving');
    const handle = window.setTimeout(async () => {
      try {
        await onSave(value);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, enabled, onSave, value]);

  return { status, setStatus };
}
