import "server-only";

import { prisma } from "@/lib/db";
import { monthlyViews, readerStats } from "@/lib/analytics/summary";
import { grantingSubscriptionWhere, resolveEntitlements } from "@/lib/entitlements";
import { effectiveSettings } from "@/lib/entitlements/policy";
import { hasPages } from "@/lib/flipbook-rules";
import type { DashboardStats, Entitlements, Plan, SubscriptionSummary, Usage } from "@/lib/types";
import { toFlipbook, toPage } from "./mappers";
import { withPageImageUrls, withThumbnailUrl } from "./urls";

// Read side. Every function that returns private data takes the owner's id and
// filters on it, so a flipbook that belongs to someone else is simply "not found".

/** Owner-scoped filter shared by the list and its count, so pages and totals agree. */
function flipbookFilter(userId: string, query?: string) {
  const q = query?.trim();
  return { userId, ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}) };
}

export async function listFlipbooks(userId: string, { query, take, skip }: { query?: string; take?: number; skip?: number } = {}) {
  const rows = await prisma.flipbook.findMany({
    where: flipbookFilter(userId, query),
    orderBy: { updatedAt: "desc" },
    take,
    skip,
  });
  return Promise.all(rows.map((row) => withThumbnailUrl(toFlipbook(row), row)));
}

export async function countFlipbooks(userId: string, query?: string) {
  return prisma.flipbook.count({ where: flipbookFilter(userId, query) });
}

export async function getOwnedFlipbook(userId: string, id: string) {
  const row = await prisma.flipbook.findFirst({ where: { id, userId } });
  return row ? withThumbnailUrl(toFlipbook(row), row) : null;
}

/**
 * A flipbook as a reader may see it: published and not private. Its owner may also
 * preview drafts and ready books, as long as they have pages.
 */
export async function getReadableFlipbook(by: { slug: string } | { id: string }, viewerId?: string | null) {
  const row = await prisma.flipbook.findUnique({ where: "slug" in by ? { slug: by.slug } : { id: by.id } });
  if (!row) return null;
  const owned = toFlipbook(row);
  // Readers (and the owner's preview) see what the owner's current plan allows.
  const flipbook = { ...owned, settings: effectiveSettings(owned.settings, await getEntitlements(row.userId)) };
  if (viewerId && viewerId === row.userId) return hasPages(flipbook) ? withThumbnailUrl(flipbook, row) : null;
  if (row.status !== "PUBLISHED" || row.visibility === "PRIVATE" || row.pageCount === 0) return null;
  return withThumbnailUrl(flipbook, row);
}

/** A published, public flipbook for share previews, with the storage key of its cover. */
export async function getShareTarget(slug: string) {
  const row = await prisma.flipbook.findUnique({ where: { slug } });
  if (!row || row.status !== "PUBLISHED" || row.visibility !== "PUBLIC" || row.pageCount === 0) return null;
  const flipbook = toFlipbook(row);
  return { flipbook: { ...flipbook, settings: effectiveSettings(flipbook.settings, await getEntitlements(row.userId)) }, thumbnailKey: row.thumbnailKey };
}

export async function getPages(flipbookId: string, { pageNumbers }: { pageNumbers?: number[] } = {}) {
  const rows = await prisma.page.findMany({
    where: { flipbookId, ...(pageNumbers ? { pageNumber: { in: pageNumbers } } : {}) },
    orderBy: { pageNumber: "asc" },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });
  return withPageImageUrls(rows.map(toPage));
}

/** Storage key of the uploaded PDF. Call only after a readability or ownership check. */
export async function getOriginalPdfKey(flipbookId: string) {
  const row = await prisma.flipbook.findUnique({ where: { id: flipbookId }, select: { originalPdfKey: true } });
  return row?.originalPdfKey ?? null;
}

export async function getTopFlipbook(userId: string) {
  const row = await prisma.flipbook.findFirst({
    where: { userId, status: "PUBLISHED" },
    orderBy: { viewCount: "desc" },
  });
  return row ? toFlipbook(row) : null;
}

type PlanState = { plan: Plan; subscription: SubscriptionSummary | null };

/** The plan the user has right now, and the subscription granting it. */
export async function getPlan(userId: string): Promise<PlanState> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, ...grantingSubscriptionWhere() },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { plan: "FREE", subscription: null };
  return {
    plan: subscription.plan,
    subscription: {
      interval: subscription.interval,
      status: subscription.status,
      currentPeriodEnd: (subscription.currentPeriodEnd ?? subscription.expiresAt)?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      managedByPaddle: Boolean(subscription.paddleSubscriptionId),
    },
  };
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  return resolveEntitlements((await getPlan(userId)).plan);
}

export async function getUsage(userId: string): Promise<Usage> {
  const [flipbooks, pdfs, assets, views] = await Promise.all([
    prisma.flipbook.count({ where: { userId } }),
    prisma.flipbook.aggregate({ where: { userId }, _sum: { fileSize: true } }),
    prisma.asset.aggregate({ where: { userId }, _sum: { size: true } }),
    monthlyViews(userId),
  ]);
  return {
    flipbooks,
    storageBytes: (pdfs._sum.fileSize ?? 0) + (assets._sum.size ?? 0),
    monthlyViews: views,
  };
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [flipbookCount, publishedThisMonth, views, usage, entitlements, readers] = await Promise.all([
    prisma.flipbook.count({ where: { userId } }),
    prisma.flipbook.count({ where: { userId, status: "PUBLISHED", publishedAt: { gte: monthStart } } }),
    prisma.flipbook.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    getUsage(userId),
    getEntitlements(userId),
    readerStats(userId),
  ]);
  return {
    flipbookCount,
    publishedThisMonth,
    totalViews: views._sum.viewCount ?? 0,
    viewsDelta: readers.viewsDelta,
    avgReadSeconds: readers.avgReadSeconds,
    storageBytes: usage.storageBytes,
    storageLimitBytes: entitlements.maxStorageBytes,
  };
}
