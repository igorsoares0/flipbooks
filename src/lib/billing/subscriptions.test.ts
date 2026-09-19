import { describe, expect, it } from "vitest";
import { subscriptionFields, userIdOf, type PaddleSubscriptionPayload } from "./subscriptions";

const base: PaddleSubscriptionPayload = {
  id: "sub_01",
  status: "active",
  customer_id: "ctm_01",
  custom_data: { userId: "usr_1" },
  items: [{ price: { id: "pri_year", billing_cycle: { interval: "year" } } }],
  billing_cycle: { interval: "year", frequency: 1 },
  current_billing_period: { starts_at: "2026-09-19T00:00:00Z", ends_at: "2027-09-19T00:00:00Z" },
  scheduled_change: null,
};

describe("Paddle subscription → our row", () => {
  it("maps an active yearly subscription", () => {
    expect(subscriptionFields(base)).toEqual({
      paddleSubscriptionId: "sub_01",
      paddleCustomerId: "ctm_01",
      paddlePriceId: "pri_year",
      interval: "YEAR",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2027-09-19T00:00:00Z"),
      cancelAtPeriodEnd: false,
    });
  });

  it("maps every Paddle status", () => {
    const statuses = ["active", "trialing", "past_due", "paused", "canceled"] as const;
    expect(statuses.map((status) => subscriptionFields({ ...base, status }).status)).toEqual([
      "ACTIVE",
      "TRIALING",
      "PAST_DUE",
      "PAUSED",
      "CANCELED",
    ]);
  });

  it("keeps Pro until the period ends when a cancel is scheduled", () => {
    const fields = subscriptionFields({ ...base, scheduled_change: { action: "cancel", effective_at: "2027-09-19T00:00:00Z" } });
    expect(fields).toMatchObject({ status: "ACTIVE", cancelAtPeriodEnd: true });
    expect(subscriptionFields({ ...base, scheduled_change: { action: "pause", effective_at: "2027-01-01T00:00:00Z" } }).cancelAtPeriodEnd).toBe(false);
  });

  it("reads the interval from the price, falling back to the subscription", () => {
    expect(subscriptionFields({ ...base, items: [{ price: { id: "pri_m", billing_cycle: { interval: "month" } } }] }).interval).toBe("MONTH");
    expect(subscriptionFields({ ...base, items: [], billing_cycle: { interval: "month", frequency: 1 } }).interval).toBe("MONTH");
    expect(subscriptionFields({ ...base, items: [], billing_cycle: null }).interval).toBeNull();
  });

  it("only trusts a string user id from the checkout's custom data", () => {
    expect(userIdOf(base)).toBe("usr_1");
    expect(userIdOf({ ...base, custom_data: null })).toBeNull();
    expect(userIdOf({ ...base, custom_data: { userId: 42 } })).toBeNull();
    expect(userIdOf({ ...base, custom_data: { userId: "x".repeat(65) } })).toBeNull();
  });
});
