import { describe, expect, it } from "vitest";
import { clampSpread, clampView, lastSpread, lastView, spreadLabel, spreadOf, spreadPages, viewLabel, viewOfPage, viewPages } from "./spreads";

describe("spreads", () => {
  it("shows the cover alone on the right", () => {
    expect(spreadOf(1)).toBe(0);
    expect(spreadPages(0, 64)).toEqual({ left: null, right: 1 });
    expect(spreadLabel(0, 64)).toBe("1");
  });

  it("pairs even and odd pages", () => {
    expect(spreadOf(4)).toBe(2);
    expect(spreadOf(5)).toBe(2);
    expect(spreadPages(2, 64)).toEqual({ left: 4, right: 5 });
    expect(spreadLabel(2, 64)).toBe("4–5");
  });

  it("shows an even last page alone on the left", () => {
    expect(lastSpread(64)).toBe(32);
    expect(spreadPages(32, 64)).toEqual({ left: 64, right: null });
    expect(spreadLabel(32, 64)).toBe("64");
  });

  it("ends on a full spread when the page count is odd", () => {
    expect(lastSpread(7)).toBe(3);
    expect(spreadPages(3, 7)).toEqual({ left: 6, right: 7 });
  });

  it("handles a single-page flipbook", () => {
    expect(lastSpread(1)).toBe(0);
    expect(spreadLabel(0, 1)).toBe("1");
  });

  it("clamps navigation to the book", () => {
    expect(clampSpread(-1, 64)).toBe(0);
    expect(clampSpread(40, 64)).toBe(32);
    expect(clampSpread(5, 64)).toBe(5);
  });
});

describe("views", () => {
  it("shows two pages on a wide screen and one on a phone", () => {
    expect(viewPages(2, 64, "spread")).toEqual({ left: 4, right: 5 });
    expect(viewPages(4, 64, "single")).toEqual({ left: null, right: 5 });
    expect(lastView(64, "spread")).toBe(32);
    expect(lastView(64, "single")).toBe(63);
  });

  it("keeps the reader's page when the layout changes", () => {
    expect(viewOfPage(7, "spread")).toBe(3);
    expect(viewOfPage(7, "single")).toBe(6);
    expect(viewPages(viewOfPage(7, "single"), 64, "single")).toEqual({ left: null, right: 7 });
  });

  it("clamps and labels single pages", () => {
    expect(clampView(99, 64, "single")).toBe(63);
    expect(viewLabel(63, 64, "single")).toBe("64");
    expect(viewLabel(2, 64, "spread")).toBe("4–5");
  });
});
