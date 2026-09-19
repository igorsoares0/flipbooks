import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deviceOf, isBot } from "./user-agent";

// Reader events from the public viewer and embeds (spec §26). Collected for every plan, so
// upgrading shows past readers too. No cookies and no IP addresses are stored: a reader is
// a random per-tab session id plus a daily hash that approximates unique visitors.

export const MAX_EVENTS_PER_BATCH = 50;
/** A reader reopening the book within this window is the same view. */
const VIEW_DEDUPE_MS = 30 * 60_000;
/** Longest time counted on one spread; an open tab left overnight isn't reading. */
export const MAX_DURATION_MS = 10 * 60_000;
/** Events one session may record per hour, against scripted floods. */
const SESSION_HOURLY_CAP = 2_000;

export const eventBatchSchema = z.object({
  flipbookId: z.string().min(1).max(64),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  events: z
    .array(
      z.object({
        type: z.enum(["VIEW", "PAGE_VIEW", "SHARE", "DOWNLOAD"]),
        page: z.number().int().min(1).max(10_000).optional(),
        durationMs: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(MAX_EVENTS_PER_BATCH),
});

export type EventBatch = z.infer<typeof eventBatchSchema>;

export type RequestInfo = {
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  /** The signed-in user, if any: owners previewing their own book aren't readers. */
  viewerId: string | null;
  now?: Date;
};

export type IngestResult = { recorded: number; reason?: "not-readable" | "owner" | "bot" | "flood" };

function salt() {
  return process.env.ANALYTICS_SALT || process.env.BETTER_AUTH_SECRET || "flipbook-analytics";
}

/** Same reader, same book, same UTC day → same id. Can't be reversed into an IP. */
export function visitorIdFor(info: Pick<RequestInfo, "ip" | "userAgent">, flipbookId: string, now: Date) {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt()}:${day}:${info.ip ?? ""}:${info.userAgent ?? ""}:${flipbookId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Two-letter country from the CDN in front of the app, when there is one. */
export function countryFrom(headers: Headers) {
  const code = (headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country") || "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

export async function recordEvents(batch: EventBatch, info: RequestInfo): Promise<IngestResult> {
  const now = info.now ?? new Date();
  const flipbook = await prisma.flipbook.findUnique({
    where: { id: batch.flipbookId },
    select: { id: true, userId: true, status: true, visibility: true },
  });
  if (!flipbook || flipbook.status !== "PUBLISHED" || flipbook.visibility === "PRIVATE") return { recorded: 0, reason: "not-readable" };
  if (info.viewerId === flipbook.userId) return { recorded: 0, reason: "owner" };
  if (isBot(info.userAgent)) return { recorded: 0, reason: "bot" };

  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const recent = await prisma.analyticsEvent.count({
    where: { flipbookId: flipbook.id, sessionId: batch.sessionId, createdAt: { gte: hourAgo } },
  });
  if (recent + batch.events.length > SESSION_HOURLY_CAP) return { recorded: 0, reason: "flood" };

  let events = batch.events;
  if (events.some((e) => e.type === "VIEW")) {
    const seen = await prisma.analyticsEvent.findFirst({
      where: {
        flipbookId: flipbook.id,
        sessionId: batch.sessionId,
        type: "VIEW",
        createdAt: { gte: new Date(now.getTime() - VIEW_DEDUPE_MS) },
      },
      select: { id: true },
    });
    // One VIEW per batch at most, and none when this session was counted recently.
    let viewKept = Boolean(seen);
    events = events.filter((e) => {
      if (e.type !== "VIEW") return true;
      if (viewKept) return false;
      viewKept = true;
      return true;
    });
  }

  const pageNumbers = [...new Set(events.flatMap((e) => (e.page ? [e.page] : [])))];
  const pages = pageNumbers.length
    ? await prisma.page.findMany({ where: { flipbookId: flipbook.id, pageNumber: { in: pageNumbers } }, select: { id: true, pageNumber: true } })
    : [];
  const pageIds = new Map(pages.map((p) => [p.pageNumber, p.id]));

  const shared = {
    flipbookId: flipbook.id,
    sessionId: batch.sessionId,
    visitorId: visitorIdFor(info, flipbook.id, now),
    country: info.country,
    device: info.userAgent ? deviceOf(info.userAgent) : null,
    createdAt: now,
  };
  const rows = events
    // Page views must point at a real page of this book.
    .filter((e) => e.type !== "PAGE_VIEW" || (e.page && pageIds.has(e.page)))
    .map((e) => ({
      ...shared,
      type: e.type,
      pageId: e.page ? (pageIds.get(e.page) ?? null) : null,
      durationMs: e.type === "PAGE_VIEW" && e.durationMs !== undefined ? Math.min(e.durationMs, MAX_DURATION_MS) : null,
    }));
  if (rows.length === 0) return { recorded: 0 };

  const views = rows.filter((r) => r.type === "VIEW").length;
  await prisma.$transaction([
    prisma.analyticsEvent.createMany({ data: rows }),
    ...(views ? [prisma.flipbook.update({ where: { id: flipbook.id }, data: { viewCount: { increment: views } } })] : []),
  ]);
  return { recorded: rows.length };
}
