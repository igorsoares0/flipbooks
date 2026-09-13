import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page, ShapeElement, TextElement } from "@/lib/types";
import { AUTOSAVE_DELAY, COALESCE_MS, createEditorStore, type DraftStorage, type SaveDocument } from "./editor-store";

function heading(pageId: string): TextElement {
  return {
    id: `${pageId}_heading`,
    pageId,
    name: "Heading",
    x: 44,
    y: 56,
    width: 432,
    height: 162,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    locked: false,
    visible: true,
    type: "TEXT",
    properties: {
      runs: [{ text: "Summer" }],
      fontFamily: "serif",
      fontSize: 52,
      fontWeight: 400,
      color: "#17150F",
      align: "left",
      lineHeight: 1.02,
      letterSpacing: -1.5,
    },
  };
}

function page(n: number, withHeading = false): Page {
  const id = `p${n}`;
  return {
    id,
    flipbookId: "fb_test",
    pageNumber: n,
    width: 520,
    height: 690,
    background: { color: "#FFFFFF" },
    backgroundImageKey: null,
    elements: withHeading ? [heading(id)] : [],
  };
}

function box(pageId: string, id: string, x: number, zIndex: number): ShapeElement {
  return {
    id,
    pageId,
    name: id,
    x,
    y: 100,
    width: 50,
    height: 50,
    rotation: 0,
    opacity: 1,
    zIndex,
    locked: false,
    visible: true,
    type: "SHAPE",
    properties: { shape: "rect", fill: "#17150F", radius: 0 },
  };
}

const okSave: SaveDocument = async () => ({ ok: true });
const setup = (save: SaveDocument = okSave) => createEditorStore([page(1, true), page(2)], { save });
const active = (store: ReturnType<typeof setup>) => {
  const s = store.getState();
  return s.pages.find((p) => p.id === s.activePageId)!;
};

