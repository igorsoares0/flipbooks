import { clampView, lastView, viewPages, type ViewMode } from "./spreads";

// The page turn as pure state and pure geometry, so the fiddly parts (how far, which way,
// does a release complete or spring back, where the fold lands) are decided without a DOM
// and unit-tested on their own.

export type Direction = "forward" | "backward";
/** Which corner of the page is being carried over. */
export type Corner = "top" | "bottom";

export type Turn = {
  /** The spread the book is on while the page is folded. */
  from: number;
  direction: Direction;
  /** 0 = flat, 1 = fully turned. */
  progress: number;
  /** A drag follows the pointer; a release (or a click) animates on its own. */
  dragging: boolean;
  corner: Corner;
  /** How far the pointer has drifted from the corner, in page heights. Tilts the fold. */
  skew: number;
};

/** Past this much of the way, a released page completes instead of springing back. */
export const COMPLETE_AT = 0.4;
/** A quick flick completes even from a short drag, in progress per millisecond. */
export const FLICK_SPEED = 0.0015;
export const TURN_MS = 620;
/**
 * How high a clicked turn lifts the corner off its straight path, in page widths. It sets
 * the slant of the crease: this much gives roughly the 27° the commercial readers fold at.
 */
export const CLICK_LIFT = 0.33;
export const targetOf = (turn: Turn) => turn.from + (turn.direction === "forward" ? 1 : -1);

/** Whether the book can turn that way at all. */
export function canTurn(view: number, direction: Direction, pageCount: number, mode: ViewMode) {
  const target = view + (direction === "forward" ? 1 : -1);
  return target >= 0 && target <= lastView(pageCount, mode);
}

export function startTurn(
  view: number,
  direction: Direction,
  pageCount: number,
  mode: ViewMode,
  { dragging = false, corner = "bottom" as Corner, skew = 0 } = {},
): Turn | null {
  if (!canTurn(view, direction, pageCount, mode)) return null;
  return { from: view, direction, progress: 0, dragging, corner, skew };
}

/**
 * How far a drag has taken the fold. `dx` is the pointer's travel in pixels and `width`
 * the width of one page: dragging a whole page's width is a complete turn.
 */
export function dragProgress(turn: Turn, dx: number, width: number) {
  const towards = turn.direction === "forward" ? -dx : dx;
  return Math.max(0, Math.min(1, towards / Math.max(1, width)));
}

/** The pointer's vertical travel, which is what tilts the fold away from a plain hinge. */
export function dragSkew(dy: number, height: number) {
  return Math.max(-1, Math.min(1, dy / Math.max(1, height)));
}

/** A released drag completes when it went far enough, or was flicked fast enough. */
export function completesOnRelease(progress: number, speed: number) {
  return progress >= COMPLETE_AT || speed >= FLICK_SPEED;
}

/**
 * What the reader sees while a turn runs. The side the leaf is leaving already shows where
 * the book lands; the side it is heading for keeps its page until the leaf covers it, the
 * way a real sheet hides the page under it. On a phone one page turns at a time and its
 * back is blank paper, as single-page readers show it.
 */
export function turnFrames(turn: Turn, pageCount: number, mode: ViewMode) {
  const target = clampView(targetOf(turn), pageCount, mode);
  const from = viewPages(turn.from, pageCount, mode);
  const landing = viewPages(target, pageCount, mode);
  const forward = turn.direction === "forward";
  return {
    under: target,
    /** The pages lying flat under the leaf. */
    left: forward ? from.left : landing.left,
    right: forward ? landing.right : from.right,
    /** The side the leaf starts on; it sweeps to the other one. */
    side: forward ? ("right" as const) : ("left" as const),
    front: forward ? from.right : from.left,
    back: mode === "single" ? null : forward ? landing.left : landing.right,
  };
}

/** Eased progress for animations that run on their own; drags follow the finger exactly. */
export function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// The fold. Everything below works in page units: the page is 1 wide and `aspect` tall, so
// the same numbers drive a thumbnail and a fullscreen book. The page is a sheet of paper
// whose grabbed corner is carried to a point; the sheet folds along the perpendicular
// bisector of that line, which is what the eye reads as paper bending.

export type Point = { x: number; y: number };

const pageRect = (aspect: number): Point[] => [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: aspect },
  { x: 0, y: aspect },
];

/** Which edge the turning page hinges on, and which one the reader grabs. */
function edges(turn: Turn) {
  const forward = turn.direction === "forward";
  return { outer: forward ? 1 : 0, spine: forward ? 0 : 1 };
}

const grabbedCorner = (turn: Turn, aspect: number): Point => ({
  x: edges(turn).outer,
  y: turn.corner === "bottom" ? aspect : 0,
});

/**
 * Where the grabbed corner has been carried to.
 *
 * A click carries it towards the spine and lifts it towards the middle of the book on the
 * way, which slants the crease and reads as a page peeling. Carrying it straight instead
 * would fold the page in half onto itself, flat as a card; lifting it along a circle would
 * start by folding the bottom edge up, because a circle turns fastest where it starts.
 *
 * A drag puts the corner under the pointer. Either way the sheet can't stretch, so the corner
 * stays within one page width of the spine.
 */
