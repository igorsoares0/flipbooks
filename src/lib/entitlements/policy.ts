import type { Entitlements, FlipbookSettings } from "@/lib/types";
import type { FlipbookPatch } from "@/lib/validation";

export const UPGRADE_MESSAGES = {
  branding: "Removing the Flipbook badge is part of Pro.",
  download: "Letting readers download the PDF is part of Pro.",
  slug: "Custom addresses are part of Pro.",
  analytics: "Analytics are part of Pro.",
  flipbooks: "You've reached your plan's flipbook limit. Upgrade to Pro for up to 100 flipbooks.",
  pages: "You've reached your plan's page limit per flipbook.",
  storage: "You've reached your plan's storage limit.",
} as const;

export type UpgradeReason = keyof typeof UPGRADE_MESSAGES;

/** Whether the user can create one more flipbook, and why not. */
export function flipbookLimitViolation(entitlements: Entitlements, currentCount: number): string | null {
  return currentCount >= entitlements.maxFlipbooks ? UPGRADE_MESSAGES.flipbooks : null;
}

/** The limit message for a document with too many pages, or null. */
export function pageLimitViolation(entitlements: Entitlements, pageCount: number): string | null {
  return pageCount > entitlements.maxPagesPerFlipbook
    ? `Your plan allows ${entitlements.maxPagesPerFlipbook} pages per flipbook.${entitlements.plan === "FREE" ? " Upgrade to Pro for up to 300." : ""}`
    : null;
}

/** Why a settings change isn't allowed on this plan, or null when it is. */
export function patchViolation(entitlements: Entitlements, patch: FlipbookPatch): string | null {
  if (patch.settings && !patch.settings.showBranding && !entitlements.canRemoveBranding) return UPGRADE_MESSAGES.branding;
  if (patch.settings?.showDownload && !entitlements.canOfferDownload) return UPGRADE_MESSAGES.download;
  return null;
}

/**
 * The settings readers actually get. Saved settings may predate a downgrade, so paid-only
 * choices fall back to the plan's defaults instead of staying on for free.
 */
export function effectiveSettings(settings: FlipbookSettings, entitlements: Entitlements): FlipbookSettings {
  return {
    ...settings,
    showBranding: settings.showBranding || !entitlements.canRemoveBranding,
    showDownload: settings.showDownload && entitlements.canOfferDownload,
  };
}
