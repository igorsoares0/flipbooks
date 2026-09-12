import { createStore } from "zustand/vanilla";
import type { Page, PageElement, ShapeElement, TextElement } from "@/lib/types";
import { newId } from "@/lib/utils";

export type Tool = "text" | "shapes" | "uploads" | "elements" | "photos" | "layers";
export type TextPreset = "heading" | "subheading" | "body";
export type ShapeKind = ShapeElement["properties"]["shape"];
export type SaveStatus = "saved" | "saving";

const HISTORY_LIMIT = 100;
// Stand-in for the debounced autosave (500–1000 ms → PATCH document) of the editor phase.
const AUTOSAVE_DELAY = 900;

export interface EditorState {
  pages: Page[];
  activePageId: string;
  /** Selected element id; null means the page itself is selected. */
  selectedId: string | null;
  tool: Tool;
  saveStatus: SaveStatus;
  past: Page[][];
  future: Page[][];

  selectTool: (tool: Tool) => void;
  select: (elementId: string | null) => void;
  setActivePage: (pageId: string) => void;
  addPage: () => void;
  addText: (preset: TextPreset) => void;
  addShape: (kind: ShapeKind) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
}

const TEXT_PRESETS: Record<TextPreset, { name: string; text: string; props: Partial<TextElement["properties"]>; height: number }> = {
  heading: { name: "Heading", text: "Add a heading", props: { fontFamily: "serif", fontSize: 40, lineHeight: 1.05, letterSpacing: -0.8 }, height: 46 },
  subheading: { name: "Subheading", text: "Add a subheading", props: { fontSize: 20, fontWeight: 600 }, height: 30 },
  body: { name: "Body text", text: "Add body text", props: { fontSize: 14, lineHeight: 1.5 }, height: 21 },
};

const SHAPES: Record<ShapeKind, { name: string; width: number; height: number; radius: number }> = {
  rect: { name: "Rectangle", width: 140, height: 140, radius: 2 },
  ellipse: { name: "Ellipse", width: 140, height: 140, radius: 0 },
  line: { name: "Line", width: 200, height: 2, radius: 0 },
};

export function createEditorStore(initialPages: Page[]) {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  return createStore<EditorState>()((set, get) => {
    /** Applies a document change: records history and triggers the autosave indicator. */
    const commit = (pages: Page[], patch: Partial<EditorState> = {}) => {
      set((s) => ({
        pages,
        past: [...s.past, s.pages].slice(-HISTORY_LIMIT),
        future: [],
        saveStatus: "saving",
        ...patch,
      }));
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => set({ saveStatus: "saved" }), AUTOSAVE_DELAY);
    };

    const activePage = () => get().pages.find((p) => p.id === get().activePageId) ?? get().pages[0];

    const withElement = (page: Page, element: PageElement) =>
      get().pages.map((p) => (p.id === page.id ? { ...p, elements: [...p.elements, element] } : p));

    const nextZ = (page: Page) => Math.max(0, ...page.elements.map((el) => el.zIndex)) + 1;

    const renumber = (pages: Page[]) => pages.map((p, i) => ({ ...p, pageNumber: i + 1 }));

    /** After undo/redo the selection may point at something that no longer exists. */
    const reconcile = (pages: Page[]) => {
      const { activePageId, selectedId } = get();
      const page = pages.find((p) => p.id === activePageId) ?? pages[pages.length - 1];
      const stillThere = page.elements.some((el) => el.id === selectedId);
      return { pages, activePageId: page.id, selectedId: stillThere ? selectedId : null };
    };

    return {
      pages: initialPages,
      activePageId: initialPages[0].id,
      selectedId: initialPages[0].elements[0]?.id ?? null,
      tool: "text",
      saveStatus: "saved",
      past: [],
      future: [],

      selectTool: (tool) => set({ tool }),
      select: (selectedId) => set({ selectedId }),
      setActivePage: (activePageId) => set({ activePageId, selectedId: null }),

      addPage: () => {
        const { pages } = get();
        const template = activePage();
        const page: Page = {
          ...template,
          id: newId("page"),
          pageNumber: pages.length + 1,
          background: { color: "#FFFFFF" },
          backgroundImageKey: null,
          elements: [],
        };
        commit([...pages, page], { activePageId: page.id, selectedId: null });
      },

      addText: (preset) => {
        const page = activePage();
        const { name, text, props, height } = TEXT_PRESETS[preset];
        const element: TextElement = {
          id: newId("el"),
          pageId: page.id,
          name,
          x: 44,
          y: Math.round(page.height / 2 - height / 2),
          width: page.width - 88,
          height,
          rotation: 0,
          opacity: 1,
          zIndex: nextZ(page),
          locked: false,
          visible: true,
          type: "TEXT",
          properties: {
            runs: [{ text }],
            fontFamily: "sans",
            fontSize: 14,
            fontWeight: 400,
            color: "#17150F",
            align: "left",
            lineHeight: 1.2,
            letterSpacing: 0,
            ...props,
          },
        };
        commit(withElement(page, element), { selectedId: element.id });
      },

      addShape: (kind) => {
        const page = activePage();
        const { name, width, height, radius } = SHAPES[kind];
        const element: ShapeElement = {
          id: newId("el"),
          pageId: page.id,
          name,
          x: Math.round((page.width - width) / 2),
          y: Math.round((page.height - height) / 2),
          width,
          height,
          rotation: 0,
          opacity: 1,
          zIndex: nextZ(page),
          locked: false,
          visible: true,
          type: "SHAPE",
          properties: { shape: kind, fill: "#17150F", radius },
        };
        commit(withElement(page, element), { selectedId: element.id });
      },

      duplicateSelection: () => {
        const { pages, selectedId } = get();
        const page = activePage();
        if (selectedId === null) {
          const copy: Page = {
            ...page,
            id: newId("page"),
            elements: page.elements.map((el) => ({ ...el, id: newId("el") })),
          };
          copy.elements = copy.elements.map((el) => ({ ...el, pageId: copy.id }));
          const index = pages.indexOf(page);
          commit(renumber([...pages.slice(0, index + 1), copy, ...pages.slice(index + 1)]), {
            activePageId: copy.id,
          });
          return;
        }
        const source = page.elements.find((el) => el.id === selectedId);
        if (!source) return;
        const copy = { ...source, id: newId("el"), x: source.x + 16, y: source.y + 16, zIndex: nextZ(page) };
        commit(withElement(page, copy), { selectedId: copy.id });
      },

      deleteSelection: () => {
        const { pages, selectedId } = get();
        const page = activePage();
        if (selectedId === null) {
          if (pages.length === 1) return;
          const index = pages.indexOf(page);
          const remaining = renumber(pages.filter((p) => p.id !== page.id));
          commit(remaining, { activePageId: remaining[Math.max(0, index - 1)].id });
          return;
        }
        commit(
          pages.map((p) => (p.id === page.id ? { ...p, elements: p.elements.filter((el) => el.id !== selectedId) } : p)),
          { selectedId: null },
        );
      },

      undo: () => {
        const { past, pages, future } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        set({ ...reconcile(previous), past: past.slice(0, -1), future: [pages, ...future] });
      },

      redo: () => {
        const { past, pages, future } = get();
        if (future.length === 0) return;
        const [next, ...rest] = future;
        set({ ...reconcile(next), past: [...past, pages], future: rest });
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;
