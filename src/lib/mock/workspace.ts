import { resolveEntitlements } from "@/lib/entitlements";
import type { AnalyticsSummary, Billing, Template, User } from "@/lib/types";

export const mockUser: User = {
  id: "usr_marina",
  name: "Marina Rocha",
  email: "marina@studio.co",
  image: null,
};

export const mockBilling: Billing = {
  plan: "LIFETIME",
  provider: "paddle",
  purchasedAt: "2026-02-14T12:00:00.000Z",
  expiresAt: null,
  entitlements: resolveEntitlements("LIFETIME"),
  usage: {
    storageBytes: 2.4e9,
    pagesProcessed: 412,
    monthlyViews: 48_000,
    bandwidthBytes: 86e9,
  },
};

export const mockDashboard = {
  publishedThisMonth: 3,
  viewsDelta: 0.18,
  avgReadSeconds: 204,
};

export const mockTemplates: Template[] = [
  { id: "tpl_editorial", name: "Editorial", category: "Magazines", pageCount: 24, tint: "#F4EFE6" },
  { id: "tpl_product_grid", name: "Product Grid", category: "Catalogs", pageCount: 16, tint: "#EDF1FB" },
  { id: "tpl_minimal_zine", name: "Minimal Zine", category: "Magazines", pageCount: 12, tint: "#F6F4EF" },
  { id: "tpl_bold_type", name: "Bold Type", category: "Marketing", pageCount: 20, tint: "#F5E9E4" },
  { id: "tpl_report", name: "Report", category: "Reports", pageCount: 32, tint: "#EFF3EF" },
  { id: "tpl_lookbook", name: "Lookbook", category: "Portfolios", pageCount: 28, tint: "#F1EDF4" },
  { id: "tpl_menu", name: "Menu", category: "Business", pageCount: 8, tint: "#F6F1E4" },
  { id: "tpl_brochure", name: "Brochure", category: "Brochures", pageCount: 6, tint: "#EAF0F3" },
];

// 30-day numbers from the design handoff; longer ranges are scaled for the demo.
const PAGE_CURVE = [100, 92, 88, 80, 76, 71, 64, 60, 55, 34, 30, 27, 24, 21, 18, 15];

const RANGE_SCALE: Record<AnalyticsSummary["range"], number> = { "30d": 1, "90d": 2.7, all: 4.3 };

export function mockAnalytics(range: AnalyticsSummary["range"]): AnalyticsSummary {
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
