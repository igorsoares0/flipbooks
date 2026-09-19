import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import type { BillingInterval } from "@/lib/types";

// Paddle is the merchant of record: it runs checkout, charges, taxes, receipts and the
// customer portal. Everything is optional in development; without the keys the upgrade
// buttons explain that billing isn't set up.

let client: Paddle | undefined;

export function paddleConfigured() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRICE_PRO_MONTH && process.env.PADDLE_PRICE_PRO_YEAR);
}

export function paddle() {
  if (!process.env.PADDLE_API_KEY) throw new Error("Paddle is not configured. Set the PADDLE_* variables (see .env.example).");
  client ??= new Paddle(process.env.PADDLE_API_KEY, {
    environment: process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });
  return client;
}

export function priceIdFor(interval: BillingInterval) {
  const id = interval === "YEAR" ? process.env.PADDLE_PRICE_PRO_YEAR : process.env.PADDLE_PRICE_PRO_MONTH;
  if (!id) throw new Error(`PADDLE_PRICE_PRO_${interval} is not set.`);
  return id;
}

/** Which of our intervals a Paddle price id is, or null for prices we don't sell. */
export function intervalOfPrice(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === process.env.PADDLE_PRICE_PRO_YEAR) return "YEAR";
  if (priceId === process.env.PADDLE_PRICE_PRO_MONTH) return "MONTH";
  return null;
}
