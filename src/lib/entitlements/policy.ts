import type { Entitlements } from "@/lib/types";
import type { FlipbookPatch } from "@/lib/validation";

export const UPGRADE_MESSAGES = {
  canvas: "The canvas editor is part of the Lifetime Deal.",
  branding: "Removing the Flipbook badge is part of the Lifetime Deal.",
  slug: "Custom addresses are part of the Lifetime Deal.",
  analytics: "Analytics are part of the Lifetime Deal.",
} as const;

/** Why a settings change isn't allowed on this plan, or null when it is. */
export function patchViolation(entitlements: Entitlements, patch: FlipbookPatch): string | null {
  if (patch.settings && !patch.settings.showBranding && !entitlements.canRemoveBranding) return UPGRADE_MESSAGES.branding;
  return null;
}
