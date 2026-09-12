import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page, TextElement } from "@/lib/types";
import { createEditorStore } from "./editor-store";

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

const setup = () => createEditorStore([page(1, true), page(2)]);
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

  it("adds a page at the end, selects it, and flips the save indicator", () => {
    const store = setup();
    store.getState().addPage();
    const { pages, activePageId, saveStatus } = store.getState();
    expect(pages).toHaveLength(3);
    expect(pages[2].pageNumber).toBe(3);
    expect(activePageId).toBe(pages[2].id);
    expect(saveStatus).toBe("saving");
    vi.advanceTimersByTime(900);
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
