// src/features/webview/components/WebviewModal.tsx
import { Box, Card, Dialog, Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import { ExternalLink, X, RefreshCcw, ArrowLeft, ArrowRight, ClipboardPaste } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview, getCurrentWebview } from "@tauri-apps/api/webview";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";

import { useWebviewStore, getWebviewSelectedText } from "../store";
import { registerWebviewInstance, closeWebview, navigateWebview, webviewBack, webviewForward, webviewReload } from "../index";
import { notesAppendSnippet, EntityNotesPanel } from "@/features/notes";
import { toast } from "@/core/lib/toast";

const WEBVIEW_LABEL = "cockpit/reference-webview";

// Runs inside the child webview to publish selection changes back to main.
// This will only work if the loaded page has access to Tauri globals / IPC.
// By default external domains do NOT, so we include a clipboard fallback.
const INIT_SCRIPT = `
(() => {
  const safeEmitToMain = (payload) => {
    try {
      const tauri = window.__TAURI__;
      if (!tauri?.webview) return;
      const wv = tauri.webview.getCurrentWebview();
      wv.emitTo('main', 'cockpit-webview-selection', payload);
    } catch (_) {}
  };

  let last = '';
  let t = null;

  const publish = () => {
    const sel = (window.getSelection?.().toString() || '').trim();
    if (sel === last) return;
    last = sel;
    safeEmitToMain({ selection: sel, title: document.title || '', url: location.href });
  };

  document.addEventListener('selectionchange', () => {
    if (t) clearTimeout(t);
    t = setTimeout(publish, 120);
  });

  window.addEventListener('mouseup', publish);
  window.addEventListener('keyup', publish);

  // initial ping
  safeEmitToMain({ selection: '', title: document.title || '', url: location.href });
})();
`;

async function openExternal(url: string) {
  // Just use window.open as fallback - works in most cases
  window.open(url, "_blank");
}

