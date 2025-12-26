import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ArrowLeft, ClipboardPaste } from 'lucide-react';
import { Box, Button, Card, Flex, Heading, Text, TextArea, TextField } from '@radix-ui/themes';

import { researchCloseCockpit, researchOpenCockpit, researchSetCockpitBounds } from '@/core/api/tauri';
import { toast } from '@/core/lib/toast';
import { EntityNotesPanel, notesAppendSnippet } from '@/features/notes';
import type { NoteEntityType, WebviewContext } from '@/shared/types';

const SIDEBAR_WIDTH = 'min(400px, 25vw)';

type SelectionPayload = {
  selection?: string;
  title?: string;
  url?: string;
};

type CockpitOpenPayload = {
  url: string;
  title?: string | null;
  referenceId?: number | null;
  ideaId?: number | null;
  writingId?: number | null;
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
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
  if (target.kind === 'reference_note') {
    return { entityType: 'reference', entityId: target.referenceId };
  }
  if (target.kind === 'idea_note') {
    return { entityType: 'idea', entityId: target.ideaId };
  }
  if (target.kind === 'writing_note') {
    return { entityType: 'writing', entityId: target.writingId };
  }
  return null;
}

export function ResearchCockpitPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialContext = useMemo(() => {
    const stateContext = (location.state as WebviewContext | null) ?? null;
    return stateContext ?? contextFromSearch(location.search);
  }, [location.search, location.state]);
  const [context, setContext] = useState<WebviewContext | null>(initialContext);

  const noteTarget = useMemo(() => resolveNoteTarget(context), [context]);
  const noteEntity = useMemo(() => mapNoteTarget(noteTarget), [noteTarget]);

  const [title, setTitle] = useState(context?.title ?? 'Research Cockpit');
  const [currentUrl, setCurrentUrl] = useState(context?.url ?? '');
  const [urlInput, setUrlInput] = useState(context?.url ?? '');
  const [targetUrl, setTargetUrl] = useState(context?.url ?? '');
  const [selectedText, setSelectedText] = useState('');
  const [isAppending, setIsAppending] = useState(false);
  const webviewHostRef = useRef<HTMLDivElement | null>(null);
  const lastBoundsRef = useRef('');
  const windowLabelRef = useRef(getCurrentWindow().label);

  const updateCockpitBounds = useCallback(() => {
    const host = webviewHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width < 1 || height < 1) return;
    const x = Math.max(0, Math.round(rect.left));
    const y = Math.max(0, Math.round(rect.top));
    const key = `${x}:${y}:${width}:${height}`;
    if (key === lastBoundsRef.current) return;
    lastBoundsRef.current = key;
    researchSetCockpitBounds({ x, y, width, height, windowLabel: windowLabelRef.current }).catch(() => {});
  }, []);

  useEffect(() => {
    const host = webviewHostRef.current;
    if (!host) return;
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        updateCockpitBounds();
      });
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [updateCockpitBounds]);

  useEffect(() => {
    if (windowLabelRef.current !== 'detached_cockpit') return;
    getCurrentWindow().maximize().catch(() => {});
  }, []);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  useEffect(() => {
    setTitle(context?.title ?? 'Research Cockpit');
    setCurrentUrl(context?.url ?? '');
    setUrlInput(context?.url ?? '');
    setTargetUrl(context?.url ?? '');
  }, [context?.title, context?.url]);

  useEffect(() => {
    if (!targetUrl) return;
    const normalized = normalizeUrl(targetUrl);
    if (!normalized) {
      toast.error('Enter a valid URL');
      return;
    }
    setCurrentUrl(normalized);
    setUrlInput(normalized);
    researchOpenCockpit({ url: normalized, windowLabel: windowLabelRef.current }).catch((err) => {
      toast.error('Failed to open research cockpit', String(err));
    });
  }, [targetUrl]);

  useEffect(() => {
    return () => {
      researchCloseCockpit().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let unlisten: null | (() => void) = null;
    let unlistenOpen: null | (() => void) = null;
    (async () => {
      try {
        const main = getCurrentWebview();
        unlisten = await main.listen<SelectionPayload>('cockpit-webview-selection', (event) => {
          const payload = event.payload || {};
          if (typeof payload.selection === 'string') setSelectedText(payload.selection);
          if (typeof payload.title === 'string' && payload.title.length) setTitle(payload.title);
          if (typeof payload.url === 'string' && payload.url.length) {
            setCurrentUrl(payload.url);
            setUrlInput(payload.url);
          }
        });
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
      } catch {}
    })();
    return () => {
      try {
        unlisten?.();
        unlistenOpen?.();
      } catch {}
    };
  }, []);

  const handleSubmit = () => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) {
      toast.error('Enter a valid URL');
      return;
    }
    setCurrentUrl(normalized);
    setUrlInput(normalized);
    setTargetUrl(normalized);
  };

  const handleAppendSelection = async () => {
    if (!noteEntity) return;
    const snippetText = selectedText.trim();
    if (!snippetText) return;
    setIsAppending(true);
    try {
      await notesAppendSnippet({
        entityType: noteEntity.entityType,
        entityId: noteEntity.entityId,
        noteType: 'main',
        snippetText,
        sourceUrl: currentUrl || undefined,
        sourceTitle: title || undefined,
      });
      toast.success('Added to notes');
    } catch (err) {
      toast.error('Failed to append selection', String(err));
    } finally {
      setIsAppending(false);
    }
  };

  return (
    <Flex
      direction="row"
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      <Flex
        direction="column"
        style={{
          width: SIDEBAR_WIDTH,
          flex: '0 0 auto',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-soft)',
        }}
      >
        <Flex
          align="center"
          justify="between"
          gap="3"
          style={{
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Flex align="center" gap="2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Heading size="4">{title || 'Research Cockpit'}</Heading>
          </Flex>
        </Flex>

        <Flex direction="column" style={{ flex: 1, minHeight: 0 }}>
          <Box p="3">
            <Flex gap="2" align="center">
              <TextField.Root
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit();
                }}
                placeholder="Paste a URL to load"
                style={{ flex: 1 }}
              />
              <Button onClick={handleSubmit}>Go</Button>
            </Flex>
            {currentUrl ? (
              <Text size="1" color="gray" style={{ marginTop: 'var(--space-2)' }}>
                Viewing: {currentUrl}
              </Text>
            ) : null}
          </Box>

          <Flex
            direction="column"
            gap="3"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: 'var(--space-3)',
            }}
          >
            <Card>
              <Flex direction="column" gap="2">
                <Heading size="3">Selection</Heading>
                <TextArea
                  value={selectedText}
                  onChange={(event) => setSelectedText(event.target.value)}
                  rows={6}
                  placeholder="Select text in the research pane to capture it here."
                />
                <Flex justify="end">
                  <Button
                    variant="soft"
                    onClick={handleAppendSelection}
                    disabled={!noteEntity || !selectedText.trim() || isAppending}
                  >
                    <ClipboardPaste size={16} />
                    Add to notes
                  </Button>
                </Flex>
              </Flex>
            </Card>

            {noteEntity ? (
              <EntityNotesPanel
                entityType={noteEntity.entityType}
                entityId={noteEntity.entityId}
                title="Notes"
                placeholder="Write notes for this source..."
              />
            ) : (
              <Card>
                <Flex direction="column" gap="2">
                  <Heading size="3">Notes</Heading>
                  <Text size="2" color="gray">
                    No note target is linked. Open this cockpit from an idea, reference, or writing to save notes.
                  </Text>
                </Flex>
              </Card>
            )}
          </Flex>
        </Flex>
      </Flex>
      <Box
        ref={webviewHostRef}
        style={{
          flex: 1,
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          backgroundColor: 'transparent',
        }}
      />
    </Flex>
  );
}
