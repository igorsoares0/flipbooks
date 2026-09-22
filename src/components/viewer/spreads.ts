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

// A "view" is what the reader sees at once: a spread of two pages on a wide screen, a
// single page on a phone. Navigation, deep links and the turn all work in views.

export type ViewMode = "spread" | "single";

export const lastView = (pageCount: number, mode: ViewMode) => (mode === "single" ? Math.max(0, pageCount - 1) : lastSpread(pageCount));

/** Pages on each side of a view; a single-page view fills the right side, like the cover. */
export function viewPages(view: number, pageCount: number, mode: ViewMode) {
  if (mode === "spread") return spreadPages(view, pageCount);
  const page = view + 1;
  return { left: null, right: page >= 1 && page <= pageCount ? page : null };
}

/** The view that shows a page, so switching between one and two pages keeps the reader's place. */
export const viewOfPage = (page: number, mode: ViewMode) => (mode === "single" ? Math.max(0, page - 1) : spreadOf(page));

export function clampView(view: number, pageCount: number, mode: ViewMode) {
  return Math.max(0, Math.min(lastView(pageCount, mode), view));
}

export function viewLabel(view: number, pageCount: number, mode: ViewMode) {
  if (mode === "spread") return spreadLabel(view, pageCount);
  return String(clampView(view, pageCount, mode) + 1);
}
