import { describe, expect, it } from "vitest";
import {
  canTurn,
  completesOnRelease,
  dragProgress,
  dragSkew,
  ease,
  fold,
  foldPoint,
  startTurn,
  targetOf,
  turnFrames,
  type Point,
  type Turn,
} from "./turn-state";

const forward = (from: number, progress = 0, extra: Partial<Turn> = {}): Turn => ({
  from,
  direction: "forward",
  progress,
  dragging: false,
  corner: "bottom",
  skew: 0,
  ...extra,
});
const backward = (from: number, progress = 0, extra: Partial<Turn> = {}): Turn => ({ ...forward(from, progress, extra), direction: "backward" });

/** A page one unit wide and a third taller, the shape of the seeded books. */
const ASPECT = 4 / 3;

const area = (points: Point[]) =>
  Math.abs(
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + (p.x * q.y - q.x * p.y);
    }, 0) / 2,
  );

/** Where the flap layer's transform sends one of its own points. */
const applyMatrix = (m: readonly number[], p: Point): Point => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});

describe("starting a turn", () => {
  it("won't turn past the covers", () => {
    expect(canTurn(0, "backward", 64, "spread")).toBe(false);
    expect(canTurn(0, "forward", 64, "spread")).toBe(true);
    expect(canTurn(32, "forward", 64, "spread")).toBe(false); // last spread of 64 pages
    expect(startTurn(0, "backward", 64, "spread")).toBeNull();
    expect(startTurn(0, "forward", 64, "spread")).toEqual({ from: 0, direction: "forward", progress: 0, dragging: false, corner: "bottom", skew: 0 });
  });

  it("counts single pages on a phone", () => {
    expect(canTurn(63, "forward", 64, "single")).toBe(false); // page 64 is the last
    expect(canTurn(32, "forward", 64, "single")).toBe(true);
    expect(targetOf(forward(4))).toBe(5);
    expect(targetOf(backward(4))).toBe(3);
  });
});

describe("dragging", () => {
  it("measures how far the sheet was carried, in both directions", () => {
    expect(dragProgress(forward(2), -250, 500)).toBeCloseTo(0.5);
    expect(dragProgress(forward(2), 250, 500)).toBe(0); // dragging the wrong way does nothing
    expect(dragProgress(backward(2), 500, 500)).toBe(1);
    expect(dragProgress(backward(2), 900, 500)).toBe(1); // never past a full turn
  });

  it("measures the drift that tilts the fold", () => {
    expect(dragSkew(-300, 600)).toBeCloseTo(-0.5);
    expect(dragSkew(900, 600)).toBe(1); // clamped to the page
  });

  it("completes when dragged far enough, or flicked fast", () => {
    expect(completesOnRelease(0.45, 0)).toBe(true);
    expect(completesOnRelease(0.2, 0)).toBe(false);
    expect(completesOnRelease(0.12, 0.004)).toBe(true); // a quick flick
    expect(completesOnRelease(0.12, 0.0005)).toBe(false);
  });
});

describe("what the turn shows", () => {
  it("keeps the page being covered until the sheet lands on it", () => {
    // Turning 4–5 towards 6–7: page 4 stays put, page 7 is revealed at once.
    expect(turnFrames(forward(2), 64, "spread")).toEqual({ under: 3, left: 4, right: 7, side: "right", front: 5, back: 6 });
  });

  it("mirrors that when turning back", () => {
    expect(turnFrames(backward(2), 64, "spread")).toEqual({ under: 1, left: 2, right: 5, side: "left", front: 4, back: 3 });
  });

  it("opens the cover onto the first spread", () => {
    expect(turnFrames(forward(0), 64, "spread")).toEqual({ under: 1, left: null, right: 3, side: "right", front: 1, back: 2 });
  });

  it("turns one page with a blank back on a phone", () => {
    expect(turnFrames(forward(4), 64, "single")).toEqual({ under: 5, left: null, right: 6, side: "right", front: 5, back: null });
  });
});

