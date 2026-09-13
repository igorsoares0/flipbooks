// Pure geometry for the editor's transform layer. Everything is in page units
// (the page's own width/height), independent of zoom. Rotation is in degrees,
// clockwise, around the box center, matching CSS `rotate()` in PageCanvas.

export type Box = { x: number; y: number; width: number; height: number; rotation: number };
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type Guide = { axis: "x" | "y"; at: number };

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Resizes a box by dragging one handle by (dx, dy), measured from where the drag started.
 * The opposite edge or corner stays put, even when the box is rotated.
 */
export function resizeBox(
  start: Box,
  handle: Handle,
  dx: number,
  dy: number,
  { keepAspect = false, minSize = 8 }: { keepAspect?: boolean; minSize?: number } = {},
): Box {
  const cos = Math.cos(toRad(start.rotation));
  const sin = Math.sin(toRad(start.rotation));
  // The drag expressed along the box's own axes.
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;

  let width = Math.max(minSize, start.width + sx * localX);
  let height = Math.max(minSize, start.height + sy * localY);

  if (keepAspect && sx !== 0 && sy !== 0) {
    const scale = Math.max(width / start.width, height / start.height);
    width = Math.max(minSize, start.width * scale);
    height = Math.max(minSize, start.height * scale);
  }

  // Move the center by half the growth, along the box's axes, so the anchor side stays fixed.
  const shiftX = (sx * (width - start.width)) / 2;
  const shiftY = (sy * (height - start.height)) / 2;
  const cx = start.x + start.width / 2 + shiftX * cos - shiftY * sin;
  const cy = start.y + start.height / 2 + shiftX * sin + shiftY * cos;

  return { ...start, x: cx - width / 2, y: cy - height / 2, width, height };
}

/** Rotation that points the box's top-center handle at the pointer (Shift snaps to 15°). */
export function rotateTo(box: Box, px: number, py: number, { snap = false }: { snap?: boolean } = {}) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  if (snap) angle = Math.round(angle / 15) * 15;
  return normalizeAngle(angle);
}

/** Maps any angle into (-180, 180]. */
export function normalizeAngle(angle: number) {
  const a = ((((angle + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : Math.round(a * 100) / 100;
}

/** Axis-aligned bounds of a (possibly rotated) box. */
export function bounds(box: Box) {
  const cos = Math.abs(Math.cos(toRad(box.rotation)));
  const sin = Math.abs(Math.sin(toRad(box.rotation)));
  const w = box.width * cos + box.height * sin;
  const h = box.width * sin + box.height * cos;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, cx, cy };
}

/**
 * Snaps a moving box to the page's edges and center and to other elements' edges and
 * centers, when within `threshold`. Returns the adjusted position and the guides to draw.
 */
export function snapMove(
  box: Box,
  page: { width: number; height: number },
  others: Box[],
  threshold: number,
): { x: number; y: number; guides: Guide[] } {
  const b = bounds(box);
  const targetsX = [0, page.width / 2, page.width];
  const targetsY = [0, page.height / 2, page.height];
  for (const other of others) {
    const o = bounds(other);
    targetsX.push(o.left, o.cx, o.right);
    targetsY.push(o.top, o.cy, o.bottom);
  }

  const best = (edges: number[], targets: number[]) => {
    let found: { delta: number; at: number } | null = null;
    for (const edge of edges) {
      for (const target of targets) {
        const delta = target - edge;
        if (Math.abs(delta) <= threshold && (!found || Math.abs(delta) < Math.abs(found.delta))) found = { delta, at: target };
      }
    }
    return found;
  };

  const snapX = best([b.left, b.cx, b.right], targetsX);
  const snapY = best([b.top, b.cy, b.bottom], targetsY);
  const guides: Guide[] = [];
  if (snapX) guides.push({ axis: "x", at: snapX.at });
  if (snapY) guides.push({ axis: "y", at: snapY.at });
  return { x: box.x + (snapX?.delta ?? 0), y: box.y + (snapY?.delta ?? 0), guides };
}

/** Rounds a box to whole page units, as stored. */
export function roundBox<T extends Pick<Box, "x" | "y" | "width" | "height">>(box: T): T {
  return { ...box, x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
}
