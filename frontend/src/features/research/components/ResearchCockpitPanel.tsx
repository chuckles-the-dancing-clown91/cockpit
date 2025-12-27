import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';

import { CockpitLayout } from './cockpit/CockpitLayout';
import { CockpitNotesPanel } from './cockpit/CockpitNotesPanel';
import { CockpitWebviewPane } from './cockpit/CockpitWebviewPane';
import type { NoteEntityType, WebviewContext } from '@/shared/types';

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

  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    setUrlInput(referencesUrl);
  }, [referencesUrl]);

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

  const submitUrl = useCallback(() => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) return;
    setContext((prev) => {
      if (prev) {
        if (prev.url === normalized) return prev;
        return { ...prev, url: normalized };
      }
      return { url: normalized };
    });
  }, [urlInput]);
  return (
    <CockpitLayout
      title={context?.title || 'Research Cockpit'}
      urlInput={urlInput}
      onUrlChange={setUrlInput}
      onSubmitUrl={submitUrl}
      onBack={() => navigate(-1)}
      left={
        <CockpitWebviewPane
          pane="references"
          url={referencesUrl}
          title={context?.title ?? undefined}
          referenceId={context?.referenceId ?? undefined}
          ideaId={context?.ideaId ?? undefined}
          writingId={context?.writingId ?? undefined}
        />
      }
      right={<CockpitNotesPanel noteTarget={noteTarget} />}
    />
  );
}
