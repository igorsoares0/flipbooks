"use client";

import { useEffect } from "react";
import { saveDocumentAction } from "@/lib/actions/flipbooks";
import type { FlipbookType, Page } from "@/lib/types";
import { EditorStoreProvider, useEditor } from "../state/editor-context";
import { Artboard } from "./artboard";
import { EditorTopbar } from "./editor-topbar";
import { Filmstrip } from "./filmstrip";
import { PropertiesPanel } from "./properties-panel";
import { ToolPanel } from "./tool-panel";
import { ToolRail } from "./tool-rail";

function useShortcuts() {
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const deleteSelection = useEditor((s) => s.deleteSelection);
  const duplicateSelection = useEditor((s) => s.duplicateSelection);
  const hasSelection = useEditor((s) => s.selectedId !== null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") (e.shiftKey ? redo : undo)();
      else if (mod && key === "y") redo();
      else if (mod && key === "d") duplicateSelection();
      else if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) deleteSelection();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSelection, duplicateSelection, hasSelection]);
}

/** Warn before closing the tab while an edit hasn't reached the server yet. */
function useUnsavedChangesWarning() {
  const dirty = useEditor((s) => s.dirty);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

type EditorProps = {
  flipbookId: string;
  title: string;
  type: FlipbookType;
  slug: string;
  published: boolean;
  pages: Page[];
};

function EditorLayout({ flipbookId, title, type, slug, published }: Omit<EditorProps, "pages">) {
  useShortcuts();
  useUnsavedChangesWarning();
  return (
    <div className="flex h-dvh flex-col bg-editor">
      <EditorTopbar flipbookId={flipbookId} title={title} type={type} slug={slug} published={published} />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <ToolPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <Artboard />
          <Filmstrip />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}

export function Editor({ pages, ...props }: EditorProps) {
  return (
    <EditorStoreProvider pages={pages} save={(next) => saveDocumentAction(props.flipbookId, next)}>
      <EditorLayout {...props} />
    </EditorStoreProvider>
  );
}
