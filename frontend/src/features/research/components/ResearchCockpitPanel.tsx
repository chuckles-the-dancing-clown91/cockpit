import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Webview, getCurrentWebview } from '@tauri-apps/api/webview';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { ArrowLeft, ArrowRight, ClipboardPaste, Plus, RefreshCcw, X } from 'lucide-react';
import { Box, Button, Card, Flex, Heading, Text, TextArea, TextField } from '@radix-ui/themes';

import { toast } from '@/core/lib/toast';
import { EntityNotesPanel, notesAppendSnippet } from '@/features/notes';
import type { NoteEntityType, WebviewContext } from '@/shared/types';

const NOTES_PANEL_WIDTH = 'min(520px, 32vw)';
const MAX_PANES = 3;

const PANE_LABELS = [
  'cockpit/research-pane-1',
  'cockpit/research-pane-2',
  'cockpit/research-pane-3',
] as const;

type CockpitOpenPayload = {
  url: string;
  title?: string | null;
  referenceId?: number | null;
  ideaId?: number | null;
  writingId?: number | null;
};

type PaneState = {
  label: (typeof PANE_LABELS)[number];
  title: string;
  currentUrl: string;
};

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

async function webviewNavigate(wv: Webview, url: string) {
  try {
    // @ts-ignore
    if (wv.navigate) return await wv.navigate(url);
    // @ts-ignore
    if (wv.setUrl) return await wv.setUrl(url);
  } catch {
    // ignore
  }
}

async function webviewBack(wv: Webview) {
  try {
    // @ts-ignore
    if (wv.goBack) return await wv.goBack();
  } catch {}
}

async function webviewForward(wv: Webview) {
  try {
    // @ts-ignore
    if (wv.goForward) return await wv.goForward();
  } catch {}
}

async function webviewReload(wv: Webview, fallbackUrl?: string) {
  try {
    // @ts-ignore
    if (wv.reload) return await wv.reload();
  } catch {}
  if (fallbackUrl) await webviewNavigate(wv, fallbackUrl);
}

async function ensureChildWebview(opts: { label: string; host: HTMLDivElement; url: string }) {
  const win = getCurrentWindow();
  const { label, host } = opts;
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const x = Math.round(rect.left);
  const y = Math.round(rect.top);

  const targetUrl = normalizeUrl(opts.url) ?? 'https://duckduckgo.com/';

  let wv = await Webview.getByLabel(label);
  if (!wv) {
    wv = new Webview(win, label, {
      url: targetUrl,
      x,
      y,
      width,
      height,
    });

    wv.once('tauri://created', async () => {
      try {
        await wv!.setPosition(new LogicalPosition(x, y));
        await wv!.setSize(new LogicalSize(width, height));
        await wv!.show();
      } catch {}
    });

    wv.once('tauri://error', () => {
      // ignore, UI will just show empty host
    });
  } else {
    try {
      await wv.setPosition(new LogicalPosition(x, y));
      await wv.setSize(new LogicalSize(width, height));
      await wv.show();
    } catch {}
  }

  return wv;
}

async function syncWebviewBounds(label: string, host: HTMLDivElement) {
  const wv = await Webview.getByLabel(label);
  if (!wv) return;
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const x = Math.round(rect.left);
  const y = Math.round(rect.top);
  try {
    await wv.setPosition(new LogicalPosition(x, y));
    await wv.setSize(new LogicalSize(width, height));
    await wv.show();
  } catch {
    // ignore
  }
}

