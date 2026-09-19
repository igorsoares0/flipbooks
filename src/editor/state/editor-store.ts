import { createStore } from "zustand/vanilla";
import type { ImageElement, Page, PageElement, ShapeElement, TextElement, TextRun } from "@/lib/types";
import { newId } from "@/lib/utils";

export type Tool = "text" | "shapes" | "uploads" | "elements" | "photos" | "layers";
export type TextPreset = "heading" | "subheading" | "body";
export type ShapeKind = ShapeElement["properties"]["shape"];
export type SaveStatus = "saved" | "saving" | "error";
export type Zoom = number | "fit";
export type Arrange = "forward" | "backward" | "front" | "back";
export type Align = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Persists the whole document; resolves with an error message on failure. */
export type SaveDocument = (pages: Page[]) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Keeps a local copy of unsaved work (see recovery.ts). */
export type DraftStorage = { write: (pages: Page[]) => void; clear: () => void };

/** An uploaded picture the user can place (from the asset library). */
export type AssetItem = { id: string; key: string; url: string; filename: string; width: number; height: number };

/** An image upload in progress (or failed), shown in the Uploads panel. */
export type UploadItem = { id: string; filename: string; progress: number; error: string | null };

/** A partial change to one element; `properties` is merged into the existing ones. */
export type ElementPatch = Partial<Pick<PageElement, "x" | "y" | "width" | "height" | "rotation" | "opacity" | "locked" | "visible" | "name">> & {
  properties?: Record<string, unknown>;
};

