import { describe, expect, it } from "vitest";
import { featureList, resolveEntitlements } from ".";

describe("entitlements", () => {
  it("gives the Lifetime Deal the limits sold on the pricing page", () => {
    const ltd = resolveEntitlements("LIFETIME");
    expect(ltd.maxStorageBytes).toBe(20e9);
    expect(ltd.maxPagesProcessed).toBe(3000);
    expect(ltd.maxPdfBytes).toBe(100e6);
    expect(ltd.maxPdfPages).toBe(300);
    expect(ltd.canUseCanvasEditor && ltd.canRemoveBranding && ltd.canUseAnalytics).toBe(true);
  });

  it("keeps paid features off the free plan", () => {
    const free = resolveEntitlements("FREE");
    expect(free.canUseCanvasEditor).toBe(false);
    expect(free.canRemoveBranding).toBe(false);
    expect(free.maxStorageBytes).toBeLessThan(resolveEntitlements("LIFETIME").maxStorageBytes);
  });

  it("lists every feature flag with its state", () => {
    expect(featureList(resolveEntitlements("LIFETIME")).every((f) => f.enabled)).toBe(true);
    const free = featureList(resolveEntitlements("FREE"));
    expect(free.find((f) => f.label === "Canvas editor")?.enabled).toBe(false);
    expect(free.find((f) => f.label === "Embed anywhere")?.enabled).toBe(true);
  });
});
