import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex } from '@radix-ui/themes';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentWebview } from '@tauri-apps/api/webview';

import { ReaderCockpitTopBar } from './ReaderCockpitTopBar';
import { ReaderPane } from './ReaderPane';
import { RightPanelTabs } from './RightPanelTabs';
import { NotesTab } from './tabs/NotesTab';
import { MetadataTab } from './tabs/MetadataTab';
import { ClipsTab } from './tabs/ClipsTab';
import { useCockpitHistory } from './hooks/useCockpitHistory';
import { buildCitation } from './utils/citation';
import { toast } from '@/core/lib/toast';
import {
  openLivePageWindow,
  readerClipCreate,
  readerClipDelete,
  readerClipsList,
  readerFetch,
  readerReferenceGet,
  readerReferenceUpdate,
  readerRefresh,
  readerSnapshotGet,
  readerSnapshotsList,
} from '@/core/api/tauri';
import { notesAppendSnippet } from '@/features/notes/api/notes';
import { queryKeys } from '@/shared/queryKeys';
import type { ReaderClip, ReaderResult, ReaderSnapshot } from '@/shared/types';

const SPLIT_STORAGE_KEY = 'reader-cockpit-split';
const TAB_STORAGE_KEY = 'reader-cockpit-tab';
const LAST_REFERENCE_KEY = 'reader-cockpit-last-reference';

type CockpitOpenPayload = {
  url: string;
  title?: string | null;
  referenceId?: number | null;
  ideaId?: number | null;
  writingId?: number | null;
};

function parseOptionalNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function ReaderCockpitPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialUrl = params.get('url') ?? '';
  const initialTitle = params.get('title') ?? undefined;
  const initialReferenceId = parseOptionalNumber(params.get('referenceId'));
  const initialIdeaId = parseOptionalNumber(params.get('ideaId'));
  const initialWritingId = parseOptionalNumber(params.get('writingId'));

  const [activeReferenceId, setActiveReferenceId] = useState<number | null>(initialReferenceId);
  const [activeSnapshotId, setActiveSnapshotId] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [contextTitle, setContextTitle] = useState<string | undefined>(initialTitle);
  const [contextIdeaId, setContextIdeaId] = useState<number | null>(initialIdeaId);
  const [contextWritingId, setContextWritingId] = useState<number | null>(initialWritingId);
  const [selectionText, setSelectionText] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(TAB_STORAGE_KEY) || 'notes';
  });
  const [splitRatio, setSplitRatio] = useState(() => {
    const stored = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
    return Number.isNaN(stored) ? 0.65 : stored;
  });

  const history = useCockpitHistory(
    activeReferenceId && activeSnapshotId
      ? { referenceId: activeReferenceId, snapshotId: activeSnapshotId, title: contextTitle, url: urlInput }
      : null
  );

  const referenceQuery = useQuery({
    queryKey: activeReferenceId ? queryKeys.reader.reference(activeReferenceId) : ['reader', 'reference', 'none'],
    queryFn: () => readerReferenceGet(activeReferenceId!),
    enabled: Boolean(activeReferenceId),
  });

  const snapshotsQuery = useQuery({
    queryKey: activeReferenceId ? queryKeys.reader.snapshots(activeReferenceId) : ['reader', 'snapshots', 'none'],
    queryFn: () => readerSnapshotsList(activeReferenceId!),
    enabled: Boolean(activeReferenceId),
  });

  const snapshotQuery = useQuery({
    queryKey: activeSnapshotId ? queryKeys.reader.snapshot(activeSnapshotId) : ['reader', 'snapshot', 'none'],
    queryFn: () => readerSnapshotGet(activeSnapshotId!),
    enabled: Boolean(activeSnapshotId),
  });

  const clipsQuery = useQuery({
    queryKey: activeReferenceId ? queryKeys.reader.clips(activeReferenceId) : ['reader', 'clips', 'none'],
    queryFn: () => readerClipsList(activeReferenceId!),
    enabled: Boolean(activeReferenceId),
  });

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(SPLIT_STORAGE_KEY, String(splitRatio));
  }, [splitRatio]);

  useEffect(() => {
    if (activeReferenceId) {
      localStorage.setItem(LAST_REFERENCE_KEY, String(activeReferenceId));
    }
  }, [activeReferenceId]);

  useEffect(() => {
    if (referenceQuery.data?.url) {
      setUrlInput(referenceQuery.data.url);
    }
  }, [referenceQuery.data?.url]);

  const handleReaderResult = useCallback((result: ReaderResult, pushHistory: boolean) => {
    setActiveReferenceId(result.referenceId);
    setActiveSnapshotId(result.snapshotId);
    setUrlInput(result.finalUrl);
    setContextTitle(result.title);
    queryClient.invalidateQueries({ queryKey: queryKeys.reader.snapshots(result.referenceId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.reader.reference(result.referenceId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.reader.clips(result.referenceId) });
    queryClient.setQueryData(queryKeys.reader.snapshot(result.snapshotId), {
      id: result.snapshotId,
      referenceId: result.referenceId,
      fetchedAt: new Date().toISOString(),
      title: result.title,
      excerpt: result.excerpt ?? null,
      finalUrl: result.finalUrl,
      contentMd: result.contentMd,
      wordCount: result.wordCount ?? null,
      readingTimeMinutes: result.readingTimeMinutes ?? null,
    } satisfies ReaderSnapshot);
    if (pushHistory) {
      history.push({
        referenceId: result.referenceId,
        snapshotId: result.snapshotId,
        title: result.title,
        url: result.finalUrl,
      });
    }
  }, [history, queryClient]);

  const handleFetch = useCallback(async (
    url: string,
    title?: string,
    overrides?: { referenceId?: number | null; ideaId?: number | null; writingId?: number | null }
  ) => {
    try {
      const result = await readerFetch({
        url,
        title,
        referenceId: overrides?.referenceId ?? undefined,
        ideaId: overrides?.ideaId ?? contextIdeaId ?? undefined,
        writingId: overrides?.writingId ?? contextWritingId ?? undefined,
      });
      handleReaderResult(result, true);
    } catch (err) {
      toast.error('Failed to fetch reader snapshot', String(err));
    }
  }, [contextIdeaId, contextWritingId, handleReaderResult]);

  const handleRefresh = useCallback(async () => {
    if (!activeReferenceId) return;
    try {
      const result = await readerRefresh(activeReferenceId);
      handleReaderResult(result, true);
    } catch (err) {
      toast.error('Failed to refresh reader snapshot', String(err));
    }
  }, [activeReferenceId, handleReaderResult]);

  useEffect(() => {
    if (!initialUrl || initialReferenceId) return;
    if (activeReferenceId) return;
    handleFetch(initialUrl, initialTitle);
  }, [activeReferenceId, handleFetch, initialReferenceId, initialTitle, initialUrl]);

  useEffect(() => {
    let unlistenOpen: null | (() => void) = null;
    (async () => {
      try {
        const webview = getCurrentWebview();
        unlistenOpen = await webview.listen<CockpitOpenPayload>('research-cockpit-open', (event) => {
          const payload = event.payload;
          if (!payload?.url) return;
          setContextTitle(payload.title ?? undefined);
          setContextIdeaId(payload.ideaId ?? null);
          setContextWritingId(payload.writingId ?? null);
          setUrlInput(payload.url);
          setActiveSnapshotId(null);
          if (payload.referenceId) {
            setActiveReferenceId(payload.referenceId);
            return;
          }
          handleFetch(payload.url, payload.title ?? undefined, {
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
  }, [handleFetch]);

  useEffect(() => {
    if (!activeReferenceId) return;
    if (activeSnapshotId) return;
    const snapshots = snapshotsQuery.data ?? [];
    if (snapshots.length > 0) {
      setActiveSnapshotId(snapshots[0].id);
    } else if (!snapshotsQuery.isLoading) {
      readerRefresh(activeReferenceId)
        .then((result) => handleReaderResult(result, true))
        .catch(() => {});
    }
  }, [activeReferenceId, activeSnapshotId, handleReaderResult, snapshotsQuery.data, snapshotsQuery.isLoading]);

  const handleSubmitUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    handleFetch(trimmed, undefined);
  }, [handleFetch, urlInput]);

  const handleSelectSnapshot = useCallback((snapshotId: number) => {
    setActiveSnapshotId(snapshotId);
    if (activeReferenceId) {
      history.push({ referenceId: activeReferenceId, snapshotId });
    }
  }, [activeReferenceId, history]);

  const handleCaptureSelection = useCallback(async () => {
    if (!activeReferenceId || !activeSnapshotId) return;
    if (!selectionText.trim()) return;
    try {
      await readerClipCreate({
        referenceId: activeReferenceId,
        snapshotId: activeSnapshotId,
        quote: selectionText.trim(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reader.clips(activeReferenceId) });
      toast.success('Clip created');
    } catch (err) {
      toast.error('Failed to create clip', String(err));
    }
  }, [activeReferenceId, activeSnapshotId, selectionText, queryClient]);

  const handleInsertClip = useCallback(async (clip: ReaderClip) => {
    if (!activeReferenceId) return;
    try {
      await notesAppendSnippet({
        entityType: 'reader_reference',
        entityId: activeReferenceId,
        noteType: 'main',
        snippetText: clip.quote,
        sourceUrl: referenceQuery.data?.url,
        sourceTitle: referenceQuery.data?.title,
      });
      toast.success('Clip inserted into notes');
    } catch (err) {
      toast.error('Failed to insert clip', String(err));
    }
  }, [activeReferenceId, referenceQuery.data?.title, referenceQuery.data?.url]);

  const handleDeleteClip = useCallback(async (clipId: number) => {
    if (!activeReferenceId) return;
    try {
      await readerClipDelete(clipId);
      queryClient.invalidateQueries({ queryKey: queryKeys.reader.clips(activeReferenceId) });
    } catch (err) {
      toast.error('Failed to delete clip', String(err));
    }
  }, [activeReferenceId, queryClient]);

  const handleUpdateReference = useCallback(async (input: { title?: string; tags?: string[] }) => {
    if (!activeReferenceId) return;
    try {
      await readerReferenceUpdate(activeReferenceId, input);
      queryClient.invalidateQueries({ queryKey: queryKeys.reader.reference(activeReferenceId) });
    } catch (err) {
      toast.error('Failed to update reference', String(err));
    }
  }, [activeReferenceId, queryClient]);

  const handleOpenLivePage = useCallback(() => {
    const url = referenceQuery.data?.url || urlInput;
    if (!url.trim()) return;
    openLivePageWindow(url).catch((err) => {
      toast.error('Failed to open live page', String(err));
    });
  }, [referenceQuery.data?.url, urlInput]);

  const handleCopyCitation = useCallback(() => {
    if (!activeReferenceId) return;
    const citation = buildCitation(activeReferenceId);
    navigator.clipboard.writeText(citation).catch(() => {});
    toast.success('Citation copied');
  }, [activeReferenceId]);

  const handleBack = useCallback(() => {
    const entry = history.goBack();
    if (!entry) return;
    setActiveReferenceId(entry.referenceId);
    setActiveSnapshotId(entry.snapshotId);
  }, [history]);

  const handleForward = useCallback(() => {
    const entry = history.goForward();
    if (!entry) return;
    setActiveReferenceId(entry.referenceId);
    setActiveSnapshotId(entry.snapshotId);
  }, [history]);

  const startDrag = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const minLeft = 420;
    const minRight = 360;

    const handleMove = (moveEvent: MouseEvent) => {
      const nextLeft = moveEvent.clientX - rect.left;
      const clampedLeft = Math.max(minLeft, Math.min(rect.width - minRight, nextLeft));
      setSplitRatio(clampedLeft / rect.width);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    event.preventDefault();
  }, []);

  const leftWidth = `${splitRatio * 100}%`;
  const rightWidth = `${(1 - splitRatio) * 100}%`;

  const snapshotContent = snapshotQuery.data?.contentMd ?? '';

  return (
    <Flex direction="column" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ReaderCockpitTopBar
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onSubmitUrl={handleSubmitUrl}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onOpenLivePage={handleOpenLivePage}
        onCaptureSelection={handleCaptureSelection}
        onCopyCitation={handleCopyCitation}
        canGoBack={history.canGoBack}
        canGoForward={history.canGoForward}
        isLoading={snapshotQuery.isLoading || referenceQuery.isLoading}
        contextLabel={activeReferenceId ? `Reference #${activeReferenceId}` : 'Reader'}
      />

      <Box
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          gap: 0,
          padding: 12,
        }}
      >
        <Box style={{ width: leftWidth, minWidth: 420, minHeight: 0, display: 'flex' }}>
          <ReaderPane
            title={snapshotQuery.data?.title || referenceQuery.data?.title || contextTitle}
            excerpt={snapshotQuery.data?.excerpt || referenceQuery.data?.excerpt}
            contentMd={snapshotContent}
            referenceId={activeReferenceId}
            onSelectionChange={setSelectionText}
            onOpenLivePage={handleOpenLivePage}
            hasError={Boolean(snapshotQuery.error)}
          />
        </Box>
        <Box
          onMouseDown={startDrag}
          style={{
            width: 6,
            cursor: 'col-resize',
            background: 'var(--color-border)',
          }}
        />
        <Box
          style={{
            width: rightWidth,
            minWidth: 360,
            minHeight: 0,
            display: 'flex',
          }}
        >
          <Box
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-4)',
            }}
          >
            <RightPanelTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              notes={
                <NotesTab
                  entityType={activeReferenceId ? 'reader_reference' : undefined}
                  entityId={activeReferenceId ?? undefined}
                  selectionText={selectionText}
                  citation={activeReferenceId ? buildCitation(activeReferenceId) : undefined}
                />
              }
              metadata={
                <MetadataTab
                  reference={referenceQuery.data}
                  snapshots={snapshotsQuery.data ?? []}
                  activeSnapshotId={activeSnapshotId}
                  onSelectSnapshot={handleSelectSnapshot}
                  onRefresh={handleRefresh}
                  onOpenLivePage={handleOpenLivePage}
                  onUpdateReference={handleUpdateReference}
                />
              }
              clips={
                <ClipsTab
                  referenceId={activeReferenceId ?? undefined}
                  clips={clipsQuery.data ?? []}
                  selectionText={selectionText}
                  onCreateClip={handleCaptureSelection}
                  onInsertClip={handleInsertClip}
                  onDeleteClip={handleDeleteClip}
                />
              }
            />
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
