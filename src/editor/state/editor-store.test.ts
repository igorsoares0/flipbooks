import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page, TextElement } from "@/lib/types";
import { AUTOSAVE_DELAY, createEditorStore, type SaveDocument } from "./editor-store";

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
    expect(store.getState().selectedId).toBe("p1_heading");
    expect(store.getState().saveStatus).toBe("saved");
  });

  it("selecting a page clears the element selection", () => {
    const store = setup();
    store.getState().setActivePage("p2");
    expect(store.getState().selectedId).toBeNull();
  });

  it("adds a page at the end, selects it, and flips the save indicator", async () => {
    const store = setup();
    store.getState().addPage();
    const { pages, activePageId, saveStatus } = store.getState();
    expect(pages).toHaveLength(3);
    expect(pages[2].pageNumber).toBe(3);
    expect(activePageId).toBe(pages[2].id);
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
    expect(store.getState().selectedId).toBe(added.id);
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
    expect(store.getState().selectedId).toBeNull(); // the undone element is gone
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
    expect(store.getState().selectedId).toBe(copy.id);
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
    expect(store.getState().selectedId).toBeNull();
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
