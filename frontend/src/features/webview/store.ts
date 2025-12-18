// src/features/webview/store.ts
import { create } from "zustand";
import type { WebviewContext } from "@/shared/types";

type NoteTarget =
  | { kind: "idea_note"; ideaId: number }
  | { kind: "reference_note"; referenceId: number; ideaId?: number }
  | { kind: "writing_note"; writingId: number }
  | null;

interface WebviewStore {
  isOpen: boolean;
  title: string;
  initialUrl: string | null;
  currentUrl: string | null;
  selectedText: string;
  noteTarget: NoteTarget;
  context: WebviewContext | null;

  open: (context: WebviewContext) => void;
  close: () => void;

  setSelectedText: (v: string) => void;
  setTitle: (v: string) => void;
  setCurrentUrl: (v: string) => void;
}

export const useWebviewStore = create<WebviewStore>((set) => ({
  isOpen: false,
  title: "Webview",
  initialUrl: null,
  currentUrl: null,
  selectedText: "",
  noteTarget: null,
  context: null,

  open: (context) =>
    set({
      isOpen: true,
      title: context.title ?? "Webview",
      initialUrl: context.url,
      currentUrl: context.url,
      selectedText: "",
      noteTarget: context.noteTarget ?? null,
      context,
    }),

  close: () =>
    set({
      isOpen: false,
      selectedText: "",
      noteTarget: null,
      context: null,
    }),

  setSelectedText: (v) => set({ selectedText: v }),
  setTitle: (v) => set({ title: v }),
  setCurrentUrl: (v) => set({ currentUrl: v }),
}));

export function getWebviewSelectedText(): string {
  return useWebviewStore.getState().selectedText;
}