describe("editor store", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts on the first page with its first element selected", () => {
    const store = setup();
    expect(store.getState().activePageId).toBe("p1");
    expect(store.getState().selectedIds).toEqual(["p1_heading"]);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("selecting a page clears the element selection", () => {
    const store = setup();
    store.getState().setActivePage("p2");
    expect(store.getState().selectedIds).toEqual([]);
  });

  it("adds a page after the current one, selects it, and flips the save indicator", async () => {
    const store = setup();
    store.getState().addPage();
    const { pages, activePageId, saveStatus } = store.getState();
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(pages[2].id).toBe("p2");
    expect(activePageId).toBe(pages[1].id);
    expect(saveStatus).toBe("saving");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("adds text presets on top of existing elements and selects them", () => {
    const store = setup();
    store.getState().addText("heading");
    const added = active(store).elements.at(-1)!;
    expect(added.type).toBe("TEXT");
    expect(added.name).toBe("Heading");
    expect(added.zIndex).toBe(2);
    expect(store.getState().selectedIds).toEqual([added.id]);
  });

  it("adds shapes centered on the page", () => {
    const store = setup();
    store.getState().addShape("ellipse");
    const shape = active(store).elements.at(-1)!;
    expect(shape.type === "SHAPE" && shape.properties.shape).toBe("ellipse");
    expect(shape.x + shape.width / 2).toBe(260);
  });

  it("undoes and redoes document changes without touching the server", () => {
    const store = setup();
    store.getState().addText("body");
    expect(active(store).elements).toHaveLength(2);

    store.getState().undo();
    expect(active(store).elements).toHaveLength(1);
    expect(store.getState().selectedIds).toEqual([]); // the undone element is gone
    expect(store.getState().future).toHaveLength(1);

    store.getState().redo();
    expect(active(store).elements).toHaveLength(2);
    expect(store.getState().future).toHaveLength(0);
  });

  it("clears redo history after a new change", () => {
    const store = setup();
    store.getState().addText("body");
    store.getState().undo();
    store.getState().addShape("rect");
    expect(store.getState().future).toHaveLength(0);
  });

  it("duplicates the selected element with an offset", () => {
    const store = setup();
    store.getState().duplicateSelection();
    const [original, copy] = active(store).elements;
    expect(copy.id).not.toBe(original.id);
    expect(copy.x).toBe(original.x + 16);
    expect(store.getState().selectedIds).toEqual([copy.id]);
  });

  it("duplicates the page when the page is selected and renumbers", () => {
    const store = setup();
    store.getState().select(null);
    store.getState().duplicateSelection();
    const { pages } = store.getState();
    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(pages[1].elements[0].pageId).toBe(pages[1].id);
    expect(pages[1].elements[0].id).not.toBe(pages[0].elements[0].id);
  });

  it("deletes the selected element", () => {
    const store = setup();
    store.getState().deleteSelection();
    expect(active(store).elements).toHaveLength(0);
    expect(store.getState().selectedIds).toEqual([]);
  });

  it("deletes the selected page but never the last one", () => {
    const store = setup();
    store.getState().setActivePage("p2");
    store.getState().deleteSelection();
    expect(store.getState().pages).toHaveLength(1);
    expect(store.getState().activePageId).toBe("p1");

    store.getState().select(null);
    store.getState().deleteSelection();
    expect(store.getState().pages).toHaveLength(1);
  });

  it("restores a deleted page on undo and keeps the active page valid", () => {
    const store = setup();
    store.getState().addPage();
    store.getState().undo();
    const { pages, activePageId } = store.getState();
    expect(pages).toHaveLength(2);
    expect(pages.some((p) => p.id === activePageId)).toBe(true);
  });
});

describe("editor autosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("batches quick edits into one save of the latest document", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = setup(save);
    store.getState().addText("heading");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY / 2);
    store.getState().addShape("rect");
    expect(store.getState().dirty).toBe(true);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0][0].elements).toHaveLength(3);
    expect(store.getState()).toMatchObject({ saveStatus: "saved", dirty: false });
  });

  it("reports failures and saves again on retry", async () => {
    const save = vi
      .fn<SaveDocument>()
      .mockResolvedValueOnce({ ok: false, error: "Network down" })
      .mockResolvedValueOnce({ ok: true });
    const store = setup(save);
    store.getState().addPage();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(store.getState()).toMatchObject({ saveStatus: "error", saveError: "Network down", dirty: true });

    store.getState().retrySave();
    await vi.waitFor(() => expect(store.getState().saveStatus).toBe("saved"));
    expect(save).toHaveBeenCalledTimes(2);
    expect(store.getState().dirty).toBe(false);
  });

  it("never marks newer edits as saved when an older save finishes late", async () => {
    let finishFirst: (value: { ok: true }) => void = () => {};
    const save = vi
      .fn<SaveDocument>()
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue({ ok: true });
    const store = setup(save);

    store.getState().addPage();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY); // first save in flight
    store.getState().addPage(); // newer edit while it is pending
    finishFirst({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getState()).toMatchObject({ saveStatus: "saving", dirty: true });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toHaveLength(4);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("saves after undo and redo too", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = setup(save);
    store.getState().addPage();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    store.getState().undo();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toHaveLength(2);
  });

  it("does not save when nothing changed", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = setup(save);
    store.getState().select(null);
    store.getState().setActivePage("p2");
    store.getState().selectTool("shapes");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY * 2);
    expect(save).not.toHaveBeenCalled();
  });
});

