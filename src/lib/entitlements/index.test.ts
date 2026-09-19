import { describe, expect, it } from "vitest";
import { PRO_PRICES, YEARLY_SAVING } from "@/lib/billing/catalog";
import { DEFAULT_SETTINGS } from "@/lib/flipbook-rules";
import { featureList, resolveEntitlements } from ".";
import { effectiveSettings, flipbookLimitViolation, pageLimitViolation, patchViolation } from "./policy";

const free = resolveEntitlements("FREE");
const pro = resolveEntitlements("PRO");

describe("plans", () => {
  it("gives Pro the limits sold on the pricing page", () => {
    expect(pro).toMatchObject({ maxFlipbooks: 100, maxPagesPerFlipbook: 300, maxPdfBytes: 100e6, maxStorageBytes: 20e9, maxMonthlyViews: 250_000 });
    expect(featureList(pro).every((f) => f.enabled)).toBe(true);
  });

  it("gives Free the editor but keeps the paid features off", () => {
    expect(free).toMatchObject({ maxFlipbooks: 3, maxPagesPerFlipbook: 15, maxPdfBytes: 20e6, maxStorageBytes: 0.5e9, maxMonthlyViews: 1_000 });
    expect(free.canUseCanvasEditor).toBe(true);
    expect(free.canRemoveBranding || free.canUseCustomSlug || free.canUseAnalytics || free.canOfferDownload).toBe(false);
    expect(featureList(free).find((f) => f.label === "Embed anywhere")?.enabled).toBe(true);
  });

  it("prices Pro at $22 a month or $180 a year", () => {
    expect(PRO_PRICES.MONTH.amount).toBe(22);
    expect(PRO_PRICES.YEAR).toMatchObject({ amount: 180, perMonth: 15 });
    expect(YEARLY_SAVING).toBe(32);
  });
});

describe("limits", () => {
  it("stops a new flipbook once the plan's count is reached", () => {
    expect(flipbookLimitViolation(free, 2)).toBeNull();
    expect(flipbookLimitViolation(free, 3)).toMatch(/flipbook limit/);
    expect(flipbookLimitViolation(pro, 99)).toBeNull();
  });

  it("caps pages per flipbook, and says how to get more", () => {
    expect(pageLimitViolation(free, 15)).toBeNull();
    expect(pageLimitViolation(free, 16)).toBe("Your plan allows 15 pages per flipbook. Upgrade to Pro for up to 300.");
    expect(pageLimitViolation(pro, 301)).toBe("Your plan allows 300 pages per flipbook.");
  });
});

describe("paid-only settings", () => {
  const hideBadge = { settings: { ...DEFAULT_SETTINGS, showBranding: false } };
  const allowDownload = { settings: { ...DEFAULT_SETTINGS, showDownload: true } };

  it("only lets Pro hide the badge or offer downloads", () => {
    expect(patchViolation(free, hideBadge)).toMatch(/part of Pro/);
    expect(patchViolation(free, allowDownload)).toMatch(/part of Pro/);
    expect(patchViolation(pro, hideBadge)).toBeNull();
    expect(patchViolation(pro, allowDownload)).toBeNull();
    expect(patchViolation(free, { settings: DEFAULT_SETTINGS })).toBeNull();
    expect(patchViolation(free, { title: "x" })).toBeNull();
  });

  it("puts the badge back and turns downloads off after a downgrade", () => {
    const paidChoices = { ...DEFAULT_SETTINGS, showBranding: false, showDownload: true };
    expect(effectiveSettings(paidChoices, free)).toMatchObject({ showBranding: true, showDownload: false });
    expect(effectiveSettings(paidChoices, pro)).toEqual(paidChoices);
  });
});
