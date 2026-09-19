import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/types";

// Aggregates over AnalyticsEvent for the analytics page and the dashboard (spec §26).

const DAY = 24 * 60 * 60_000;
const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = { "30d": 30, "90d": 90 };

type Totals = AnalyticsSummary["totals"];

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string) {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Relative change; 0 when there is nothing to compare against. */
export function ratio(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous : 0;
}

type TotalsRow = {
  views: bigint;
  visitors: bigint;
  page_views: bigint;
  shares: bigint;
  downloads: bigint;
  read_ms: bigint | number | null;
  sessions: bigint;
};

/** Sessions that opened the book, and how long they spent reading on average. */
export function toTotals(row: TotalsRow): Totals {
  const sessions = Number(row.sessions);
  return {
    views: Number(row.views),
    uniqueVisitors: Number(row.visitors),
    pageViews: Number(row.page_views),
    avgReadSeconds: sessions ? Math.round(Number(row.read_ms ?? 0) / 1000 / sessions) : 0,
    shares: Number(row.shares),
    downloads: Number(row.downloads),
  };
}

async function totals(flipbookIds: Prisma.Sql, from: Date, to: Date): Promise<Totals> {
  const [row] = await prisma.$queryRaw<TotalsRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE type = 'VIEW') AS views,
      COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'VIEW') AS visitors,
      COUNT(*) FILTER (WHERE type = 'PAGE_VIEW') AS page_views,
      COUNT(*) FILTER (WHERE type = 'SHARE') AS shares,
      COUNT(*) FILTER (WHERE type = 'DOWNLOAD') AS downloads,
      SUM("durationMs") FILTER (WHERE type = 'PAGE_VIEW') AS read_ms,
      COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'VIEW') AS sessions
    FROM analytics_events
    WHERE "flipbookId" IN (${flipbookIds}) AND "createdAt" >= ${from} AND "createdAt" < ${to}`;
  return toTotals(row);
}

function periodOf(range: AnalyticsRange, now: Date) {
  if (range === "all") return { from: new Date(0), to: now, previous: null };
  const length = RANGE_DAYS[range] * DAY;
  const from = new Date(now.getTime() - length);
  return { from, to: now, previous: { from: new Date(from.getTime() - length), to: from } };
}

/** One flipbook's numbers. Call only after the ownership check. */
export async function getAnalyticsSummary(flipbookId: string, pageCount: number, range: AnalyticsRange, now = new Date()): Promise<AnalyticsSummary> {
  const { from, to, previous } = periodOf(range, now);
  const ids = Prisma.sql`${flipbookId}`;

  const [current, before, perPage, devices, countries] = await Promise.all([
    totals(ids, from, to),
    previous ? totals(ids, previous.from, previous.to) : null,
    prisma.$queryRaw<{ page: number; views: bigint }[]>`
      SELECT p."pageNumber" AS page, COUNT(*) AS views
      FROM analytics_events e JOIN pages p ON p.id = e."pageId"
      WHERE e."flipbookId" = ${flipbookId} AND e.type = 'PAGE_VIEW' AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
      GROUP BY p."pageNumber"`,
    prisma.analyticsEvent.groupBy({
      by: ["device"],
      where: { flipbookId, type: "VIEW", createdAt: { gte: from, lt: to }, device: { not: null } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["country"],
      where: { flipbookId, type: "VIEW", createdAt: { gte: from, lt: to }, country: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 5,
    }),
  ]);

  const viewsPerPage = Array.from({ length: pageCount }, () => 0);
  for (const row of perPage) if (row.page >= 1 && row.page <= pageCount) viewsPerPage[row.page - 1] = Number(row.views);

  const deviceTotal = devices.reduce((sum, d) => sum + d._count._all, 0);
  return {
    range,
    totals: current,
    deltas: before
      ? {
          views: ratio(current.views, before.views),
          uniqueVisitors: ratio(current.uniqueVisitors, before.uniqueVisitors),
          pageViews: ratio(current.pageViews, before.pageViews),
          avgReadSeconds: before.avgReadSeconds ? current.avgReadSeconds - before.avgReadSeconds : 0,
          shares: ratio(current.shares, before.shares),
          downloads: ratio(current.downloads, before.downloads),
        }
      : { views: 0, uniqueVisitors: 0, pageViews: 0, avgReadSeconds: 0, shares: 0, downloads: 0 },
    viewsPerPage,
    devices: devices
      .map((d) => ({ name: d.device!, share: deviceTotal ? d._count._all / deviceTotal : 0 }))
      .sort((a, b) => b.share - a.share),
    countries: countries.map((c) => ({ name: countryName(c.country!), views: c._count._all })),
  };
}

/** Views across all of a user's books, this calendar month (UTC): the plan's soft limit. */
export async function monthlyViews(userId: string, now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return prisma.analyticsEvent.count({ where: { type: "VIEW", createdAt: { gte: monthStart }, flipbook: { userId } } });
}

/** Last 30 days vs the 30 before, across all of a user's books, for the dashboard. */
export async function readerStats(userId: string, now = new Date()) {
  const ids = Prisma.sql`SELECT id FROM flipbooks WHERE "userId" = ${userId}`;
  const from = new Date(now.getTime() - 30 * DAY);
  const [current, before] = await Promise.all([totals(ids, from, now), totals(ids, new Date(from.getTime() - 30 * DAY), from)]);
  return { viewsDelta: ratio(current.views, before.views), avgReadSeconds: current.avgReadSeconds };
}
