"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { paddle, paddleConfigured, priceIdFor } from "@/lib/billing/paddle";
import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/data/flipbooks";
import type { ActionResult } from "./flipbooks";

// Actions are public HTTP endpoints: authenticate, validate, then act on the caller's own
// subscription only.

const intervalSchema = z.enum(["MONTH", "YEAR"]);
const NOT_CONFIGURED = "Billing isn't set up on this server yet.";

/** The caller's Paddle customer, if they ever checked out. */
async function paddleCustomerOf(userId: string) {
  const row = await prisma.subscription.findFirst({
    where: { userId, paddleCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { paddleCustomerId: true },
  });
  return row?.paddleCustomerId ?? null;
}

export type CheckoutResult = { ok: true; transactionId: string; email: string } | { ok: false; error: string };

/**
 * Creates the Paddle transaction server-side, so the account that gets Pro is always the
 * signed-in one (custom data can't be set by the browser). The client opens it in Paddle.js.
 */
export async function startCheckout(interval: unknown): Promise<CheckoutResult> {
  const user = await requireUser();
  const parsed = intervalSchema.safeParse(interval);
  if (!parsed.success) return { ok: false, error: "Invalid plan." };
  if (!paddleConfigured()) return { ok: false, error: NOT_CONFIGURED };
  if ((await getPlan(user.id)).plan === "PRO") return { ok: false, error: "You're already on Pro." };

  const customerId = await paddleCustomerOf(user.id);
  const transaction = await paddle().transactions.create({
    items: [{ priceId: priceIdFor(parsed.data), quantity: 1 }],
    customData: { userId: user.id },
    ...(customerId ? { customerId } : {}),
  });
  return { ok: true, transactionId: transaction.id, email: user.email };
}

/** Paddle's hosted portal: payment method, invoices, cancel. */
export async function openCustomerPortal() {
  const user = await requireUser();
  if (!paddleConfigured()) redirect("/dashboard/billing?error=not-configured");
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, paddleSubscriptionId: { not: null }, paddleCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) redirect("/dashboard/billing");
  const session = await paddle().customerPortalSessions.create(subscription.paddleCustomerId!, [subscription.paddleSubscriptionId!]);
  redirect(session.urls.general.overview);
}

/** Moves the caller's subscription between monthly and yearly, prorated. */
export async function switchInterval(interval: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = intervalSchema.safeParse(interval);
  if (!parsed.success) return { ok: false, error: "Invalid plan." };
  if (!paddleConfigured()) return { ok: false, error: NOT_CONFIGURED };

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, paddleSubscriptionId: { not: null }, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { ok: false, error: "No active subscription to change." };
  if (subscription.interval === parsed.data) return { ok: true };

  await paddle().subscriptions.update(subscription.paddleSubscriptionId!, {
    items: [{ priceId: priceIdFor(parsed.data), quantity: 1 }],
    prorationBillingMode: "prorated_immediately",
  });
  // The webhook that follows updates the row; this makes the page right immediately.
  await prisma.subscription.update({ where: { id: subscription.id }, data: { interval: parsed.data, paddlePriceId: priceIdFor(parsed.data) } });
  return { ok: true };
}
