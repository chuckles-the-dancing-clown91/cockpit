import { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@radix-ui/themes';

import { researchOpenCockpit, researchSetCockpitBounds, type ResearchCockpitPane } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';

type CockpitWebviewPaneProps = {
  pane: ResearchCockpitPane;
  url: string;
  title?: string;
  referenceId?: number;
  ideaId?: number;
  writingId?: number;
};

function boundsFromHost(host: HTMLDivElement) {
  const rect = host.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function CockpitWebviewPane({
  pane,
  url,
  title,
  referenceId,
  ideaId,
  writingId,
}: CockpitWebviewPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastOpenedUrlRef = useRef<string | null>(null);
  const [boundsReady, setBoundsReady] = useState(false);

  const syncBounds = useCallback(() => {
    const host = hostRef.current;
    if (!host) return false;
    const bounds = boundsFromHost(host);
    if (bounds.width <= 1 || bounds.height <= 1) return false;
    researchSetCockpitBounds({ pane, ...bounds }).catch(() => {});
    return true;
  }, [pane]);

  useEffect(() => {
    let raf: number | null = null;
    let alive = true;
    const scheduleSync = () => {
      const ready = syncBounds();
      if (ready && !boundsReady) setBoundsReady(true);
      return ready;
    };

    const tick = () => {
      if (!alive) return;
      const ready = scheduleSync();
      if (!ready) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    const host = hostRef.current;
    const ro = host
      ? new ResizeObserver(() => {
          scheduleSync();
        })
      : null;
    if (host && ro) ro.observe(host);

    const onResize = () => {
      scheduleSync();
    };

    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      if (raf !== null) cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [boundsReady, syncBounds]);

  useEffect(() => {
    if (!url) return;
    if (!boundsReady) return;
    if (lastOpenedUrlRef.current === url) return;
    lastOpenedUrlRef.current = url;
    researchOpenCockpit({
      pane,
      url,
      title,
      referenceId,
      ideaId,
      writingId,
    }).catch((err) => {
      toast.error(`Failed to open ${pane} pane`, String(err));
    });
  }, [boundsReady, ideaId, pane, referenceId, title, url, writingId]);

  return (
    <Box
      style={{
        width: '75%',
        minWidth: 0,
        minHeight: 0,
        position: 'relative',
        borderRight: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
      title={url}
    >
      <Box
        ref={hostRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
        }}
      />
    </Box>
  );
}
