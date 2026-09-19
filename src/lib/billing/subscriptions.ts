import type { BillingInterval } from "@/lib/types";

// Paddle's subscription payload (webhooks, snake_case as sent) → our Subscription row.
// Pure, so every status and edge case is unit-tested without a database.

export type PaddleSubscriptionPayload = {
  id: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  customer_id: string;
  custom_data?: { userId?: unknown } | null;
  items?: { price?: { id?: string | null; billing_cycle?: { interval?: string } | null } | null }[];
  billing_cycle?: { interval?: string; frequency?: number } | null;
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  scheduled_change?: { action: "cancel" | "pause" | "resume"; effective_at: string } | null;
  canceled_at?: string | null;
};

export type SubscriptionFields = {
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  paddlePriceId: string | null;
  interval: BillingInterval | null;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "PAUSED" | "CANCELED";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

const STATUS: Record<PaddleSubscriptionPayload["status"], SubscriptionFields["status"]> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  paused: "PAUSED",
  canceled: "CANCELED",
};

function toInterval(value: string | undefined): BillingInterval | null {
  return value === "year" ? "YEAR" : value === "month" ? "MONTH" : null;
}

export function subscriptionFields(sub: PaddleSubscriptionPayload): SubscriptionFields {
  const price = sub.items?.[0]?.price ?? null;
  return {
    paddleSubscriptionId: sub.id,
    paddleCustomerId: sub.customer_id,
    paddlePriceId: price?.id ?? null,
    interval: toInterval(price?.billing_cycle?.interval ?? sub.billing_cycle?.interval),
    status: STATUS[sub.status] ?? "CANCELED",
    currentPeriodEnd: sub.current_billing_period ? new Date(sub.current_billing_period.ends_at) : null,
    // A scheduled cancel keeps the plan until the period ends.
    cancelAtPeriodEnd: sub.scheduled_change?.action === "cancel",
  };
}

/** The account the checkout was started for (set server-side in startCheckout). */
export function userIdOf(sub: PaddleSubscriptionPayload): string | null {
  const id = sub.custom_data?.userId;
  return typeof id === "string" && id.length > 0 && id.length <= 64 ? id : null;
}
