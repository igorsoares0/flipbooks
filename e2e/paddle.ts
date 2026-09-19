import { createHmac, randomUUID } from "node:crypto";

// Simulated Paddle notifications for e2e: signed with the secret the test server uses.

export const E2E_PADDLE_WEBHOOK_SECRET = "e2e-paddle-webhook-secret";

export function paddleNotification(eventType: string, data: Record<string, unknown>) {
  const body = JSON.stringify({ event_id: `evt_${randomUUID()}`, event_type: eventType, occurred_at: new Date().toISOString(), data });
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac("sha256", E2E_PADDLE_WEBHOOK_SECRET).update(`${ts}:${body}`).digest("hex");
  return { data: body, headers: { "content-type": "application/json", "paddle-signature": `ts=${ts};h1=${h1}` } };
}

export function subscriptionPayload(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `sub_${randomUUID().slice(0, 12)}`,
    status: "active",
    customer_id: `ctm_${randomUUID().slice(0, 12)}`,
    custom_data: { userId },
    items: [{ price: { id: "pri_e2e_year", billing_cycle: { interval: "year" } } }],
    current_billing_period: { starts_at: "2026-09-19T00:00:00Z", ends_at: "2027-09-19T12:00:00Z" },
    scheduled_change: null,
    ...overrides,
  };
}