export function WebviewModal() {
  const isOpen = useWebviewStore((s) => s.isOpen);
  const title = useWebviewStore((s) => s.title);
  const initialUrl = useWebviewStore((s) => s.initialUrl);
  const currentUrl = useWebviewStore((s) => s.currentUrl);
  const selectedText = useWebviewStore((s) => s.selectedText);
  const noteTarget = useWebviewStore((s) => s.noteTarget);

  const setSelectedText = useWebviewStore((s) => s.setSelectedText);
  const setTitle = useWebviewStore((s) => s.setTitle);
  const setCurrentUrl = useWebviewStore((s) => s.setCurrentUrl);

  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null);
  const webviewRef = useRef<Webview | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [isAppending, setIsAppending] = useState(false);

  useEffect(() => {
    if (isOpen) setUrlInput(currentUrl ?? initialUrl ?? "");
  }, [isOpen, currentUrl, initialUrl]);

  // Listen for selection events emitted to main webview label.
  useEffect(() => {
    if (!isOpen) return;

    let unlisten: null | (() => void) = null;

    (async () => {
      try {
        const main = getCurrentWebview();
        unlisten = await main.listen<{ selection: string; title?: string; url?: string }>(
          "cockpit-webview-selection",
          (e) => {
            const p = e.payload;
            if (typeof p?.selection === "string") setSelectedText(p.selection);
            if (typeof p?.title === "string" && p.title.length) setTitle(p.title);
            if (typeof p?.url === "string" && p.url.length) setCurrentUrl(p.url);
          }
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      try {
        unlisten?.();
      } catch {}
    };
  }, [isOpen, setSelectedText, setTitle, setCurrentUrl]);

  // Simpler test effect first
  useEffect(() => {
    console.log('[WebviewModal] Basic effect running!', { isOpen, initialUrl, currentUrl });
  }, [isOpen, initialUrl, currentUrl]);

  // Create/attach the child webview when modal opens.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const host = hostEl;
    console.log('[WebviewModal] Effect running', { isOpen, initialUrl, currentUrl, hasHost: !!host });

    if (!host) {
      console.log('[WebviewModal] No host ref yet, will retry on next render');
      return;
    }

    if (!initialUrl) {
      console.log('[WebviewModal] No initialUrl');
      return;
    }

    let ro: ResizeObserver | null = null;
    let unlistenMoved: (() => void) | null = null;
    let unlistenResized: (() => void) | null = null;
    let unlistenScale: (() => void) | null = null;
    let alive = true;
    let tries = 0;
    let raf: number | null = null;
    let positionRaf: number | null = null;

    const syncBounds = async (wv: Webview) => {
      const rect = host.getBoundingClientRect();
      const win = getCurrentWindow();
      const [winPos, scale] = await Promise.all([win.innerPosition(), win.scaleFactor()]);
      const x = Math.round(winPos.x + rect.left * scale);
      const y = Math.round(winPos.y + rect.top * scale);
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      await wv.setPosition(new PhysicalPosition(x, y));
      await wv.setSize(new PhysicalSize(width, height));
    };

    const attachWebview = async () => {
      if (!alive) return;
      const r = host.getBoundingClientRect();
      const logicalWidth = Math.max(1, Math.round(r.width));
      const logicalHeight = Math.max(1, Math.round(r.height));

      if ((logicalWidth <= 1 || logicalHeight <= 1) && tries < 60) {
        tries += 1;
        raf = requestAnimationFrame(attachWebview);
        return;
      }

      const win = getCurrentWindow();
      const [winPos, scale] = await Promise.all([win.innerPosition(), win.scaleFactor()]);
      const x = Math.round(winPos.x + r.left * scale);
      const y = Math.round(winPos.y + r.top * scale);
      const width = Math.max(1, Math.round(r.width * scale));
      const height = Math.max(1, Math.round(r.height * scale));

      console.log('[WebviewModal] Creating webview with bounds:', { x, y, width, height });

      // Ensure URL has protocol
      let webviewUrl = currentUrl ?? initialUrl;
      if (webviewUrl && !webviewUrl.startsWith('http://') && !webviewUrl.startsWith('https://')) {
        webviewUrl = 'https://' + webviewUrl;
      }

      console.log('[WebviewModal] Final URL:', webviewUrl);
      
      // Check if webview already exists
      let wv = await Webview.getByLabel(WEBVIEW_LABEL);
      console.log('[WebviewModal] Existing webview?', !!wv);

      if (!wv) {
        // Create new webview
        try {
          console.log('[WebviewModal] Calling Webview constructor...');
          wv = new Webview(win, WEBVIEW_LABEL, {
            url: webviewUrl,
            x,
            y,
            width,
            height,
            // initializationScripts: [INIT_SCRIPT],
          });

          wv.once("tauri://created", async () => {
            console.log('[WebviewModal] ✓ Webview created successfully');
            webviewRef.current = wv;
            registerWebviewInstance(wv);
            
            try {
              await syncBounds(wv);
              await wv.show();
              await wv.setFocus();
              console.log('[WebviewModal] ✓ Webview shown');
            } catch (e) {
              console.error('[WebviewModal] ✗ Failed to show webview:', e);
            }
          });

          wv.once("tauri://error", (err) => {
            console.error('[WebviewModal] ✗ Webview creation error:', err);
          });
        } catch (e) {
          console.error('[WebviewModal] ✗ Webview constructor threw:', e);
          return;
        }
      } else {
        // Position existing webview
        console.log('[WebviewModal] Repositioning existing webview');
        try {
          await syncBounds(wv);
          await wv.show();
          await wv.setFocus();
          webviewRef.current = wv;
          registerWebviewInstance(wv);
          console.log('[WebviewModal] ✓ Webview repositioned and shown');
        } catch (e) {
          console.error('[WebviewModal] ✗ Failed to reposition webview:', e);
        }
      }

      // Keep webview positioned with ResizeObserver
      const syncBoundsSafe = () => {
        if (!alive) return;
        if (!host) return;
        Webview.getByLabel(WEBVIEW_LABEL)
          .then((wv2) => {
            if (!wv2) return;
            return syncBounds(wv2);
          })
          .catch(() => {});
      };

      ro = new ResizeObserver(() => {
        syncBoundsSafe();
      });
      ro.observe(host);

      const windowHandle = getCurrentWindow();
      windowHandle
        .onMoved(() => syncBoundsSafe())
        .then((unlisten) => {
          unlistenMoved = unlisten;
        })
        .catch(() => {});
      windowHandle
        .onResized(() => syncBoundsSafe())
        .then((unlisten) => {
          unlistenResized = unlisten;
        })
        .catch(() => {});
      windowHandle
        .onScaleChanged(() => syncBoundsSafe())
        .then((unlisten) => {
          unlistenScale = unlisten;
        })
        .catch(() => {});

      const updateForAnimation = async () => {
        if (!alive) return;
        const wv2 = await Webview.getByLabel(WEBVIEW_LABEL);
        if (wv2) {
          try {
            await syncBounds(wv2);
          } catch {}
        }
      };

      let frames = 0;
      const tick = async () => {
        if (!alive) return;
        await updateForAnimation();
        frames += 1;
        if (frames < 40) {
          positionRaf = requestAnimationFrame(tick);
        }
      };
      positionRaf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(attachWebview);

    return () => {
      alive = false;
      if (raf !== null) cancelAnimationFrame(raf);
      if (positionRaf !== null) cancelAnimationFrame(positionRaf);
      ro?.disconnect();
      unlistenMoved?.();
      unlistenResized?.();
      unlistenScale?.();
      
      // Optionally hide webview on close
      Webview.getByLabel(WEBVIEW_LABEL).then(wv => wv?.close());
      webviewRef.current = null;
      registerWebviewInstance(null);
    };
  }, [isOpen, initialUrl, currentUrl, hostEl]);

  // Navigate when the user submits the URL bar
  const onSubmitUrl = async () => {
    let url = urlInput.trim();
    if (!url) return;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      setUrlInput(url);
    }
    
    await navigateWebview(url);
  };

  // Clipboard fallback (works even when selection bridge is blocked)
  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t?.trim()) setSelectedText(t.trim());
    } catch {}
  };

  // Add selection to notes
  const addSelectionToNotes = async () => {
    const text = getWebviewSelectedText();
    if (!text.trim()) {
      toast.error("No text selected");
      return;
    }
    if (!noteTarget) {
      toast.error("No note target configured");
      return;
    }

    try {
      let entityType: 'idea' | 'reference' | 'writing';
      let entityId: number;

      if (noteTarget.kind === 'reference_note') {
        entityType = 'reference';
        entityId = noteTarget.referenceId;
      } else if (noteTarget.kind === 'idea_note') {
        entityType = 'idea';
        entityId = noteTarget.ideaId;
      } else if (noteTarget.kind === 'writing_note') {
        entityType = 'writing';
        entityId = noteTarget.writingId;
      } else {
        toast.error('Invalid note target kind');
        return;
      }

      await notesAppendSnippet({
        entityType,
        entityId,
        noteType: 'main',
        snippetText: text,
        sourceUrl: currentUrl ?? undefined,
        sourceTitle: title ?? undefined,
      });

      toast.success("Added to notes");
      setSelectedText(""); // Clear selection after adding
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to notes';
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  console.log('[WebviewModal] Rendering', { isOpen, title, initialUrl, currentUrl });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeWebview()}>
      <Dialog.Content
        size="4"
        maxWidth="none"
        style={{
          width: '90vw',
          height: '90vh',
          maxWidth: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Dialog.Title asChild>
          <span style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </Dialog.Title>
        
        {/* Header */}
          <Flex
            align="center"
            justify="between"
            className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{ padding: 12 }}
          >
            <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
              <Text weight="medium" size="3" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {title}
              </Text>
              <Text size="1" style={{ color: 'var(--color-text-muted)', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUrl ?? initialUrl ?? ""}
              </Text>
            </Flex>

            <Flex gap="2">
              <Button variant="soft" onClick={() => webviewBack()}>
                <ArrowLeft width={16} height={16} />
              </Button>
              <Button variant="soft" onClick={() => webviewForward()}>
                <ArrowRight width={16} height={16} />
              </Button>
              <Button variant="soft" onClick={() => webviewReload()}>
                <RefreshCcw width={16} height={16} />
              </Button>
              <Button variant="soft" onClick={() => currentUrl && openExternal(currentUrl)}>
                <ExternalLink width={16} height={16} />
              </Button>

              <Button variant="ghost" onClick={() => closeWebview()}>
                <X width={18} height={18} />
              </Button>
            </Flex>
          </Flex>

          {/* URL bar */}
          <Flex gap="2" align="center" style={{ padding: 12, borderBottom: "1px solid var(--color-border)" }}>
            <TextField.Root
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmitUrl()}
              placeholder="Enter a URL and press Enter…"
              style={{ flex: 1 }}
            />
            <Button onClick={onSubmitUrl}>Go</Button>
          </Flex>

          {/* Body */}
          <Flex style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div
              ref={setHostEl}
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                height: "100%",
                position: "relative",
                background: "var(--color-surface)",
              }}
            />

            <Box
              style={{
                width: 360,
                borderLeft: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                padding: 12,
                overflow: "auto",
              }}
            >
              <Flex direction="column" gap="3">
                <Card>
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="medium">
                      Selection
                    </Text>
                    <TextArea
                      value={selectedText}
                      onChange={(e) => setSelectedText(e.target.value)}
                      placeholder="Select text in the webview or paste from clipboard..."
                      rows={6}
                    />
                    <Flex gap="2" justify="between">
                      <Button variant="soft" onClick={pasteFromClipboard}>
                        <ClipboardPaste width={16} height={16} />
                        Paste
                      </Button>
                      <Button
                        onClick={async () => {
                          if (isAppending) return;
                          setIsAppending(true);
                          await addSelectionToNotes();
                          setIsAppending(false);
                        }}
                        disabled={!selectedText.trim() || !noteTarget || isAppending}
                      >
                        Add to notes
                      </Button>
                    </Flex>
                    {!noteTarget && (
                      <Text size="1" style={{ color: "var(--color-text-soft)" }}>
                        No note target configured for this reference.
                      </Text>
                    )}
                  </Flex>
                </Card>

                {noteTarget?.kind === "reference_note" ? (
                  <EntityNotesPanel
                    entityType="reference"
                    entityId={noteTarget.referenceId}
                    noteType="main"
                    title="Reference Notes"
                    minHeight="240px"
                  />
                ) : noteTarget?.kind === "idea_note" ? (
                  <EntityNotesPanel
                    entityType="idea"
                    entityId={noteTarget.ideaId}
                    noteType="main"
                    title="Idea Notes"
                    minHeight="240px"
                  />
                ) : noteTarget?.kind === "writing_note" ? (
                  <EntityNotesPanel
                    entityType="writing"
                    entityId={noteTarget.writingId}
                    noteType="main"
                    title="Writing Notes"
                    minHeight="240px"
                  />
                ) : null}
              </Flex>
            </Box>
          </Flex>
        </Dialog.Content>
    </Dialog.Root>
  );
}
