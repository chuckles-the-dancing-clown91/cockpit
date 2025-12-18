// src/features/webview/contextMenu/actions.ts
import type {
  WebviewActionRequest,
  WebviewActionResult,
  NotesAppendMode,
} from "@/shared/types";
import { invoke } from '@tauri-apps/api/core';
import { closeWebview } from "../index";
import { toast } from '@/core/lib/toast';
import { notesAppendSnippet } from '@/features/notes';

const DEFAULT_APPEND_MODE: NotesAppendMode = "append_with_divider";

export async function dispatchWebviewAction(
  req: WebviewActionRequest
): Promise<WebviewActionResult> {
  switch (req.type) {
    case "COPY_TO_NOTES": {
      if (!req.selection?.text?.trim()) {
        return { ok: false, message: "No selected text found." };
      }
      if (!req.context.noteTarget) {
        return { ok: false, message: "No note target configured." };
      }

      try {
        // Determine entity type and ID from noteTarget
        let entityType: 'idea' | 'reference' | 'writing';
        let entityId: number;
        
        const target = req.context.noteTarget;
        if (target.kind === 'reference_note') {
          entityType = 'reference';
          entityId = target.referenceId;
        } else if (target.kind === 'idea_note') {
          entityType = 'idea';
          entityId = target.ideaId;
        } else if (target.kind === 'writing_note') {
          entityType = 'writing';
          entityId = target.writingId;
        } else {
          return { ok: false, message: 'Invalid note target kind' };
        }

        // Append snippet using notes feature
        const result = await notesAppendSnippet({
          entityType,
          entityId,
          noteType: 'main',
          snippetText: req.selection.text,
          sourceUrl: req.selection.pageUrl,
          sourceTitle: req.selection.title,
        });

        toast.success("Added to notes.");
        return { ok: true, message: "Added to notes.", appendedNoteId: result.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add to notes';
        toast.error(message);
        return { ok: false, message };
      }
    }

    case "ADD_REFERENCE_TO_IDEA": {
      if (!req.context.ideaId) return { ok: false, message: "No idea selected." };

      try {
        // backend creates reference (if needed) and links it to idea
        const res = await invoke<{
          reference_id: number;
          idea_id: number;
        }>("idea_link_reference", {
          ideaId: req.context.ideaId,
          // If reference exists use it, else create from url/title
          referenceId: req.context.referenceId ?? null,
          url: req.context.url,
          title: req.context.title ?? null,
        });

        toast.success("Reference linked to idea.");
        return {
          ok: true,
          message: "Reference linked to idea.",
          createdReferenceId: res.reference_id,
          linkedIdeaId: res.idea_id,
        };
      } catch (error) {
        toast.error("Failed to link reference (not implemented yet)");
        return { ok: false, message: "Backend command not yet implemented" };
      }
    }

    case "OPEN_EXTERNAL": {
      try {
        // Let the webview host handle (or invoke tauri shell open)
        await invoke("system_open_external", { url: req.context.url });
        toast.success("Opening in browser...");
        return { ok: true };
      } catch (error) {
        // Fallback to window.open
        window.open(req.context.url, '_blank');
        return { ok: true };
      }
    }

    case "COPY_LINK": {
      await navigator.clipboard.writeText(req.context.url);
      toast.success("Link copied.");
      return { ok: true, message: "Link copied." };
    }

    case "DISMISS": {
      closeWebview();
      return { ok: true };
    }

    default:
      return { ok: false, message: "Unknown action." };
  }
}
