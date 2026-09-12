// Spreads pair pages like a printed book: the cover sits alone on the right,
// then 2–3, 4–5, … and an even last page sits alone on the left.

/** Index of the spread that shows `page` (1-based). */
export const spreadOf = (page: number) => Math.floor(page / 2);

export const lastSpread = (pageCount: number) => spreadOf(pageCount);

/** Page numbers on each side of a spread; null where the side is empty. */
export function spreadPages(spread: number, pageCount: number) {
  const left = spread * 2;
  const right = spread * 2 + 1;
  return {
    left: left >= 1 && left <= pageCount ? left : null,
    right: right <= pageCount ? right : null,
  };
}

/** Counter label: "4–5" for a full spread, "1" for the lone cover. */
export function spreadLabel(spread: number, pageCount: number) {
  const { left, right } = spreadPages(spread, pageCount);
  return left && right ? `${left}–${right}` : String(left ?? right ?? 1);
}

export function clampSpread(spread: number, pageCount: number) {
  return Math.max(0, Math.min(lastSpread(pageCount), spread));
}
