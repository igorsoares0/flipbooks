import { resolveEntitlements } from "@/lib/entitlements";
import { formatCompact, formatGb } from "@/lib/format";
import type { BillingInterval } from "@/lib/types";

// What the pricing and billing pages sell. The amounts must match the Paddle prices
// (PADDLE_PRICE_PRO_MONTH / PADDLE_PRICE_PRO_YEAR); Paddle charges its own, this only displays.

export const PRO_PRICES: Record<BillingInterval, { amount: number; perMonth: number; label: string }> = {
  MONTH: { amount: 22, perMonth: 22, label: "Monthly" },
  YEAR: { amount: 180, perMonth: 15, label: "Yearly" },
};

/** Yearly saving vs twelve monthly payments, as a whole percentage. */
export const YEARLY_SAVING = Math.round((1 - PRO_PRICES.YEAR.amount / (PRO_PRICES.MONTH.amount * 12)) * 100);

const free = resolveEntitlements("FREE");
const pro = resolveEntitlements("PRO");

function limits(e: typeof free) {
  return [
    `${e.maxFlipbooks} flipbooks`,
    `${e.maxPagesPerFlipbook} pages per flipbook`,
    `${e.maxPdfBytes / 1e6} MB PDFs`,
    `${e.maxStorageBytes < 1e9 ? `${e.maxStorageBytes / 1e6} MB` : `${formatGb(e.maxStorageBytes)} GB`} storage`,
    `${formatCompact(e.maxMonthlyViews)} views a month`,
  ];
}

export const PLAN_FEATURES = {
  FREE: [...limits(free), "Canvas editor, templates and image uploads", "Public link and embed, with the Flipbook badge"],
  PRO: [...limits(pro), "Everything in Free", "No Flipbook badge", "Custom address", "Reader analytics", "PDF download for readers"],
};
