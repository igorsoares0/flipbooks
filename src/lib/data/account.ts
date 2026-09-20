import "server-only";

import { paddle, paddleConfigured } from "@/lib/billing/paddle";
import { prisma } from "@/lib/db";
import { deletePrefix, keys } from "@/lib/storage";

// Closing an account. The database cascades from User to flipbooks, pages, elements,
// assets, analytics and subscriptions; the files and the Paddle subscription are ours to
// clean up first, so nothing keeps costing money after the rows are gone.

/** Stops billing for a leaving customer. Best effort: a failure here must not block deletion. */
async function cancelSubscriptions(userId: string) {
  if (!paddleConfigured()) return;
  const rows = await prisma.subscription.findMany({
    where: { userId, paddleSubscriptionId: { not: null }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED"] } },
    select: { paddleSubscriptionId: true },
  });
  for (const row of rows) {
    await paddle()
      .subscriptions.cancel(row.paddleSubscriptionId!, { effectiveFrom: "immediately" })
      .catch((error) => console.error("[paddle] cancel on account deletion failed", row.paddleSubscriptionId, error));
  }
}

/** Everything that has to happen before the account's rows are deleted. */
export async function purgeAccount(userId: string) {
  await cancelSubscriptions(userId);

  const flipbooks = await prisma.flipbook.findMany({ where: { userId }, select: { id: true } });
  for (const { id } of flipbooks) {
    await deletePrefix(keys.prefix(id)).catch((error) => console.error("[storage] flipbook cleanup failed", id, error));
  }
  await deletePrefix(keys.assetPrefix(userId)).catch((error) => console.error("[storage] asset cleanup failed", userId, error));
  return { flipbooks: flipbooks.length };
}
