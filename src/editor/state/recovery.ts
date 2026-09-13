import type { Page } from "@/lib/types";
import type { DraftStorage } from "./editor-store";

// Unsaved-work recovery (spec §15). Every edit writes the document to localStorage;
// a confirmed save clears it. If the tab closes or saves keep failing, the next visit
// finds a draft newer than the server copy and offers to restore it.

export type Draft = { pages: Page[]; at: number };

const storageKey = (flipbookId: string) => `flipbook:draft:${flipbookId}`;

// Writing the whole document on every keystroke is wasteful; once a second is plenty.
const WRITE_DELAY = 1_000;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked (private mode, sandboxed iframes)
  }
}

export function draftStorage(flipbookId: string): DraftStorage & { flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Page[] | null = null;

  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    const draft: Draft = { pages: pending, at: Date.now() };
    pending = null;
    try {
      storage()?.setItem(storageKey(flipbookId), JSON.stringify(draft));
    } catch {
      // Quota exceeded: recovery is a best-effort safety net, the server copy still works.
    }
  };

  return {
    write: (pages) => {
      pending = pages;
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY);
    },
    clear: () => {
      clearTimeout(timer);
      pending = null;
      storage()?.removeItem(storageKey(flipbookId));
    },
    flush,
  };
}

/** A stored draft that is newer than the server's copy, if any. Stale drafts are removed. */
export function readDraft(flipbookId: string, serverUpdatedAt: string): Draft | null {
  const store = storage();
  const raw = store?.getItem(storageKey(flipbookId));
  if (!store || !raw) return null;
  try {
    const draft = JSON.parse(raw) as Draft;
    if (!Array.isArray(draft.pages) || draft.pages.length === 0 || typeof draft.at !== "number") throw new Error("bad draft");
    if (draft.at <= Date.parse(serverUpdatedAt)) {
      store.removeItem(storageKey(flipbookId));
      return null;
    }
    return draft;
  } catch {
    store.removeItem(storageKey(flipbookId));
    return null;
  }
}

export function discardDraft(flipbookId: string) {
  storage()?.removeItem(storageKey(flipbookId));
}
