import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { ArrowLeft } from 'lucide-react';
import { Box, Button, Flex, Heading, Text } from '@radix-ui/themes';

import { researchOpenCockpit, researchSetCockpitBounds, type ResearchCockpitPane } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import type { NoteEntityType, WebviewContext } from '@/shared/types';

type CockpitOpenPayload = {
  url: string;
  title?: string | null;
  referenceId?: number | null;
  ideaId?: number | null;
  writingId?: number | null;
};

const PANE_SEQUENCE: ResearchCockpitPane[] = ['references', 'notes'];

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If the user already provided a scheme (http:, https:, tauri:, file:, about:, etc) keep it.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function contextFromSearch(search: string): WebviewContext | null {
  const params = new URLSearchParams(search);
  const url = params.get('url');
  if (!url) return null;
  return {
    url,
    title: params.get('title') ?? undefined,
    referenceId: parseOptionalNumber(params.get('referenceId')),
    ideaId: parseOptionalNumber(params.get('ideaId')),
    writingId: parseOptionalNumber(params.get('writingId')),
  };
}

function resolveNoteTarget(context: WebviewContext | null) {
  if (!context) return null;
  if (context.noteTarget) return context.noteTarget;
  if (context.referenceId) {
    return { kind: 'reference_note', referenceId: context.referenceId, ideaId: context.ideaId };
  }
  if (context.ideaId) {
    return { kind: 'idea_note', ideaId: context.ideaId };
  }
  if (context.writingId) {
    return { kind: 'writing_note', writingId: context.writingId };
  }
  return null;
}

function mapNoteTarget(
  target: ReturnType<typeof resolveNoteTarget>
): { entityType: NoteEntityType; entityId: number } | null {
  if (!target) return null;
  if (target.kind === 'reference_note') return { entityType: 'reference', entityId: target.referenceId };
  if (target.kind === 'idea_note') return { entityType: 'idea', entityId: target.ideaId };
  if (target.kind === 'writing_note') return { entityType: 'writing', entityId: target.writingId };
  return null;
}

function buildNotesUrl(
  mappedTarget: { entityType: NoteEntityType; entityId: number } | null,
  title?: string,
): string | null {
  if (!mappedTarget) return null;
  const base = new URL('/notes/cockpit', window.location.origin);
  base.searchParams.set('entityType', mappedTarget.entityType);
  base.searchParams.set('entityId', String(mappedTarget.entityId));
  if (title) base.searchParams.set('title', title);
  return base.toString();
}

function boundsFromHost(host: HTMLDivElement) {
  const rect = host.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

export function ResearchCockpitPanel() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialContext = useMemo(() => {
    const stateContext = (location.state as WebviewContext | null) ?? null;
    return stateContext ?? contextFromSearch(location.search);
  }, [location.search, location.state]);

  const [context, setContext] = useState<WebviewContext | null>(initialContext);
  const noteTarget = useMemo(() => mapNoteTarget(resolveNoteTarget(context)), [context]);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  const referencesUrl = useMemo(() => {
    const normalized = normalizeUrl(context?.url ?? '');
    return normalized ?? 'https://duckduckgo.com/';
  }, [context?.url]);

  const notesUrl = useMemo(() => buildNotesUrl(noteTarget, context?.title), [context?.title, noteTarget]);

  const hostRefs: Record<ResearchCockpitPane, RefObject<HTMLDivElement>> = {
    references: useRef<HTMLDivElement | null>(null),
    notes: useRef<HTMLDivElement | null>(null),
  };

  const lastOpenedUrlsRef = useRef<Partial<Record<ResearchCockpitPane, string>>>({});

  // Listen for cockpit open events (when user opens cockpit from another screen).
  useEffect(() => {
    let unlistenOpen: null | (() => void) = null;
    (async () => {
      try {
        const main = getCurrentWebview();
        unlistenOpen = await main.listen<CockpitOpenPayload>('research-cockpit-open', (event) => {
          const payload = event.payload;
          if (!payload?.url) return;
          setContext({
            url: payload.url,
            title: payload.title ?? undefined,
            referenceId: payload.referenceId ?? undefined,
            ideaId: payload.ideaId ?? undefined,
            writingId: payload.writingId ?? undefined,
          });
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      try {
        unlistenOpen?.();
      } catch {}
    };
  }, []);

  const openPaneUrl = useCallback(
    async (pane: ResearchCockpitPane, url: string) => {
      if (!url) return;
      if (lastOpenedUrlsRef.current[pane] === url) return;
      lastOpenedUrlsRef.current[pane] = url;
      try {
        await researchOpenCockpit({ pane, url });
      } catch (err) {
        toast.error(`Failed to open ${pane} pane`, String(err));
      }
    },
    [],
  );

  // Navigate panes when context changes.
  useEffect(() => {
    openPaneUrl('references', referencesUrl);
  }, [openPaneUrl, referencesUrl]);

  useEffect(() => {
    if (!notesUrl) return;
    openPaneUrl('notes', notesUrl);
  }, [notesUrl, openPaneUrl]);

  const syncPaneBounds = useCallback(
    (pane: ResearchCockpitPane) => {
      const host = hostRefs[pane].current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return;
      researchSetCockpitBounds({
        pane,
        ...boundsFromHost(host),
      }).catch(() => {});
    },
    [hostRefs],
  );

  // Forward host bounds to backend (initial + resize).
  useEffect(() => {
    let raf: number | null = null;
    const scheduleSync = () => {
      PANE_SEQUENCE.forEach((pane) => syncPaneBounds(pane));
    };

    raf = requestAnimationFrame(scheduleSync);

    const observers = PANE_SEQUENCE.map((pane) => {
      const host = hostRefs[pane].current;
      if (!host) return null;
      const ro = new ResizeObserver(scheduleSync);
      ro.observe(host);
      return ro;
    }).filter(Boolean) as ResizeObserver[];

    window.addEventListener('resize', scheduleSync);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      observers.forEach((ro) => ro.disconnect());
      window.removeEventListener('resize', scheduleSync);
    };
  }, [syncPaneBounds]);

  return (
    <Flex
      direction="row"
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <Flex
        align="center"
        justify="between"
        style={{
          padding: 'var(--space-3)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          width: '100%',
        }}
      >
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <Flex align="center" gap="3" style={{ minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
          <Heading
            size="4"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}
          >
            {context?.title || 'Research Cockpit'}
          </Heading>
          {!notesUrl ? (
            <Text size="1" color="gray" style={{ textAlign: 'right' }}>
              Open from a reference to load notes alongside the page.
            </Text>
          ) : null}
        </Flex>
      </Flex>

      <Flex
        direction="row"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <Box
          ref={hostRefs.references}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
          title={referencesUrl}
        />
        <Box
          ref={hostRefs.notes}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            backgroundColor: 'var(--color-surface-soft)',
          }}
          title={notesUrl ?? undefined}
        >
          {!notesUrl ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap="2"
              style={{ position: 'absolute', inset: 0, padding: 'var(--space-3)' }}
            >
              <Heading size="3">No linked notes</Heading>
              <Text color="gray" align="center">
                Launch Research Cockpit from a reference or idea to view its notes here.
              </Text>
            </Flex>
          ) : null}
        </Box>
      </Flex>
    </Flex>
  );
}