async function closeWebviewByLabel(label: string) {
  try {
    const wv = await Webview.getByLabel(label);
    await wv?.close();
  } catch {
    // ignore
  }
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

  const [paneCount, setPaneCount] = useState<number>(1);
  const [activePane, setActivePane] = useState<number>(0);

  const [panes, setPanes] = useState<PaneState[]>(() => {
    const firstUrl = initialContext?.url ?? 'https://duckduckgo.com/';
    return [
      { label: PANE_LABELS[0], title: initialContext?.title ?? 'Pane 1', currentUrl: firstUrl },
      { label: PANE_LABELS[1], title: 'Pane 2', currentUrl: 'https://duckduckgo.com/' },
      { label: PANE_LABELS[2], title: 'Pane 3', currentUrl: 'https://duckduckgo.com/' },
    ];
  });

  const [selectedText, setSelectedText] = useState('');
  const [isAppending, setIsAppending] = useState(false);
  const [urlInput, setUrlInput] = useState(panes[0]?.currentUrl ?? '');

  const hostRefs = [
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
  ];

  // Track last URL we navigated each child webview to, so resize/layout effects don't constantly re-navigate.
  const lastUrlsRef = useRef<Record<string, string>>({});

  // On route/context change, refresh pane 1 (primary) to the new URL.
  useEffect(() => {
    setContext(initialContext);
    if (!initialContext?.url) return;
    setActivePane(0);
    setPanes((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        title: initialContext.title ?? next[0].title,
        currentUrl: initialContext.url,
      };
      return next;
    });
    setUrlInput(initialContext.url);
  }, [initialContext]);

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
          setActivePane(0);
          setPanes((prev) => {
            const next = [...prev];
            next[0] = {
              ...next[0],
              title: payload.title ?? next[0].title,
              currentUrl: payload.url,
            };
            return next;
          });
          setUrlInput(payload.url);
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

  // Create/attach webviews for visible panes.
  useEffect(() => {
    let alive = true;
    let raf: number | null = null;

    const boot = async () => {
      if (!alive) return;

      // Wait for pane hosts to have real dimensions.
      for (let i = 0; i < paneCount; i += 1) {
        const host = hostRefs[i].current;
        if (!host) {
          raf = requestAnimationFrame(boot);
          return;
        }
        const rect = host.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) {
          raf = requestAnimationFrame(boot);
          return;
        }
      }

      // Close any panes beyond paneCount (defensive).
      for (let i = paneCount; i < MAX_PANES; i += 1) {
        await closeWebviewByLabel(PANE_LABELS[i]);
        delete lastUrlsRef.current[PANE_LABELS[i]];
      }

      // Ensure all visible pane webviews exist and are positioned.
      for (let i = 0; i < paneCount; i += 1) {
        const host = hostRefs[i].current;
        if (!host) continue;
        const label = PANE_LABELS[i];
        const wv = await ensureChildWebview({ label, host, url: panes[i].currentUrl });
        const wanted = panes[i].currentUrl;
        if (lastUrlsRef.current[label] !== wanted) {
          lastUrlsRef.current[label] = wanted;
          await webviewNavigate(wv, wanted);
        }
      }
    };

    raf = requestAnimationFrame(boot);
    return () => {
      alive = false;
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [paneCount, panes]);

  // Keep child webviews aligned with their host divs.
  useEffect(() => {
    const observers: ResizeObserver[] = [];

    const schedule = () => {
      for (let i = 0; i < paneCount; i += 1) {
        const host = hostRefs[i].current;
        if (!host) continue;
        syncWebviewBounds(PANE_LABELS[i], host).catch(() => {});
      }
    };

    for (let i = 0; i < paneCount; i += 1) {
      const host = hostRefs[i].current;
      if (!host) continue;
      const ro = new ResizeObserver(schedule);
      ro.observe(host);
      observers.push(ro);
    }

    schedule();
    window.addEventListener('resize', schedule);
    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('resize', schedule);
    };
  }, [paneCount]);

  // Cleanup on unmount: close all cockpit webviews.
  useEffect(() => {
    return () => {
      PANE_LABELS.forEach((label) => closeWebviewByLabel(label));
    };
  }, []);

  const active = panes[activePane];

  const setActivePaneSafe = useCallback(
    async (idx: number) => {
      const nextIdx = Math.max(0, Math.min(idx, paneCount - 1));
      setActivePane(nextIdx);
      setUrlInput(panes[nextIdx]?.currentUrl ?? '');
      try {
        const wv = await Webview.getByLabel(PANE_LABELS[nextIdx]);
        await wv?.setFocus();
      } catch {}
    },
    [paneCount, panes],
  );

  const handleSubmitUrl = useCallback(async () => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) {
      toast.error('Enter a valid URL');
      return;
    }

    setPanes((prev) => {
      const next = [...prev];
      next[activePane] = { ...next[activePane], currentUrl: normalized };
      return next;
    });

    try {
      const wv = await Webview.getByLabel(PANE_LABELS[activePane]);
      if (!wv) return;
      lastUrlsRef.current[PANE_LABELS[activePane]] = normalized;
      await webviewNavigate(wv, normalized);
      await wv.setFocus();
    } catch (err) {
      toast.error('Failed to navigate', String(err));
    }
  }, [activePane, urlInput]);

  const handlePasteSelection = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) setSelectedText(text.trim());
    } catch {
      toast.error('Clipboard unavailable');
    }
  }, []);

  const handleAppendSelection = useCallback(async () => {
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
        sourceUrl: active?.currentUrl || undefined,
        sourceTitle: active?.title || undefined,
      });
      toast.success('Added to notes');
      setSelectedText('');
    } catch (err) {
      toast.error('Failed to append selection', String(err));
    } finally {
      setIsAppending(false);
    }
  }, [active?.currentUrl, active?.title, noteEntity, selectedText]);

  const addPane = useCallback(() => {
    setPaneCount((n) => Math.min(MAX_PANES, n + 1));
  }, []);

  const closeLastPane = useCallback(() => {
    setPaneCount((n) => Math.max(1, n - 1));
  }, []);

  // Clamp active pane whenever pane count changes.
  useEffect(() => {
    if (activePane <= paneCount - 1) return;
    setActivePane(Math.max(0, paneCount - 1));
    setUrlInput(panes[Math.max(0, paneCount - 1)]?.currentUrl ?? '');
  }, [activePane, paneCount, panes]);

  // When removing panes, close the now-nonexistent webview.
  useEffect(() => {
    (async () => {
      for (let i = paneCount; i < MAX_PANES; i += 1) {
        await closeWebviewByLabel(PANE_LABELS[i]);
      }
    })();
  }, [paneCount]);

  const navBack = useCallback(async () => {
    try {
      const wv = await Webview.getByLabel(PANE_LABELS[activePane]);
      if (!wv) return;
      await webviewBack(wv);
    } catch {}
  }, [activePane]);

  const navForward = useCallback(async () => {
    try {
      const wv = await Webview.getByLabel(PANE_LABELS[activePane]);
      if (!wv) return;
      await webviewForward(wv);
    } catch {}
  }, [activePane]);

  const navReload = useCallback(async () => {
    try {
      const wv = await Webview.getByLabel(PANE_LABELS[activePane]);
      if (!wv) return;
      await webviewReload(wv, panes[activePane]?.currentUrl);
    } catch {}
  }, [activePane, panes]);

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
      {/* LEFT: webview panes only */}
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
        {Array.from({ length: paneCount }).map((_, idx) => (
          <Box
            key={PANE_LABELS[idx]}
            ref={hostRefs[idx]}
            onMouseDown={() => setActivePaneSafe(idx)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              position: 'relative',
              borderRight: idx < paneCount - 1 ? '1px solid var(--color-border)' : undefined,
              outline: idx === activePane ? '2px solid var(--accent-9)' : undefined,
              outlineOffset: -2,
            }}
          />
        ))}
      </Flex>

      {/* RIGHT: cockpit controls + notes */}
      <Flex
        direction="column"
        style={{
          width: NOTES_PANEL_WIDTH,
          flex: '0 0 auto',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          borderLeft: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-soft)',
        }}
      >
        <Flex
          align="center"
          justify="between"
          gap="2"
          style={{
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Heading size="4" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {context?.title || active?.title || 'Research Cockpit'}
          </Heading>
        </Flex>

        <Flex
          direction="column"
          gap="2"
          style={{
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-soft)',
          }}
        >
          <Flex gap="2" align="center" wrap="wrap">
            {Array.from({ length: paneCount }).map((_, idx) => (
              <Button
                key={PANE_LABELS[idx]}
                variant={idx === activePane ? 'solid' : 'soft'}
                onClick={() => setActivePaneSafe(idx)}
                style={{ flex: '0 0 auto' }}
              >
                {idx + 1}
              </Button>
            ))}
            <Button variant="soft" onClick={addPane} disabled={paneCount >= MAX_PANES}>
              <Plus size={16} />
              Pane
            </Button>
            <Button variant="soft" onClick={closeLastPane} disabled={paneCount <= 1}>
              <X size={16} />
              Close
            </Button>
          </Flex>

          <Flex gap="2" align="center">
            <Button variant="soft" onClick={navBack} title="Back">
              <ArrowLeft size={16} />
            </Button>
            <Button variant="soft" onClick={navForward} title="Forward">
              <ArrowRight size={16} />
            </Button>
            <Button variant="soft" onClick={navReload} title="Reload">
              <RefreshCcw size={16} />
            </Button>
          </Flex>
        </Flex>

        <Box style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
          <Flex gap="2" align="center">
            <TextField.Root
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSubmitUrl();
              }}
              placeholder="Paste a URL to load"
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button onClick={handleSubmitUrl}>Go</Button>
          </Flex>
          {active?.currentUrl ? (
            <Text size="1" color="gray" style={{ marginTop: 'var(--space-2)' }}>
              Viewing (Pane {activePane + 1}): {active.currentUrl}
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
              <Text size="1" color="gray">
                Copy text from a page and paste it here if the site blocks selection capture.
              </Text>
              <TextArea
                value={selectedText}
                onChange={(event) => setSelectedText(event.target.value)}
                rows={6}
                placeholder="Captured selection appears here..."
              />
              <Flex gap="2" justify="between" align="center">
                <Button variant="soft" onClick={handlePasteSelection}>
                  <ClipboardPaste size={16} />
                  Paste
                </Button>
                <Button
                  variant="solid"
                  onClick={handleAppendSelection}
                  disabled={!noteEntity || !selectedText.trim() || isAppending}
                >
                  Add to notes
                </Button>
              </Flex>
              {!noteEntity ? (
                <Text size="1" color="gray">
                  No note target is linked. Open this cockpit from an idea, reference, or writing to save notes.
                </Text>
              ) : null}
            </Flex>
          </Card>

          {noteEntity ? (
            <EntityNotesPanel
              entityType={noteEntity.entityType}
              entityId={noteEntity.entityId}
              title="Notes"
              placeholder="Write notes for this item..."
            />
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  );
}
