// Data access for pages and layouts. Each function resolves the signed-in user
// (src/lib/auth/session.ts) and delegates to the owner-scoped repositories.
import "server-only";

import { cache } from "react";
import { getAnalyticsSummary } from "@/lib/analytics/summary";
import { getOptionalUser, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { resolveEntitlements } from "@/lib/entitlements";
import { hasPages } from "@/lib/flipbook-rules";
import type { AnalyticsRange, Billing } from "@/lib/types";
import * as assetRepo from "./assets";
import * as repo from "./flipbooks";

export const isViewable = hasPages;

/** Flipbooks per page on /dashboard/flipbooks. */
export const PER_PAGE = 20;

export const getCurrentUser = requireUser;

/** One page of the user's flipbooks, newest first, with the total for the pager. */
export async function getFlipbookPage({ query, page = 1, perPage = PER_PAGE }: { query?: string; page?: number; perPage?: number }) {
  const user = await requireUser();
  const [flipbooks, total] = await Promise.all([
    repo.listFlipbooks(user.id, { query, take: perPage, skip: (page - 1) * perPage }),
    repo.countFlipbooks(user.id, query),
  ]);
  return { flipbooks, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getRecentFlipbooks(limit = 6) {
  const user = await requireUser();
  return repo.listFlipbooks(user.id, { take: limit });
}

export async function getFlipbookCount() {
  return repo.countFlipbooks((await requireUser()).id);
}

/** The signed-in user's flipbook, or null (also when it belongs to someone else). */
export const getFlipbook = cache(async (id: string) => repo.getOwnedFlipbook((await requireUser()).id, id));

/** A flipbook for the public viewer and embeds; owners can also preview unpublished books. */
export const getViewableFlipbook = cache(async (by: { slug: string } | { id: string }) => {
  const viewer = await getOptionalUser();
  return repo.getReadableFlipbook(by, viewer?.id);
});

export const getFlipbookPages = repo.getPages;

export async function getEditorDocument(id: string) {
  const flipbook = await getFlipbook(id);
  if (!flipbook || !hasPages(flipbook)) return null;
  return { flipbook, pages: await repo.getPages(id) };
}

/** Whether the account can sign in with a password (Google-only accounts can't, until they set one). */
export async function hasPasswordAccount(userId: string) {
  return (await prisma.account.count({ where: { userId, providerId: "credential" } })) > 0;
}

/** The signed-in user's image library, newest first, with signed URLs. */
export async function getAssets() {
  return assetRepo.listAssets((await requireUser()).id);
}

export async function getDashboardStats() {
  return repo.getDashboardStats((await requireUser()).id);
}

export async function getTopFlipbook() {
  return repo.getTopFlipbook((await requireUser()).id);
}

export const getEntitlements = cache(async () => repo.getEntitlements((await requireUser()).id));

export const getBilling = cache(async (): Promise<Billing> => {
  const user = await requireUser();
  const [{ plan, subscription }, usage] = await Promise.all([repo.getPlan(user.id), repo.getUsage(user.id)]);
  return { plan, provider: "paddle", subscription, entitlements: resolveEntitlements(plan), usage };
});

/** Reader analytics for one of the user's published flipbooks. */
export async function getAnalytics(id: string, range: AnalyticsRange) {
  const flipbook = await getFlipbook(id);
  if (!flipbook || flipbook.status !== "PUBLISHED") return null;
  return getAnalyticsSummary(flipbook.id, flipbook.pageCount, range);
}