describe("editor gestures and edits", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const withBoxes = (save: SaveDocument = okSave, drafts?: DraftStorage) => {
    const first = page(1, true);
    first.elements.push(box("p1", "a", 10, 2), box("p1", "b", 200, 3), box("p1", "c", 400, 4));
    return createEditorStore([first, page(2)], { save, drafts });
  };
  const el = (store: ReturnType<typeof withBoxes>, id: string) => active(store).elements.find((e) => e.id === id)!;

  it("records a whole drag as one undo step and saves once", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = withBoxes(save);
    const s = store.getState();
    s.beginGesture();
    for (const x of [20, 30, 40]) store.getState().updateElements({ a: { x } });
    expect(store.getState().past).toHaveLength(0); // live updates only
    store.getState().endGesture();
    expect(store.getState().past).toHaveLength(1);
    expect(el(store, "a").x).toBe(40);

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(1);

    store.getState().undo();
    expect(el(store, "a").x).toBe(10);
  });

  it("ignores a gesture that changed nothing", () => {
    const store = withBoxes();
    store.getState().beginGesture();
    store.getState().endGesture();
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("merges quick edits of the same field into one undo step", () => {
    const store = withBoxes();
    const { updateElement } = store.getState();
    updateElement("a", { x: 11 }, "x");
    updateElement("a", { x: 12 }, "x");
    updateElement("a", { x: 123 }, "x");
    expect(store.getState().past).toHaveLength(1);

    updateElement("a", { y: 5 }, "y"); // another field is another step
    expect(store.getState().past).toHaveLength(2);

    vi.advanceTimersByTime(COALESCE_MS + 1);
    updateElement("a", { y: 6 }, "y"); // and so is a pause
    expect(store.getState().past).toHaveLength(3);

    store.getState().undo();
    store.getState().undo();
    store.getState().undo();
    expect(el(store, "a")).toMatchObject({ x: 10, y: 100 });
  });

  it("merges property changes into the element's properties", () => {
    const store = withBoxes();
    store.getState().updateElement("a", { properties: { fill: "#1B45D6" } }, "fill");
    expect(el(store, "a").properties).toEqual({ shape: "rect", fill: "#1B45D6", radius: 0 });
  });

  it("sets text runs, keeping italic, and removes text left empty", () => {
    const store = withBoxes();
    store.getState().startEditing("p1_heading");
    expect(store.getState().editingId).toBe("p1_heading");
    store.getState().setText("p1_heading", [{ text: "Summer " }, { text: "Catalog", italic: true }]);
    const heading = el(store, "p1_heading") as TextElement;
    expect(heading.properties.runs).toEqual([{ text: "Summer " }, { text: "Catalog", italic: true }]);
    expect(store.getState().editingId).toBeNull();

    store.getState().setText("p1_heading", [{ text: "  " }]);
    expect(active(store).elements.some((e) => e.id === "p1_heading")).toBe(false);
  });

  it("only edits unlocked text inline", () => {
    const store = withBoxes();
    store.getState().startEditing("a");
    expect(store.getState().editingId).toBeNull();
    store.getState().toggleLock("p1_heading");
    store.getState().startEditing("p1_heading");
    expect(store.getState().editingId).toBeNull();
  });

  it("builds a multi-selection with additive clicks", () => {
    const store = withBoxes();
    store.getState().select("a");
    store.getState().select("b", { additive: true });
    store.getState().select("c", { additive: true });
    store.getState().select("b", { additive: true }); // toggles off
    expect(store.getState().selectedIds).toEqual(["a", "c"]);
  });

  it("nudges and deletes the selection, but never locked elements", () => {
    const store = withBoxes();
    store.getState().toggleLock("b");
    store.getState().select("a");
    store.getState().select("b", { additive: true });
    store.getState().nudge(10, -1);
    expect(el(store, "a")).toMatchObject({ x: 20, y: 99 });
    expect(el(store, "b")).toMatchObject({ x: 200, y: 100 });

    store.getState().deleteSelection();
    expect(active(store).elements.map((e) => e.id)).toEqual(["p1_heading", "b", "c"]);
  });

  it("aligns several elements to their shared bounds", () => {
    const store = withBoxes();
    store.getState().select("a");
    store.getState().select("c", { additive: true });
    store.getState().align("right");
    expect(el(store, "a").x).toBe(400);
    store.getState().align("center");
    expect(el(store, "a").x).toBe(400);
  });

  it("aligns a single element to the page", () => {
    const store = withBoxes();
    store.getState().select("a");
    store.getState().align("center");
    expect(el(store, "a").x).toBe(235); // (520 - 50) / 2
  });

  it("arranges layers", () => {
    const store = withBoxes();
    const order = () => active(store).elements.toSorted((x, y) => x.zIndex - y.zIndex).map((e) => e.id);
    store.getState().select("a");
    store.getState().arrange("front");
    expect(order()).toEqual(["p1_heading", "b", "c", "a"]);
    store.getState().arrange("backward");
    expect(order()).toEqual(["p1_heading", "b", "a", "c"]);
    store.getState().arrange("back");
    expect(order()).toEqual(["a", "p1_heading", "b", "c"]);
    store.getState().arrange("forward");
    expect(order()).toEqual(["p1_heading", "a", "b", "c"]);
  });

  it("copies and pastes with fresh ids, stepping each paste", () => {
    const store = withBoxes();
    store.getState().select("a");
    store.getState().copy();
    store.getState().paste();
    store.getState().paste();
    const pasted = active(store).elements.slice(-2);
    expect(pasted.map((e) => e.x)).toEqual([26, 42]);
    expect(new Set(active(store).elements.map((e) => e.id)).size).toBe(active(store).elements.length);
    expect(store.getState().selectedIds).toEqual([pasted[1].id]);
  });

  it("pastes onto the page being viewed", () => {
    const store = withBoxes();
    store.getState().select("a");
    store.getState().copy();
    store.getState().setActivePage("p2");
    store.getState().paste();
    expect(active(store).elements).toHaveLength(1);
    expect(active(store).elements[0].pageId).toBe("p2");
  });

  it("places an uploaded image fitted to the page with its proportions", () => {
    const store = withBoxes();
    store.getState().addImage({ id: "as1", key: "assets/u/1.jpg", url: "https://x/1.jpg", filename: "beach.jpg", width: 2000, height: 1000 });
    const image = active(store).elements.at(-1)!;
    expect(image.type).toBe("IMAGE");
    expect(image.name).toBe("beach");
    expect(image.width).toBe(312); // 60% of 520
    expect(image.height).toBe(156);
    expect(image.type === "IMAGE" && image.properties).toMatchObject({ assetKey: "assets/u/1.jpg", imageUrl: "https://x/1.jpg" });
  });

  it("reorders pages, renumbers them, and undoes", () => {
    const store = createEditorStore([page(1), page(2), page(3)], { save: okSave });
    store.getState().reorderPage(0, 2);
    expect(store.getState().pages.map((p) => [p.id, p.pageNumber])).toEqual([
      ["p2", 1],
      ["p3", 2],
      ["p1", 3],
    ]);
    store.getState().undo();
    expect(store.getState().pages.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("sets the page background", () => {
    const store = withBoxes();
    store.getState().setPageBackground("#F4EFE6");
    expect(active(store).background.color).toBe("#F4EFE6");
  });

  it("keeps text heights in sync without an undo step or a save", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = withBoxes(save);
    store.getState().syncHeight("p1_heading", 120.4);
    expect(el(store, "p1_heading").height).toBe(120);
    expect(store.getState().past).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).not.toHaveBeenCalled();
  });

  it("steps through zoom levels from the fitted scale", () => {
    const store = withBoxes();
    store.getState().setFitScale(0.8);
    store.getState().zoomBy(1);
    expect(store.getState().zoom).toBe(1);
    store.getState().zoomBy(-1);
    store.getState().zoomBy(-1);
    expect(store.getState().zoom).toBe(0.5);
    store.getState().zoomBy(-1);
    expect(store.getState().zoom).toBe(0.5);
  });

  it("writes a local draft on every edit and clears it once saved", async () => {
    const drafts = { write: vi.fn(), clear: vi.fn() };
    const store = withBoxes(okSave, drafts);
    store.getState().nudge(1, 1); // the heading starts selected
    expect(drafts.write).toHaveBeenCalledTimes(1);
    expect(drafts.clear).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(drafts.clear).toHaveBeenCalledTimes(1);
  });

  it("keeps the draft when saving fails", async () => {
    const drafts = { write: vi.fn(), clear: vi.fn() };
    const store = withBoxes(async () => ({ ok: false, error: "offline" }), drafts);
    store.getState().addPage();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(drafts.clear).not.toHaveBeenCalled();
  });

  it("restores a recovered document as an undoable, saved change", async () => {
    const save = vi.fn<SaveDocument>(async () => ({ ok: true }));
    const store = withBoxes(save);
    store.getState().restore([page(7)]);
    expect(store.getState().pages.map((p) => p.id)).toEqual(["p7"]);
    expect(store.getState().activePageId).toBe("p7");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(1);
    store.getState().undo();
    expect(store.getState().pages).toHaveLength(2);
  });
});
