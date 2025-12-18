// src/features/webview/components/WebviewModal.tsx
import { Dialog, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { ExternalLink, X, RefreshCcw, ArrowLeft, ArrowRight, ClipboardPaste } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview, getCurrentWebview } from "@tauri-apps/api/webview";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";

import { useWebviewStore, getWebviewSelectedText } from "../store";
import { registerWebviewInstance, closeWebview, navigateWebview, webviewBack, webviewForward, webviewReload } from "../index";
import { notesAppendSnippet, NotesEditor } from "@/features/notes";
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

  const hostRef = useRef<HTMLDivElement | null>(null);
  const webviewRef = useRef<Webview | null>(null);

  const [urlInput, setUrlInput] = useState("");

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
  useEffect(() => {
    if (!isOpen) return;

    const host = hostRef.current;
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
    let alive = true;

    (async () => {
      const win = getCurrentWindow();
      const r = host.getBoundingClientRect();
      const x = Math.round(r.left);
      const y = Math.round(r.top);
      const width = Math.max(1, Math.round(r.width));
      const height = Math.max(1, Math.round(r.height));

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
            initializationScripts: [INIT_SCRIPT],
          });

          wv.once("tauri://created", async () => {
            console.log('[WebviewModal] ✓ Webview created successfully');
            webviewRef.current = wv;
            registerWebviewInstance(wv);
            
            try {
              await wv.show();
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
          await wv.setPosition(new LogicalPosition(x, y));
          await wv.setSize(new LogicalSize(width, height));
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
      ro = new ResizeObserver(async () => {
        if (!alive) return;
        const host2 = hostRef.current;
        if (!host2) return;
        const wv2 = await Webview.getByLabel(WEBVIEW_LABEL);
        if (!wv2) return;

        const r2 = host2.getBoundingClientRect();
        const x2 = Math.round(r2.left);
        const y2 = Math.round(r2.top);
        const w2 = Math.max(1, Math.round(r2.width));
        const h2 = Math.max(1, Math.round(r2.height));

        await wv2.setPosition(new LogicalPosition(x2, y2));
        await wv2.setSize(new LogicalSize(w2, h2));
      });
      ro.observe(host);
    })();

    return () => {
      alive = false;
      ro?.disconnect();
      
      // Optionally hide webview on close
      Webview.getByLabel(WEBVIEW_LABEL).then(wv => wv?.close());
      webviewRef.current = null;
      registerWebviewInstance(null);
    };
  }, [isOpen, initialUrl, currentUrl]);

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
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%", 
            minHeight: 0,
            background: "var(--color-surface)"
          }}>
            <Flex direction="column" align="center" gap="4" style={{ textAlign: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-soft)", opacity: 0.5 }}>
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M7 7h10"></path>
                <path d="M7 12h10"></path>
                <path d="M7 17h10"></path>
              </svg>
              <div>
                <Text size="6" weight="bold" style={{ color: "var(--color-text-primary)", display: "block", marginBottom: "0.5rem" }}>
                  Coming Soon
                </Text>
                <Text size="3" style={{ color: "var(--color-text-soft)", display: "block" }}>
                  Embedded browser with text selection and notes
                </Text>
              </div>
              <Button variant="soft" onClick={() => currentUrl && openExternal(currentUrl)}>
                <ExternalLink width={16} height={16} />
                Open in Browser
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
    </Dialog.Root>
  );
}
