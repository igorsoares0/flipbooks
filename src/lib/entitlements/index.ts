import type { Entitlements, Plan } from "@/lib/types";

const GB = 1e9;
const MB = 1e6;

// Product code checks these capabilities, never the plan name directly (spec §30).
// The numbers are the ones on the pricing page (src/lib/billing/catalog.ts).
const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: {
    plan: "FREE",
    canUseCanvasEditor: true,
    canRemoveBranding: false,
    canUseCustomSlug: false,
    canUseAnalytics: false,
    canEmbed: true,
    canOfferDownload: false,
    maxFlipbooks: 3,
    maxPagesPerFlipbook: 15,
    maxPdfBytes: 20 * MB,
    maxStorageBytes: 0.5 * GB,
    maxMonthlyViews: 1_000,
  },
  PRO: {
    plan: "PRO",
    canUseCanvasEditor: true,
    canRemoveBranding: true,
    canUseCustomSlug: true,
    canUseAnalytics: true,
    canEmbed: true,
    canOfferDownload: true,
    maxFlipbooks: 100,
    maxPagesPerFlipbook: 300,
    maxPdfBytes: 100 * MB,
    maxStorageBytes: 20 * GB,
    maxMonthlyViews: 250_000,
  },
};

export function resolveEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}

/** Subscriptions that grant their plan right now: paid up, or retrying a failed payment. */
export function grantingSubscriptionWhere(now = new Date()) {
  return {
    status: { in: ["ACTIVE" as const, "TRIALING" as const, "PAST_DUE" as const] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/** Feature flags shown as pills on the billing page. */
export function featureList(entitlements: Entitlements) {
  return [
    { label: "Canvas editor", enabled: entitlements.canUseCanvasEditor },
    { label: "Remove branding", enabled: entitlements.canRemoveBranding },
    { label: "Custom address", enabled: entitlements.canUseCustomSlug },
    { label: "Analytics", enabled: entitlements.canUseAnalytics },
    { label: "Reader PDF download", enabled: entitlements.canOfferDownload },
    { label: "Embed anywhere", enabled: entitlements.canEmbed },
  ];
}
