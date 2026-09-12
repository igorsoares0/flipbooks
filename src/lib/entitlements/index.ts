import type { Entitlements, Plan } from "@/lib/types";

const GB = 1e9;
const MB = 1e6;

// Product code checks these capabilities, never the plan name directly (spec §30).
const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: {
    plan: "FREE",
    canUseCanvasEditor: false,
    canRemoveBranding: false,
    canUseCustomSlug: false,
    canUseAnalytics: false,
    canEmbed: true,
    maxStorageBytes: 1 * GB,
    maxPagesProcessed: 100,
    maxMonthlyViews: 5_000,
    maxBandwidthBytes: 10 * GB,
    maxPdfBytes: 20 * MB,
    maxPdfPages: 50,
  },
  LIFETIME: {
    plan: "LIFETIME",
    canUseCanvasEditor: true,
    canRemoveBranding: true,
    canUseCustomSlug: true,
    canUseAnalytics: true,
    canEmbed: true,
    maxStorageBytes: 20 * GB,
    maxPagesProcessed: 3_000,
    maxMonthlyViews: 250_000,
    maxBandwidthBytes: 500 * GB,
    maxPdfBytes: 100 * MB,
    maxPdfPages: 300,
  },
};

export function resolveEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}

/** Feature flags shown as pills on the billing page. */
export function featureList(entitlements: Entitlements) {
  return [
    { label: "Canvas editor", enabled: entitlements.canUseCanvasEditor },
    { label: "Remove branding", enabled: entitlements.canRemoveBranding },
    { label: "Custom slug", enabled: entitlements.canUseCustomSlug },
    { label: "Analytics", enabled: entitlements.canUseAnalytics },
    { label: "Embed anywhere", enabled: entitlements.canEmbed },
  ];
}