describe("the corner being carried", () => {
  it("travels from the outer edge to a page's width past the spine", () => {
    expect(foldPoint(forward(2, 0), ASPECT)).toEqual({ x: 1, y: ASPECT });
    expect(foldPoint(forward(2, 1), ASPECT).x).toBeCloseTo(-1);
    // Turning back, the left page's corner goes the other way.
    expect(foldPoint(backward(2, 0), ASPECT).x).toBe(0);
    expect(foldPoint(backward(2, 1), ASPECT).x).toBeCloseTo(2);
  });

  it("takes the top corner when that is the one grabbed", () => {
    expect(foldPoint(forward(2, 0, { corner: "top" }), ASPECT)).toEqual({ x: 1, y: 0 });
  });

  it("swings off the straight path on a click, and follows the pointer on a drag", () => {
    // A click arcs towards the middle of the book…
    expect(foldPoint(forward(2, 0.5), ASPECT).y).toBeLessThan(ASPECT);
    // …while a drag puts the corner wherever the finger is.
    expect(foldPoint(forward(2, 0.5, { dragging: true, skew: 0 }), ASPECT).y).toBeCloseTo(ASPECT);
    expect(foldPoint(forward(2, 0.5, { dragging: true, skew: -0.25 }), ASPECT).y).toBeCloseTo(ASPECT - 0.25 * ASPECT);
  });

  it("never stretches the sheet past its own width", () => {
    const point = foldPoint(forward(2, 1, { dragging: true, skew: -1 }), ASPECT);
    // The spine-side corner it hinges on stays one page width away.
    expect(Math.hypot(point.x - 0, point.y - ASPECT)).toBeCloseTo(1);
  });
});

describe("the fold", () => {
  it("lies flat with nothing folded over before the turn starts", () => {
    const flat = fold(forward(2, 0), ASPECT);
    expect(flat.flap).toEqual([]);
    expect(area(flat.flat)).toBeCloseTo(ASPECT);
  });

  it("covers the whole page once the turn is done", () => {
    const done = fold(forward(2, 1), ASPECT);
    expect(area(done.flat)).toBeCloseTo(0);
    expect(area(done.flap)).toBeCloseTo(ASPECT);
  });

  it("splits the page in two without losing or overlapping any of it", () => {
    for (const turn of [forward(2, 0.3), forward(2, 0.7), forward(2, 0.5, { corner: "top" }), backward(2, 0.4), forward(2, 0.6, { dragging: true, skew: -0.4 })]) {
      const { flat, flap } = fold(turn, ASPECT);
      expect(area(flat) + area(flap)).toBeCloseTo(ASPECT);
      for (const p of [...flat, ...flap]) {
        expect(p.x).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x).toBeLessThanOrEqual(1 + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(-1e-9);
        expect(p.y).toBeLessThanOrEqual(ASPECT + 1e-9);
      }
    }
  });

  it("cuts a corner off early on and a strip off later", () => {
    expect(fold(forward(2, 0.15), ASPECT).flap).toHaveLength(3); // a triangle at the corner
    expect(fold(forward(2, 0.5, { dragging: true }), ASPECT).flap).toHaveLength(4); // a straight fold
  });

  it("lands the grabbed corner exactly where it was carried to", () => {
    const turn = forward(2, 0.45, { dragging: true, skew: -0.3 });
    const { matrix, point } = fold(turn, ASPECT);
    // The flap draws the sheet's other face, so the corner sits at its mirrored coordinate.
    const landed = applyMatrix(matrix, { x: 0, y: ASPECT });
    expect(landed.x).toBeCloseTo(point.x);
    expect(landed.y).toBeCloseTo(point.y);
  });

  it("turns the page the right way round, not back to front", () => {
    // A completed forward turn drops the next page flat on the facing half.
    const { matrix } = fold(forward(2, 1), ASPECT);
    expect(applyMatrix(matrix, { x: 0, y: 0 }).x).toBeCloseTo(-1);
    expect(applyMatrix(matrix, { x: 1, y: 0 }).x).toBeCloseTo(0);
    expect(applyMatrix(matrix, { x: 0, y: ASPECT }).y).toBeCloseTo(ASPECT);
  });

  it("eases in and out, without overshooting", () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(1)).toBe(1);
    expect(ease(0.25)).toBeLessThan(0.25); // slow at the start
    expect(ease(0.75)).toBeGreaterThan(0.75); // and at the end
  });
});