const HISTORY_LIMIT = 100;
// Autosave debounce from the spec (500–1000 ms).
export const AUTOSAVE_DELAY = 800;
// Repeated edits of the same field within this window are one undo step.
export const COALESCE_MS = 600;
export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface EditorState {
  pages: Page[];
  activePageId: string;
  /** Selected elements on the active page; empty means the page itself is selected. */
  selectedIds: string[];
  /** Text element being edited inline, if any. */
  editingId: string | null;
  tool: Tool;
  zoom: Zoom;
  /** The scale that fits the page in the artboard; measured by the artboard. */
  fitScale: number;
  assets: AssetItem[];
  uploads: UploadItem[];
  /** The plan's page limit for one flipbook. */
  maxPages: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** True from the first edit until the server has confirmed the latest version. */
  dirty: boolean;
  past: Page[][];
  future: Page[][];

  retrySave: () => void;
  selectTool: (tool: Tool) => void;
  setZoom: (zoom: Zoom) => void;
  setFitScale: (scale: number) => void;
  zoomBy: (direction: 1 | -1) => void;

  /** Selects one element (or the page, with null). `additive` toggles it in a multi-selection. */
  select: (elementId: string | null, options?: { additive?: boolean }) => void;
  setActivePage: (pageId: string) => void;
  startEditing: (elementId: string) => void;
  stopEditing: () => void;

  addPage: () => void;
  addText: (preset: TextPreset) => void;
  addShape: (kind: ShapeKind) => void;
  addImage: (asset: AssetItem) => void;
  addAsset: (asset: AssetItem) => void;
  removeAsset: (key: string) => void;
  setUpload: (upload: UploadItem) => void;
  removeUpload: (id: string) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;

  /** Starts a drag: live updates until endGesture() form one undo step. */
  beginGesture: () => void;
  updateElements: (patches: Record<string, ElementPatch>) => void;
  endGesture: () => void;
  /** A property edit. Edits of the same element and field in quick succession merge. */
  updateElement: (id: string, patch: ElementPatch, field?: string) => void;
  setText: (id: string, runs: TextRun[]) => void;
  /** Keeps a text box's stored height in step with its rendered content (not an edit). */
  syncHeight: (id: string, height: number) => void;
  nudge: (dx: number, dy: number) => void;
  arrange: (to: Arrange) => void;
  align: (to: Align) => void;
  toggleLock: (id: string) => void;
  toggleVisible: (id: string) => void;
  copy: () => void;
  paste: () => void;

  reorderPage: (from: number, to: number) => void;
  setPageBackground: (color: string) => void;
  restore: (pages: Page[]) => void;
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

function applyPatch(element: PageElement, patch: ElementPatch): PageElement {
  const { properties, ...box } = patch;
  return {
    ...element,
    ...box,
    ...(properties ? { properties: { ...element.properties, ...properties } } : {}),
  } as PageElement;
}

export function createEditorStore(
  initialPages: Page[],
  {
    save,
    drafts,
    assets = [],
    maxPages = Number.POSITIVE_INFINITY,
  }: { save: SaveDocument; drafts?: DraftStorage; assets?: AssetItem[]; maxPages?: number },
) {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  // Each save carries a version so a slow response never marks newer edits as saved.
  let version = 0;
  let gestureBase: Page[] | null = null;
  let lastField: { key: string; at: number } | null = null;
  let clipboard: PageElement[] = [];

  return createStore<EditorState>()((set, get) => {
    const persist = async () => {
      const sent = version;
      const result = await save(get().pages);
      if (sent !== version) return; // a newer edit is already queued
      if (result.ok) drafts?.clear();
      set(result.ok ? { saveStatus: "saved", saveError: null, dirty: false } : { saveStatus: "error", saveError: result.error });
    };

    const scheduleSave = () => {
      version += 1;
      drafts?.write(get().pages);
      set({ saveStatus: "saving", saveError: null, dirty: true });
      clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, AUTOSAVE_DELAY);
    };

    /** Applies a document change: records history (unless merged) and schedules an autosave. */
    const commit = (pages: Page[], patch: Partial<EditorState> = {}, mergeKey?: string) => {
      const now = Date.now();
      const merge = mergeKey !== undefined && lastField?.key === mergeKey && now - lastField.at < COALESCE_MS;
      lastField = mergeKey !== undefined ? { key: mergeKey, at: now } : null;
      set((s) => ({
        pages,
        past: merge ? s.past : [...s.past, s.pages].slice(-HISTORY_LIMIT),
        future: [],
        ...patch,
      }));
      scheduleSave();
    };

    const activePage = () => get().pages.find((p) => p.id === get().activePageId) ?? get().pages[0];

    /** Replaces the active page's elements through `update`. */
    const mapActive = (update: (elements: PageElement[]) => PageElement[]) => {
      const page = activePage();
      return get().pages.map((p) => (p.id === page.id ? { ...p, elements: update(p.elements) } : p));
    };

    const patchElements = (pages: Page[], patches: Record<string, ElementPatch>) =>
      pages.map((p) =>
        p.elements.some((el) => patches[el.id])
          ? { ...p, elements: p.elements.map((el) => (patches[el.id] ? applyPatch(el, patches[el.id]) : el)) }
          : p,
      );

    const nextZ = (page: Page) => Math.max(0, ...page.elements.map((el) => el.zIndex)) + 1;

    const renumber = (pages: Page[]) => pages.map((p, i) => ({ ...p, pageNumber: i + 1 }));

    const selected = () => {
      const ids = new Set(get().selectedIds);
      return activePage().elements.filter((el) => ids.has(el.id));
    };

    const addElement = (element: PageElement) => {
      commit(mapActive((els) => [...els, element]), { selectedIds: [element.id], editingId: null });
    };

    const baseElement = (page: Page, name: string, box: Pick<PageElement, "x" | "y" | "width" | "height">) => ({
      id: newId("el"),
      pageId: page.id,
      name,
      ...box,
      rotation: 0,
      opacity: 1,
      zIndex: nextZ(page),
      locked: false,
      visible: true,
    });

    /** After undo/redo the selection may point at something that no longer exists. */
    const reconcile = (pages: Page[]) => {
      const { activePageId, selectedIds } = get();
      const page = pages.find((p) => p.id === activePageId) ?? pages[pages.length - 1];
      const present = new Set(page.elements.map((el) => el.id));
      return { pages, activePageId: page.id, selectedIds: selectedIds.filter((id) => present.has(id)), editingId: null };
    };

    const firstElement = initialPages[0].elements[0];

    return {
      pages: initialPages,
      activePageId: initialPages[0].id,
      selectedIds: firstElement ? [firstElement.id] : [],
      editingId: null,
      tool: "text",
      zoom: "fit",
      fitScale: 1,
      assets,
      uploads: [],
      maxPages,
      saveStatus: "saved",
      saveError: null,
      dirty: false,
      past: [],
      future: [],

      retrySave: () => {
        clearTimeout(saveTimer);
        set({ saveStatus: "saving", saveError: null });
        void persist();
      },

      selectTool: (tool) => set({ tool }),
      setZoom: (zoom) => set({ zoom }),
      setFitScale: (fitScale) => set({ fitScale }),
      zoomBy: (direction) => {
        const { zoom, fitScale } = get();
        const current = zoom === "fit" ? fitScale : zoom;
        const steps = direction > 0 ? ZOOM_STEPS : ZOOM_STEPS.toReversed();
        const next = steps.find((z) => (direction > 0 ? z > current + 0.01 : z < current - 0.01));
        set({ zoom: next ?? (direction > 0 ? ZOOM_STEPS.at(-1)! : ZOOM_STEPS[0]) });
      },

      select: (elementId, { additive = false } = {}) => {
        if (elementId === null) return set({ selectedIds: [], editingId: null });
        const { selectedIds } = get();
        if (!additive) return set({ selectedIds: [elementId], editingId: get().editingId === elementId ? elementId : null });
        set({
          selectedIds: selectedIds.includes(elementId) ? selectedIds.filter((id) => id !== elementId) : [...selectedIds, elementId],
          editingId: null,
        });
      },
      setActivePage: (activePageId) => set({ activePageId, selectedIds: [], editingId: null }),
      startEditing: (elementId) => {
        const element = activePage().elements.find((el) => el.id === elementId);
        if (element?.type === "TEXT" && !element.locked) set({ editingId: elementId, selectedIds: [elementId] });
      },
      stopEditing: () => set({ editingId: null }),

      addPage: () => {
        const { pages } = get();
        if (pages.length >= maxPages) return;
        const template = activePage();
        const index = pages.indexOf(template);
        const page: Page = {
          ...template,
          id: newId("page"),
          background: { color: "#FFFFFF" },
          backgroundImageKey: null,
          backgroundImageUrl: null,
          elements: [],
        };
        commit(renumber([...pages.slice(0, index + 1), page, ...pages.slice(index + 1)]), {
          activePageId: page.id,
          selectedIds: [],
          editingId: null,
        });
      },

      addText: (preset) => {
        const page = activePage();
        const { name, text, props, height } = TEXT_PRESETS[preset];
        const element: TextElement = {
          ...baseElement(page, name, { x: 44, y: Math.round(page.height / 2 - height / 2), width: page.width - 88, height }),
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
        addElement(element);
      },

      addShape: (kind) => {
        const page = activePage();
        const { name, width, height, radius } = SHAPES[kind];
        const element: ShapeElement = {
          ...baseElement(page, name, {
            x: Math.round((page.width - width) / 2),
            y: Math.round((page.height - height) / 2),
            width,
            height,
          }),
          type: "SHAPE",
          properties: { shape: kind, fill: "#17150F", radius },
        };
        addElement(element);
      },

      addImage: (asset) => {
        const page = activePage();
        // Fit to 60% of the page, keeping the picture's proportions.
        const scale = Math.min((page.width * 0.6) / asset.width, (page.height * 0.6) / asset.height, 1);
        const width = Math.max(16, Math.round(asset.width * scale));
        const height = Math.max(16, Math.round(asset.height * scale));
        const element: ImageElement = {
          ...baseElement(page, asset.filename.replace(/\.[a-z0-9]+$/i, "") || "Image", {
            x: Math.round((page.width - width) / 2),
            y: Math.round((page.height - height) / 2),
            width,
            height,
          }),
          type: "IMAGE",
          properties: {
            assetKey: asset.key,
            imageUrl: asset.url,
            fit: "cover",
            placeholder: { from: "#D9D3C5", to: "#C3BCAA", label: "IMAGE", labelPosition: "center" },
          },
        };
        addElement(element);
      },

      addAsset: (asset) => set((s) => ({ assets: [asset, ...s.assets.filter((a) => a.key !== asset.key)] })),
      removeAsset: (key) => set((s) => ({ assets: s.assets.filter((a) => a.key !== key) })),
      setUpload: (upload) =>
        set((s) => ({
          uploads: s.uploads.some((u) => u.id === upload.id) ? s.uploads.map((u) => (u.id === upload.id ? upload : u)) : [...s.uploads, upload],
        })),
      removeUpload: (id) => set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),

      duplicateSelection: () => {
        const { pages } = get();
        const page = activePage();
        const sources = selected();
        if (sources.length === 0) {
          if (pages.length >= maxPages) return;
          const copyId = newId("page");
          const copy: Page = { ...page, id: copyId, elements: page.elements.map((el) => ({ ...el, id: newId("el"), pageId: copyId })) };
          const index = pages.indexOf(page);
          commit(renumber([...pages.slice(0, index + 1), copy, ...pages.slice(index + 1)]), { activePageId: copy.id, selectedIds: [] });
          return;
        }
        let z = nextZ(page);
        const copies = sources.map((el) => ({ ...el, id: newId("el"), x: el.x + 16, y: el.y + 16, zIndex: z++ }));
        commit(mapActive((els) => [...els, ...copies]), { selectedIds: copies.map((c) => c.id), editingId: null });
      },

      deleteSelection: () => {
        const { pages, selectedIds } = get();
        const page = activePage();
        if (selectedIds.length === 0) {
          if (pages.length === 1) return;
          const index = pages.indexOf(page);
          const remaining = renumber(pages.filter((p) => p.id !== page.id));
          commit(remaining, { activePageId: remaining[Math.max(0, index - 1)].id });
          return;
        }
        const doomed = new Set(selected().filter((el) => !el.locked).map((el) => el.id));
        if (doomed.size === 0) return;
        commit(
          mapActive((els) => els.filter((el) => !doomed.has(el.id))),
          { selectedIds: [], editingId: null },
        );
      },

      beginGesture: () => {
        gestureBase = get().pages;
      },
      updateElements: (patches) => {
        const pages = patchElements(get().pages, patches);
        if (gestureBase) set({ pages });
        else commit(pages);
      },
      endGesture: () => {
        const base = gestureBase;
        gestureBase = null;
        if (!base || base === get().pages) return;
        lastField = null;
        set((s) => ({ past: [...s.past, base].slice(-HISTORY_LIMIT), future: [] }));
        scheduleSave();
      },

      updateElement: (id, patch, field) => {
        commit(patchElements(get().pages, { [id]: patch }), {}, field ? `${id}:${field}` : undefined);
      },

      setText: (id, runs) => {
        const element = activePage().elements.find((el) => el.id === id);
        if (!element || element.type !== "TEXT") return;
        const empty = runs.every((run) => !run.text.trim());
        // Leaving a text box empty removes it, like in most design tools.
        if (empty) {
          commit(
            mapActive((els) => els.filter((el) => el.id !== id)),
            { selectedIds: get().selectedIds.filter((x) => x !== id), editingId: null },
          );
          return;
        }
        // Another element may already be selected (the click that ended the editing).
        const editingId = get().editingId === id ? null : get().editingId;
        const same = JSON.stringify(element.properties.runs) === JSON.stringify(runs);
        if (same) return set({ editingId });
        commit(patchElements(get().pages, { [id]: { properties: { runs } } }), { editingId });
      },

      syncHeight: (id, height) => {
        const rounded = Math.round(height);
        const element = activePage().elements.find((el) => el.id === id);
        if (!element || Math.abs(element.height - rounded) < 1) return;
        set({ pages: patchElements(get().pages, { [id]: { height: rounded } }) });
      },

      nudge: (dx, dy) => {
        const movable = selected().filter((el) => !el.locked);
        if (movable.length === 0) return;
        const patches = Object.fromEntries(movable.map((el) => [el.id, { x: el.x + dx, y: el.y + dy }]));
        commit(patchElements(get().pages, patches), {}, `nudge:${movable.map((el) => el.id).join(",")}`);
      },

      arrange: (to) => {
        const page = activePage();
        const ids = new Set(get().selectedIds);
        if (ids.size === 0) return;
        const ordered = page.elements.toSorted((a, b) => a.zIndex - b.zIndex);
        const picked = ordered.filter((el) => ids.has(el.id));
        const rest = ordered.filter((el) => !ids.has(el.id));
        let result: PageElement[];
        if (to === "front") result = [...rest, ...picked];
        else if (to === "back") result = [...picked, ...rest];
        else {
          result = [...ordered];
          const step = to === "forward" ? 1 : -1;
          const indexes = picked.map((el) => result.indexOf(el));
          for (const index of step > 0 ? indexes.toReversed() : indexes) {
            const target = index + step;
            if (target < 0 || target >= result.length || ids.has(result[target].id)) continue;
            [result[index], result[target]] = [result[target], result[index]];
          }
        }
        const z = new Map(result.map((el, i) => [el.id, i + 1]));
        commit(mapActive((els) => els.map((el) => ({ ...el, zIndex: z.get(el.id) ?? el.zIndex }))));
      },

      align: (to) => {
        const items = selected().filter((el) => !el.locked);
        if (items.length === 0) return;
        const page = activePage();
        // One element aligns to the page; several align to their shared bounds.
        const area =
          items.length === 1
            ? { left: 0, top: 0, right: page.width, bottom: page.height }
            : {
                left: Math.min(...items.map((el) => el.x)),
                top: Math.min(...items.map((el) => el.y)),
                right: Math.max(...items.map((el) => el.x + el.width)),
                bottom: Math.max(...items.map((el) => el.y + el.height)),
              };
        const patches = Object.fromEntries(
          items.map((el) => {
            const patch: ElementPatch =
              to === "left"
                ? { x: area.left }
                : to === "right"
                  ? { x: area.right - el.width }
                  : to === "center"
                    ? { x: Math.round((area.left + area.right - el.width) / 2) }
                    : to === "top"
                      ? { y: area.top }
                      : to === "bottom"
                        ? { y: area.bottom - el.height }
                        : { y: Math.round((area.top + area.bottom - el.height) / 2) };
            return [el.id, patch];
          }),
        );
        commit(patchElements(get().pages, patches));
      },

      toggleLock: (id) => {
        const element = activePage().elements.find((el) => el.id === id);
        if (element) commit(patchElements(get().pages, { [id]: { locked: !element.locked } }));
      },
      toggleVisible: (id) => {
        const element = activePage().elements.find((el) => el.id === id);
        if (element) commit(patchElements(get().pages, { [id]: { visible: !element.visible } }));
      },

      copy: () => {
        clipboard = selected().map((el) => structuredClone(el));
      },
      paste: () => {
        if (clipboard.length === 0) return;
        const page = activePage();
        let z = nextZ(page);
        const pasted = clipboard.map((el) => ({ ...structuredClone(el), id: newId("el"), pageId: page.id, x: el.x + 16, y: el.y + 16, zIndex: z++ }));
        // Pasting again keeps stepping down and to the right.
        clipboard = pasted.map((el) => structuredClone(el));
        commit(mapActive((els) => [...els, ...pasted]), { selectedIds: pasted.map((el) => el.id), editingId: null });
      },

      reorderPage: (from, to) => {
        const { pages } = get();
        if (from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return;
        const next = [...pages];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        commit(renumber(next));
      },

      setPageBackground: (color) => {
        const page = activePage();
        commit(
          get().pages.map((p) => (p.id === page.id ? { ...p, background: { ...p.background, color } } : p)),
          {},
          `${page.id}:background`,
        );
      },

      restore: (pages) => {
        if (pages.length === 0) return;
        commit(pages, { activePageId: pages[0].id, selectedIds: [], editingId: null });
      },

      undo: () => {
        const { past, pages, future } = get();
        if (past.length === 0) return;
        lastField = null;
        const previous = past[past.length - 1];
        set({ ...reconcile(previous), past: past.slice(0, -1), future: [pages, ...future] });
        scheduleSave();
      },

      redo: () => {
        const { past, pages, future } = get();
        if (future.length === 0) return;
        lastField = null;
        const [next, ...rest] = future;
        set({ ...reconcile(next), past: [...past, pages], future: rest });
        scheduleSave();
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;
