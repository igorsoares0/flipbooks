import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/paddle/webhook/route";
import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/data/flipbooks";
import type { PaddleSubscriptionPayload } from "./subscriptions";

// Paddle notifications against the test database, through the real route handler: signed
// exactly as Paddle signs them (HMAC-SHA256 over "timestamp:body").

const SECRET = "pdl_ntfset_test_secret";
const USER = "usr_billing_test";
const OTHER = "usr_billing_other";

beforeAll(async () => {
  process.env.PADDLE_WEBHOOK_SECRET = SECRET;
  await prisma.user.deleteMany({ where: { id: { in: [USER, OTHER] } } });
  await prisma.user.create({ data: { id: USER, name: "Billing Test", email: "billing@test.local" } });
  await prisma.user.create({ data: { id: OTHER, name: "Other", email: "billing-other@test.local" } });
});

afterAll(() => prisma.$disconnect());

function signed(body: string, secret = SECRET, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

function subscription(overrides: Partial<PaddleSubscriptionPayload> = {}): PaddleSubscriptionPayload {
  return {
    id: `sub_${randomUUID().slice(0, 12)}`,
    status: "active",
    customer_id: `ctm_${randomUUID().slice(0, 12)}`,
    custom_data: { userId: USER },
    items: [{ price: { id: "pri_test_month", billing_cycle: { interval: "month" } } }],
    current_billing_period: { starts_at: "2026-09-19T00:00:00Z", ends_at: "2026-10-19T00:00:00Z" },
    scheduled_change: null,
    ...overrides,
  };
}

async function deliver(
  eventType: string,
  data: unknown,
  { occurredAt = new Date().toISOString(), eventId = `evt_${randomUUID()}`, signature }: { occurredAt?: string; eventId?: string; signature?: string } = {},
) {
  const body = JSON.stringify({ event_id: eventId, event_type: eventType, occurred_at: occurredAt, data });
  const response = await POST(
    new Request("http://localhost/api/paddle/webhook", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "paddle-signature": signature ?? signed(body) },
    }),
  );
  return { status: response.status, text: await response.text(), eventId };
}

const rowOf = (paddleSubscriptionId: string) => prisma.subscription.findUnique({ where: { paddleSubscriptionId } });

describe("Paddle webhook", () => {
  it("rejects missing, forged and expired signatures", async () => {
    const data = subscription();
    const body = JSON.stringify({ event_id: "evt_x", event_type: "subscription.created", occurred_at: new Date().toISOString(), data });
    const post = (signature: string | null) =>
      POST(new Request("http://localhost/api/paddle/webhook", { method: "POST", body, headers: signature ? { "paddle-signature": signature } : {} }));

    expect((await post(null)).status).toBe(401);
    expect((await post(signed(body, "wrong-secret"))).status).toBe(401);
    expect((await post(signed(body, SECRET, Math.floor(Date.now() / 1000) - 3600))).status).toBe(401);
    expect(await rowOf(data.id)).toBeNull();
  });

  it("turns the account Pro when the subscription starts, once", async () => {
    await prisma.subscription.deleteMany({ where: { userId: USER } });
    const data = subscription();
    const first = await deliver("subscription.created", data);
    expect(first).toMatchObject({ status: 200, text: "applied" });
    expect(await rowOf(data.id)).toMatchObject({ userId: USER, plan: "PRO", status: "ACTIVE", interval: "MONTH", cancelAtPeriodEnd: false });
    expect((await getPlan(USER)).plan).toBe("PRO");

    // Paddle redelivers: the same event is applied only once.
    expect(await deliver("subscription.created", data, { eventId: first.eventId })).toMatchObject({ status: 200, text: "duplicate" });
    expect(await prisma.subscription.count({ where: { userId: USER } })).toBe(1);
  });

  it("ignores events older than the last one applied", async () => {
    const data = subscription();
    await deliver("subscription.updated", { ...data, scheduled_change: { action: "cancel", effective_at: "2026-10-19T00:00:00Z" } }, {
      occurredAt: "2026-09-19T12:00:00Z",
    });
    // A late delivery of an earlier state must not undo the cancellation.
    expect(await deliver("subscription.created", data, { occurredAt: "2026-09-19T11:00:00Z" })).toMatchObject({ text: "stale" });
    expect(await rowOf(data.id)).toMatchObject({ cancelAtPeriodEnd: true, status: "ACTIVE" });
  });

  it("keeps Pro while a payment is retried, and ends it on cancel", async () => {
    await prisma.subscription.deleteMany({ where: { userId: USER } });
    const data = subscription();
    await deliver("subscription.created", data, { occurredAt: "2026-09-19T10:00:00Z" });
    await deliver("subscription.past_due", { ...data, status: "past_due" }, { occurredAt: "2026-09-19T11:00:00Z" });
    expect((await getPlan(USER)).plan).toBe("PRO");

    await deliver("subscription.canceled", { ...data, status: "canceled" }, { occurredAt: "2026-09-19T12:00:00Z" });
    expect((await getPlan(USER)).plan).toBe("FREE");
  });

  it("finds the account through the Paddle customer when custom data is missing", async () => {
    await prisma.subscription.deleteMany({ where: { userId: OTHER } });
    const first = subscription({ custom_data: { userId: OTHER } });
    await deliver("subscription.created", first);
    const renewal = subscription({ customer_id: first.customer_id, custom_data: null });
    await deliver("subscription.created", renewal);
    expect(await rowOf(renewal.id)).toMatchObject({ userId: OTHER });
  });

  it("retries later when the account is unknown, and records nothing", async () => {
    const data = subscription({ custom_data: { userId: "usr_does_not_exist" } });
    const result = await deliver("subscription.created", data);
    expect(result.status).toBe(500);
    expect(await prisma.paddleEvent.findUnique({ where: { id: result.eventId } })).toBeNull();
    expect(await rowOf(data.id)).toBeNull();
  });

  it("acknowledges events it doesn't need", async () => {
    expect(await deliver("transaction.completed", { id: "txn_1" })).toMatchObject({ status: 200, text: "ignored" });
  });

  it("ignores subscriptions to other products sold from the same Paddle account", async () => {
    process.env.PADDLE_PRICE_PRO_MONTH = "pri_test_month";
    process.env.PADDLE_PRICE_PRO_YEAR = "pri_test_year";
    try {
      const foreign = subscription({
        custom_data: { userId: "usr_from_another_app" },
        items: [{ price: { id: "pri_invoice_maker", billing_cycle: { interval: "month" } } }],
      });
      expect(await deliver("subscription.created", foreign)).toMatchObject({ status: 200, text: "ignored" });
      expect(await rowOf(foreign.id)).toBeNull();

      const ours = subscription({ items: [{ price: { id: "pri_test_year", billing_cycle: { interval: "year" } } }] });
      expect(await deliver("subscription.created", ours)).toMatchObject({ status: 200, text: "applied" });
    } finally {
      delete process.env.PADDLE_PRICE_PRO_MONTH;
      delete process.env.PADDLE_PRICE_PRO_YEAR;
    }
  });
});
