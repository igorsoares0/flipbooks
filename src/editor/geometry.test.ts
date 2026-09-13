import { describe, expect, it } from "vitest";
import { bounds, normalizeAngle, resizeBox, rotateTo, roundBox, snapMove, type Box } from "./geometry";

const box: Box = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
const rounded = (b: Box) => ({ ...roundBox(b), rotation: b.rotation });

describe("resizeBox", () => {
  it("moves only the dragged edge", () => {
    expect(resizeBox(box, "e", 50, 999)).toEqual({ ...box, width: 250 });
    expect(resizeBox(box, "w", 50, 0)).toEqual({ ...box, x: 150, width: 150 });
    expect(resizeBox(box, "n", 0, -20)).toEqual({ ...box, y: 80, height: 120 });
    expect(resizeBox(box, "se", 10, 20)).toEqual({ ...box, width: 210, height: 120 });
  });

  it("keeps the aspect ratio from a corner", () => {
    const result = resizeBox(box, "se", 100, 0, { keepAspect: true });
    expect([result.width, result.height]).toEqual([300, 150]);
    expect([result.x, result.y]).toEqual([100, 100]); // the opposite corner stays put
  });

  it("never goes below the minimum size", () => {
    expect(resizeBox(box, "e", -500, 0, { minSize: 10 }).width).toBe(10);
  });

  it("keeps the opposite edge fixed on rotated boxes", () => {
    const rotated: Box = { ...box, rotation: 90 };
    // Rotated 90°: the box's "east" edge points down. Dragging 50 down widens it by 50.
    const result = resizeBox(rotated, "e", 0, 50);
    // Unrotated x shifts because the width grows around the center; what matters is the anchor below.
    expect(rounded(result)).toEqual({ x: 75, y: 125, width: 250, height: 100, rotation: 90 });
    // The west edge (now at the top) did not move.
    expect(bounds(result).top).toBeCloseTo(bounds(rotated).top);
  });
});

describe("rotateTo", () => {
  const center = { x: 0, y: 0, width: 100, height: 100, rotation: 0 }; // center at (50, 50)

  it("points the top handle at the pointer", () => {
    expect(rotateTo(center, 50, -100)).toBe(0);
    expect(rotateTo(center, 200, 50)).toBe(90);
    expect(rotateTo(center, 50, 200)).toBe(180);
    expect(rotateTo(center, -100, 50)).toBe(-90);
  });

  it("snaps to 15° steps with Shift", () => {
    expect(rotateTo(center, 200, 20, { snap: true }) % 15).toBe(0);
  });

  it("normalizes into (-180, 180]", () => {
    expect([normalizeAngle(190), normalizeAngle(-190), normalizeAngle(540), normalizeAngle(-180)]).toEqual([-170, 170, 180, 180]);
  });
});

describe("snapMove", () => {
  const page = { width: 520, height: 690 };

  it("snaps the center to the page center and returns guides", () => {
    const moving: Box = { x: 208, y: 40, width: 100, height: 50, rotation: 0 }; // center x = 258
    const result = snapMove(moving, page, [], 5);
    expect(result.x).toBe(210); // center now at 260
    expect(result.guides).toEqual([{ axis: "x", at: 260 }]);
  });

  it("snaps edges to other elements", () => {
    const other: Box = { x: 44, y: 300, width: 100, height: 100, rotation: 0 };
    const moving: Box = { x: 47, y: 120, width: 60, height: 60, rotation: 0 };
    const result = snapMove(moving, page, [other], 5);
    expect(result.x).toBe(44);
    expect(result.guides).toContainEqual({ axis: "x", at: 44 });
  });

  it("leaves distant boxes alone", () => {
    const moving: Box = { x: 120, y: 120, width: 60, height: 60, rotation: 0 };
    expect(snapMove(moving, page, [], 5)).toEqual({ x: 120, y: 120, guides: [] });
  });
});
