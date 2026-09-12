import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveEntitlements } from "@/lib/entitlements";
import { hasPages } from "@/lib/flipbook-rules";
import type { DashboardStats, Entitlements, Plan, Usage } from "@/lib/types";
import { toFlipbook, toPage } from "./mappers";
import { withPageImageUrls, withThumbnailUrl } from "./urls";

// Read side. Every function that returns private data takes the owner's id and
// filters on it, so a flipbook that belongs to someone else is simply "not found".

export async function listFlipbooks(userId: string, { query, take }: { query?: string; take?: number } = {}) {
  const q = query?.trim();
  const rows = await prisma.flipbook.findMany({
    where: { userId, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return Promise.all(rows.map((row) => withThumbnailUrl(toFlipbook(row), row)));
}

export async function countFlipbooks(userId: string) {
  return prisma.flipbook.count({ where: { userId } });
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
  const flipbook = toFlipbook(row);
  if (viewerId && viewerId === row.userId) return hasPages(flipbook) ? withThumbnailUrl(flipbook, row) : null;
  if (row.status !== "PUBLISHED" || row.visibility === "PRIVATE" || row.pageCount === 0) return null;
  return withThumbnailUrl(flipbook, row);
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

export async function getPlan(userId: string): Promise<{ plan: Plan; purchasedAt: string | null; expiresAt: string | null }> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { plan: "FREE", purchasedAt: null, expiresAt: null };
  return {
    plan: subscription.plan,
    purchasedAt: subscription.createdAt.toISOString(),
    expiresAt: subscription.expiresAt?.toISOString() ?? null,
  };
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  return resolveEntitlements((await getPlan(userId)).plan);
}

export async function getUsage(userId: string): Promise<Usage> {
  const readable: Prisma.FlipbookWhereInput = { userId, type: "PDF", status: { in: ["DRAFT", "READY", "PUBLISHED"] } };
  const [pdfs, assets, processed] = await Promise.all([
    prisma.flipbook.aggregate({ where: { userId }, _sum: { fileSize: true } }),
    prisma.asset.aggregate({ where: { userId }, _sum: { size: true } }),
    prisma.flipbook.aggregate({ where: readable, _sum: { pageCount: true } }),
  ]);
  return {
    storageBytes: (pdfs._sum.fileSize ?? 0) + (assets._sum.size ?? 0),
    pagesProcessed: processed._sum.pageCount ?? 0,
    // Tracked from the analytics phase on.
    monthlyViews: 0,
    bandwidthBytes: 0,
  };
}

export async function getDashboardStats(userId: string, avgReadSeconds: number): Promise<DashboardStats> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [flipbookCount, publishedThisMonth, views, usage, entitlements] = await Promise.all([
    prisma.flipbook.count({ where: { userId } }),
    prisma.flipbook.count({ where: { userId, status: "PUBLISHED", publishedAt: { gte: monthStart } } }),
    prisma.flipbook.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    getUsage(userId),
    getEntitlements(userId),
  ]);
  return {
    flipbookCount,
    publishedThisMonth,
    totalViews: views._sum.viewCount ?? 0,
    viewsDelta: 0,
    avgReadSeconds,
    storageBytes: usage.storageBytes,
    storageLimitBytes: entitlements.maxStorageBytes,
  };
}
