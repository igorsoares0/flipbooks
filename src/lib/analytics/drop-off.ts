/** Below this share of readers lost between two pages, the chart doesn't call out a drop. */
export const DROP_OFF_THRESHOLD = 0.15;

/**
 * The largest page-to-page loss of readers, as a share of the page before it.
 * `page` is the 1-based page readers leave after; null when no drop reaches the threshold.
 */
export function largestDropOff(viewsPerPage: number[], threshold = DROP_OFF_THRESHOLD): { page: number; drop: number } | null {
  let best: { page: number; drop: number } | null = null;
  for (let i = 1; i < viewsPerPage.length; i++) {
    const before = viewsPerPage[i - 1];
    if (before <= 0) continue;
    const drop = (before - viewsPerPage[i]) / before;
    if (drop > (best?.drop ?? 0)) best = { page: i, drop };
  }
  return best && best.drop >= threshold ? best : null;
}