export function foldPoint(turn: Turn, aspect: number): Point {
  const { outer, spine } = edges(turn);
  const corner = grabbedCorner(turn, aspect);
  const anchor = { x: spine, y: corner.y };

  const inwards = turn.corner === "bottom" ? -1 : 1;
  const lift = turn.dragging ? turn.skew * aspect : inwards * CLICK_LIFT * Math.sin(Math.PI * turn.progress);
  const point = { x: outer + turn.progress * 2 * (spine - outer), y: corner.y + lift };

  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const reach = Math.hypot(dx, dy);
  if (reach <= 1) return point;
  return { x: anchor.x + dx / reach, y: anchor.y + dy / reach };
}

/** Keeps the part of a polygon where `side` is positive, cutting it along `side` = 0. */
function clipHalfPlane(polygon: Point[], side: (p: Point) => number): Point[] {
  const kept: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = side(a);
    const db = side(b);
    if (da >= 0) kept.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      kept.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return kept;
}

export type Fold = {
  /** Where the grabbed corner now sits. */
  point: Point;
  /** The part of the page still lying flat, in the page's own coordinates. */
  flat: Point[];
  /** What the folded part covers, in the flap layer's own (mirrored) coordinates. */
  flap: Point[];
  /** The flap layer's CSS matrix, applied with the origin at the page's top-left corner. */
  matrix: readonly [number, number, number, number, number, number];
  /** CSS gradient angle that runs away from the crease, for the shading on the flap. */
  shade: number;
  /** Where along that gradient the crease itself falls, 0–1. The shading starts there. */
  crease: number;
  /** Where the shading has faded out, 0–1. It follows the depth of the fold. */
  shadeTo: number;
};

const FLAT: Fold["matrix"] = [1, 0, 0, 1, 0, 0];

/**
 * The fold, as two polygons and a transform.
 *
 * Folding is a reflection across the crease. The flap shows the sheet's other face, and the
 * back of a sheet mirrors its front, so the flap layer draws the next page mirrored and its
 * transform is that reflection composed with the mirror — which comes out a plain rotation.
 * That is why the turned page lands the right way round and not back to front.
 */
export function fold(turn: Turn, aspect: number): Fold {
  const page = pageRect(aspect);
  const corner = grabbedCorner(turn, aspect);
  const point = foldPoint(turn, aspect);

  const dx = corner.x - point.x;
  const dy = corner.y - point.y;
  const span = Math.hypot(dx, dy);
  // Nothing has been picked up yet: the page lies flat and there is no flap to draw.
  if (span < 1e-6) return { point, flat: page, flap: [], matrix: FLAT, shade: 0, crease: 0, shadeTo: 0 };

  // The crease is the perpendicular bisector of corner → point, so corner → point is its
  // normal: everything on the corner's side of it folds over.
  const nx = dx / span;
  const ny = dy / span;
  const mid = { x: (corner.x + point.x) / 2, y: (corner.y + point.y) / 2 };
  const side = (p: Point) => (p.x - mid.x) * nx + (p.y - mid.y) * ny;

  const folded = clipHalfPlane(page, side);
  const flat = clipHalfPlane(page, (p) => -side(p));

  // Reflection across the crease is I - 2nnᵀ; composed with the sheet's own mirror it
  // becomes the rotation below.
  const matrix = [2 * nx * nx - 1, 2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny] as const;
  // Where the page's outer-edge corner ends up, which fixes the rotation's offset.
  const v = { x: 1 - mid.x, y: -mid.y };
  const dot = v.x * nx + v.y * ny;
  const moved = { x: v.x - 2 * dot * nx, y: v.y - 2 * dot * ny };

  // The shading runs from the crease into the flap. In the flap's own mirrored coordinates
  // that is away from (-nx, ny); a CSS gradient is measured along the whole layer, so the
  // crease has to be placed on that line for the dark edge to land on it.
  const gx = -nx;
  const gy = ny;
  const axis = Math.abs(gx) + Math.abs(aspect * gy);
  const along = (p: Point) => ((p.x - 0.5) * gx + (p.y - aspect / 2) * gy + axis / 2) / axis;

  const flap = folded.map((p) => ({ x: 1 - p.x, y: p.y }));
  const crease = axis < 1e-6 ? 0 : along({ x: 1 - mid.x, y: mid.y });
  // A shallow fold is shaded over a short distance and a deep one over a long one, so the
  // band never swallows the whole flap.
  const deepest = flap.reduce((far, p) => Math.max(far, along(p)), crease);

  return {
    point,
    flat,
    flap,
    matrix: [...matrix, mid.x + moved.x, mid.y + moved.y] as const,
    shade: (Math.atan2(gx, -gy) * 180) / Math.PI,
    crease,
    shadeTo: crease + (deepest - crease) * 0.5,
  };
}
