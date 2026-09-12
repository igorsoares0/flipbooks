import { describe, expect, it } from "vitest";
import { clampSpread, lastSpread, spreadLabel, spreadOf, spreadPages } from "./spreads";

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
