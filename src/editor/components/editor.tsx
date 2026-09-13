"use client";

import { useEffect, useState } from "react";
import { saveDocumentAction } from "@/lib/actions/flipbooks";
import type { FlipbookType, Page } from "@/lib/types";
import { EditorStoreProvider, useEditor, useEditorStore } from "../state/editor-context";
import type { AssetItem, SaveDocument } from "../state/editor-store";
import { discardDraft, draftStorage, readDraft, type Draft } from "../state/recovery";
import { Artboard } from "./artboard";
import { EditorTopbar } from "./editor-topbar";
import { Filmstrip } from "./filmstrip";
import { PropertiesPanel } from "./properties-panel";
import { ToolPanel } from "./tool-panel";
import { ToolRail } from "./tool-rail";

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
};

function useShortcuts() {
  const store = useEditorStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = store.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const hasSelection = s.selectedIds.length > 0;
      const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";

      if (mod && key === "z") (e.shiftKey ? s.redo : s.undo)();
      else if (mod && key === "y") s.redo();
      else if (mod && key === "d") s.duplicateSelection();
      else if (mod && key === "c" && hasSelection) s.copy();
      else if (mod && key === "v") s.paste();
      else if (mod && (key === "=" || key === "+")) s.zoomBy(1);
      else if (mod && key === "-") s.zoomBy(-1);
      else if (mod && key === "0") s.setZoom("fit");
      else if (mod) return;
      else if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) s.deleteSelection();
      else if (e.key.startsWith("Arrow") && hasSelection) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        s.nudge(dx, dy);
      } else if (e.key === "Escape" && hasSelection) s.select(null);
      else if (e.key === "Enter" && !onButton && s.selectedIds.length === 1) s.startEditing(s.selectedIds[0]);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);
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

/**
 * Offers to bring back edits that never reached the server (closed tab, failed saves).
 * Signed image URLs in the draft may have expired, so fresh ones are put back in.
 */
function RecoveryBanner({ flipbookId, updatedAt, initialPages }: { flipbookId: string; updatedAt: string; initialPages: Page[] }) {
  const store = useEditorStore();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    // localStorage only exists in the browser, so the draft is read after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(readDraft(flipbookId, updatedAt));
  }, [flipbookId, updatedAt]);

  if (!draft) return null;

  const restore = () => {
    const urls = new Map<string, string>();
    for (const asset of store.getState().assets) urls.set(asset.key, asset.url);
    for (const page of initialPages) {
      for (const el of page.elements) {
        if (el.type === "IMAGE" && el.properties.assetKey && el.properties.imageUrl) urls.set(el.properties.assetKey, el.properties.imageUrl);
      }
    }
    const backgrounds = new Map(initialPages.map((p) => [p.id, p.backgroundImageUrl ?? null]));
    const pages = draft.pages.map((page) => ({
      ...page,
      backgroundImageUrl: backgrounds.get(page.id) ?? null,
      elements: page.elements.map((el) =>
        el.type === "IMAGE" && el.properties.assetKey
          ? { ...el, properties: { ...el.properties, imageUrl: urls.get(el.properties.assetKey) ?? null } }
          : el,
      ),
    }));
    store.getState().restore(pages);
    setDraft(null);
  };

  const discard = () => {
    discardDraft(flipbookId);
    setDraft(null);
  };

  const when = new Date(draft.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div role="alert" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-warning/30 bg-warning-soft px-4 py-2 text-[12.5px] text-warning-ink">
      <span className="min-w-0 flex-1">
        <strong className="font-semibold">Unsaved changes found.</strong> This browser kept edits from {when} that never reached the server.
      </span>
      <button onClick={restore} className="font-semibold text-ink underline underline-offset-2">
        Restore unsaved changes
      </button>
      <button onClick={discard} className="text-warning-ink hover:text-ink">
        Discard
      </button>
    </div>
  );
}

/** Signed URLs are per-request and never stored; leaving them out keeps autosaves small. */
function withoutSignedUrls(pages: Page[]): Page[] {
  return pages.map(({ backgroundImageUrl: _url, ...page }) => ({
    ...page,
    elements: page.elements.map((el) => {
      if (el.type !== "IMAGE" || el.properties.imageUrl === undefined) return el;
      const { imageUrl: _imageUrl, ...properties } = el.properties;
      return { ...el, properties };
    }),
  }));
}

type EditorProps = {
  flipbookId: string;
  title: string;
  type: FlipbookType;
  slug: string;
  published: boolean;
  /** When the server copy last changed; drafts older than this are stale. */
  updatedAt: string;
  pages: Page[];
  assets: AssetItem[];
};

function EditorLayout({ flipbookId, title, type, slug, published, updatedAt, pages }: Omit<EditorProps, "assets">) {
  useShortcuts();
  useUnsavedChangesWarning();
  return (
    <div className="flex h-dvh flex-col bg-editor">
      <EditorTopbar flipbookId={flipbookId} title={title} type={type} slug={slug} published={published} />
      <RecoveryBanner flipbookId={flipbookId} updatedAt={updatedAt} initialPages={pages} />
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

export function Editor({ pages, assets, ...props }: EditorProps) {
  const [drafts] = useState(() => draftStorage(props.flipbookId));
  const save: SaveDocument = async (next) => {
    try {
      return await saveDocumentAction(props.flipbookId, withoutSignedUrls(next));
    } catch {
      return { ok: false, error: "Can't reach the server. Your changes are kept in this browser." };
    }
  };

  // The last second of typing is written out even if the tab closes before the timer.
  useEffect(() => {
    window.addEventListener("pagehide", drafts.flush);
    return () => window.removeEventListener("pagehide", drafts.flush);
  }, [drafts]);

  return (
    <EditorStoreProvider pages={pages} save={save} drafts={drafts} assets={assets}>
      <EditorLayout pages={pages} {...props} />
    </EditorStoreProvider>
  );
}
