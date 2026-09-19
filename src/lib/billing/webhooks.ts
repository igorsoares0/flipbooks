import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { welcomeToProEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";
import { subscriptionFields, userIdOf, type PaddleSubscriptionPayload } from "./subscriptions";

// Applies Paddle notifications. Paddle retries failed deliveries and doesn't guarantee
// order, so every event is applied at most once (PaddleEvent) and never over a newer one
// (Subscription.lastEventAt).

export type PaddleNotification = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: unknown;
};

export type HandleResult = "applied" | "duplicate" | "stale" | "ignored" | "unknown-user";

/** Rolls the transaction back so the event stays unrecorded and a redelivery can retry it. */
class UnknownUser extends Error {}

export async function handlePaddleNotification(event: PaddleNotification): Promise<HandleResult> {
  if (!event.event_type.startsWith("subscription.")) {
    // Receipts and invoices come from Paddle; transactions need no local state.
    await recordEvent(event).catch(() => undefined);
    return "ignored";
  }

  const sub = event.data as PaddleSubscriptionPayload;
  const fields = subscriptionFields(sub);
  // One Paddle account can sell other products (and a sandbox is often shared between
  // projects): subscriptions to prices that aren't Flipbook's are none of our business.
  if (!isOurPrice(fields.paddlePriceId)) {
    await recordEvent(event).catch(() => undefined);
    return "ignored";
  }
  const occurredAt = new Date(event.occurred_at);

  const result = await prisma
    .$transaction(async (tx) => {
      await tx.paddleEvent.create({ data: { id: event.event_id, type: event.event_type } });

      const existing = await tx.subscription.findUnique({ where: { paddleSubscriptionId: fields.paddleSubscriptionId } });
      if (existing?.lastEventAt && existing.lastEventAt >= occurredAt) return { outcome: "stale" as const };

      const userId =
        existing?.userId ??
        userIdOf(sub) ??
        (await tx.subscription.findFirst({ where: { paddleCustomerId: fields.paddleCustomerId }, select: { userId: true } }))?.userId ??
        null;
      if (!userId || !(await tx.user.findUnique({ where: { id: userId }, select: { id: true } }))) throw new UnknownUser();

      await tx.subscription.upsert({
        where: { paddleSubscriptionId: fields.paddleSubscriptionId },
        create: { ...fields, userId, plan: "PRO", lastEventAt: occurredAt },
        update: { ...fields, lastEventAt: occurredAt },
      });
      // Welcome once: when the subscription first starts (or a trial converts).
      const started = fields.status === "ACTIVE" && (!existing || existing.status === "TRIALING");
      return { outcome: "applied" as const, welcome: started ? userId : null };
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { outcome: "duplicate" as const };
      if (error instanceof UnknownUser) return { outcome: "unknown-user" as const };
      throw error;
    });

  if (result.outcome === "unknown-user") console.error("[paddle] subscription for an unknown account", fields.paddleSubscriptionId);
  if (result.outcome === "applied" && result.welcome) await sendWelcome(result.welcome);
  return result.outcome;
}

/** True for the configured Pro prices; every price counts when none are configured (tests). */
function isOurPrice(priceId: string | null) {
  const ours = [process.env.PADDLE_PRICE_PRO_MONTH, process.env.PADDLE_PRICE_PRO_YEAR].filter(Boolean);
  return ours.length === 0 || (priceId !== null && ours.includes(priceId));
}

async function recordEvent(event: PaddleNotification) {
  await prisma.paddleEvent.create({ data: { id: event.event_id, type: event.event_type } });
}

async function sendWelcome(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return;
  await sendEmail(welcomeToProEmail({ to: user.email, name: user.name, url: new URL("/dashboard", siteUrl).toString() })).catch((error) =>
    console.error("[paddle] welcome email failed", error),
  );
}
