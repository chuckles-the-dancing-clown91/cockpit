// src/features/webview/index.ts
import { Webview } from "@tauri-apps/api/webview";
import type { WebviewContext } from "@/shared/types";
import { useWebviewStore } from "./store";

let _webview: Webview | null = null;

export function registerWebviewInstance(wv: Webview | null) {
  _webview = wv;
}

export function openWebview(context: WebviewContext) {
  useWebviewStore.getState().open(context);
}

export async function closeWebview() {
  // close UI first so React unmount runs even if close() throws
  useWebviewStore.getState().close();
  if (_webview) {
    try {
      await _webview.close();
    } catch {}
    _webview = null;
  }
}

export async function navigateWebview(url: string) {
  useWebviewStore.getState().setCurrentUrl(url);
  try {
    // @ts-ignore - Webview navigation API
    if (_webview?.navigate) return await _webview.navigate(url);
    // @ts-ignore
    if (_webview?.setUrl) return await _webview.setUrl(url);
  } catch {}
}

export async function webviewReload() {
  try {
    // @ts-ignore
    if (_webview?.reload) return await _webview.reload();
  } catch {}
  // fallback: re-navigate to currentUrl
  const url = useWebviewStore.getState().currentUrl ?? useWebviewStore.getState().initialUrl;
  if (url) await navigateWebview(url);
}

export async function webviewBack() {
  try {
    // @ts-ignore
    if (_webview?.goBack) return await _webview.goBack();
  } catch {}
}

export async function webviewForward() {
  try {
    // @ts-ignore
    if (_webview?.goForward) return await _webview.goForward();
  } catch {}
}
