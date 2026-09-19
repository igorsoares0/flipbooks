import type { Prisma } from "../../src/generated/prisma/client";

// Deterministic reader events for the demo books, so the dashboard and analytics pages show
// believable numbers: `views` visits spread over the last 90 days (more of them recently),
// each reading a few spreads before dropping off.

const DAY = 24 * 60 * 60_000;
const DEVICES: [string, number][] = [
  ["Mobile", 0.54],
  ["Desktop", 0.38],
  ["Tablet", 0.08],
];
const COUNTRIES: [string, number][] = [
  ["BR", 0.34],
  ["US", 0.24],
  ["PT", 0.14],
  ["DE", 0.08],
  ["ES", 0.06],
  ["GB", 0.05],
  ["FR", 0.05],
  ["IT", 0.04],
];

/** mulberry32: a tiny seeded PRNG, so every seed run produces the same events. */
function random(seed: string) {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: [T, number][]) {
  let r = rand();
  for (const [value, weight] of weighted) {
    if ((r -= weight) <= 0) return value;
  }
  return weighted[0][0];
}

export function demoEvents(
  flipbook: { id: string; views: number; pageIds: string[] },
  now = Date.now(),
): Prisma.AnalyticsEventCreateManyInput[] {
  const rand = random(flipbook.id);
  const pages = flipbook.pageIds.length;
  const events: Prisma.AnalyticsEventCreateManyInput[] = [];
  // About seven in ten visits are someone new.
  const visitors = Math.max(1, Math.round(flipbook.views * 0.7));

  for (let v = 0; v < flipbook.views; v++) {
    const sessionId = `seed${flipbook.id}${v}`.replace(/[^A-Za-z0-9]/g, "");
    const visitorId = `seedvisitor${Math.floor(rand() * visitors)}`;
    const device = pick(rand, DEVICES);
    const country = pick(rand, COUNTRIES);
    const start = now - Math.pow(rand(), 1.4) * 90 * DAY;
    const base = { flipbookId: flipbook.id, sessionId, visitorId, device, country };
    events.push({ ...base, type: "VIEW", createdAt: new Date(start) });

    // Cover first, then spreads (2–3, 4–5, …) until the reader leaves.
    let t = start;
    for (let first = 1; first <= pages; first = first === 1 ? 2 : first + 2) {
      const spread = first === 1 ? [1] : [first, first + 1].filter((n) => n <= pages);
      const durationMs = Math.round(4_000 + rand() * 36_000);
      spread.forEach((n, i) =>
        events.push({ ...base, type: "PAGE_VIEW", pageId: flipbook.pageIds[n - 1], durationMs: i === 0 ? durationMs : null, createdAt: new Date(t) }),
      );
      t += durationMs;
      if (rand() > (first === 1 ? 0.9 : 0.8)) break;
    }
    if (rand() < 0.03) events.push({ ...base, type: "SHARE", createdAt: new Date(t) });
    if (rand() < 0.06) events.push({ ...base, type: "DOWNLOAD", createdAt: new Date(t) });
  }
  return events;
}
