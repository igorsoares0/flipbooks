import type { AnalyticsSummary } from "@/lib/types";

// Demo numbers from the design handoff. This is the only demo data left in the app:
// the analytics phase replaces it with aggregates over AnalyticsEvent.

export const DEMO_AVG_READ_SECONDS = 204;

// 30-day numbers from the design handoff; longer ranges are scaled for the demo.
const PAGE_CURVE = [100, 92, 88, 80, 76, 71, 64, 60, 55, 34, 30, 27, 24, 21, 18, 15];

const RANGE_SCALE: Record<AnalyticsSummary["range"], number> = { "30d": 1, "90d": 2.7, all: 4.3 };

export function demoAnalytics(range: AnalyticsSummary["range"]): AnalyticsSummary {
  const k = RANGE_SCALE[range];
  const scale = (n: number) => Math.round(n * k);
  return {
    range,
    totals: {
      views: scale(12_480),
      uniqueVisitors: scale(8_912),
      pageViews: scale(96_204),
      avgReadSeconds: range === "30d" ? 252 : 270,
      shares: scale(318),
      downloads: scale(1_024),
    },
    deltas:
      range === "all"
        ? { views: 0, uniqueVisitors: 0, pageViews: 0, avgReadSeconds: 0, shares: 0, downloads: 0 }
        : { views: 0.184, uniqueVisitors: 0.112, pageViews: 0.228, avgReadSeconds: -18, shares: 0.06, downloads: 0.031 },
    viewsPerPage: PAGE_CURVE.map((v) => scale(v * 124.8)),
    devices: [
      { name: "Mobile", share: 0.54 },
      { name: "Desktop", share: 0.38 },
      { name: "Tablet", share: 0.08 },
    ],
    countries: [
      { name: "Brazil", views: scale(4_182) },
      { name: "United States", views: scale(3_014) },
      { name: "Portugal", views: scale(1_806) },
      { name: "Germany", views: scale(942) },
      { name: "Spain", views: scale(711) },
    ],
  };
}
