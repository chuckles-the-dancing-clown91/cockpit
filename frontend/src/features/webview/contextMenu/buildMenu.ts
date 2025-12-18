// src/features/webview/contextMenu/buildMenu.ts
import type { WebviewActionType, WebviewContext, WebviewSelection } from "@/shared/types";

export interface WebviewMenuItem {
  id: WebviewActionType;
  label: string;
  enabled: boolean;
}

export function buildWebviewMenu(args: {
  context: WebviewContext;
  selection?: WebviewSelection | null;
}): WebviewMenuItem[] {
  const { context, selection } = args;
  const hasSelection = !!selection?.text?.trim();

  return [
    {
      id: "COPY_TO_NOTES",
      label: "Copy to Notes",
      enabled: hasSelection && !!context.noteTarget,
    },
    {
      id: "ADD_REFERENCE_TO_IDEA",
      label: "Add Reference to Idea",
      enabled: !!context.ideaId && (!!context.referenceId || !!context.url),
    },
    {
      id: "COPY_LINK",
      label: "Copy Link",
      enabled: !!context.url,
    },
    {
      id: "OPEN_EXTERNAL",
      label: "Open in Browser",
      enabled: !!context.url,
    },
    {
      id: "DISMISS",
      label: "Close",
      enabled: true,
    },
  ];
}
