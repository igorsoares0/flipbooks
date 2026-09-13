"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Page } from "@/lib/types";
import {
  createEditorStore,
  type AssetItem,
  type DraftStorage,
  type EditorState,
  type EditorStore,
  type SaveDocument,
} from "./editor-store";

const EditorStoreContext = createContext<EditorStore | null>(null);

// One store per mounted editor, so navigating between documents never leaks state.
export function EditorStoreProvider({
  pages,
  save,
  drafts,
  assets,
  children,
}: {
  pages: Page[];
  save: SaveDocument;
  drafts?: DraftStorage;
  assets?: AssetItem[];
  children: ReactNode;
}) {
  const [store] = useState(() => createEditorStore(pages, { save, drafts, assets }));
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
}

export function useEditorStore() {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor must be used inside <EditorStoreProvider>");
  return store;
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditorStore(), selector);
}

export function useActivePage() {
  return useEditor((s) => s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0]);
}

/** The selected elements of the active page, in selection order. */
export function useSelectedElements() {
  return useEditor(
    useShallow((s) => {
      const page = s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0];
      return s.selectedIds.flatMap((id) => page.elements.find((el) => el.id === id) ?? []);
    }),
  );
}

/** The selected element when exactly one is selected. */
export function useSelectedElement() {
  const selected = useSelectedElements();
  return selected.length === 1 ? selected[0] : null;
}
