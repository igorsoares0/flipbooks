"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { Page } from "@/lib/types";
import { createEditorStore, type EditorState, type EditorStore } from "./editor-store";

const EditorStoreContext = createContext<EditorStore | null>(null);

// One store per mounted editor, so navigating between documents never leaks state.
export function EditorStoreProvider({ pages, children }: { pages: Page[]; children: ReactNode }) {
  const [store] = useState(() => createEditorStore(pages));
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor must be used inside <EditorStoreProvider>");
  return useStore(store, selector);
}

export function useActivePage() {
  return useEditor((s) => s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0]);
}

export function useSelectedElement() {
  const page = useActivePage();
  const selectedId = useEditor((s) => s.selectedId);
  return page.elements.find((el) => el.id === selectedId) ?? null;
}
