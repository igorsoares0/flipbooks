import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordEvents, visitorIdFor, type RequestInfo } from "./ingest";
import { getAnalyticsSummary } from "./summary";

// Reader events against the test database, on a flipbook of its own so the demo data other
// suites count stays untouched.

const OWNER = "usr_analytics_owner";
const BOOK = "fb_analytics_test";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const reader = (overrides: Partial<RequestInfo> = {}): RequestInfo => ({ ip: "203.0.113.7", userAgent: CHROME, country: "BR", viewerId: null, ...overrides });

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: OWNER } });
  await prisma.user.create({ data: { id: OWNER, name: "Analytics Owner", email: "analytics@test.local" } });
  await prisma.flipbook.create({
    data: {
      id: BOOK,
      userId: OWNER,
      title: "Analytics test",
      slug: "analytics-test",
      type: "CANVAS",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      settings: {},
      thumbnailTint: ["#FFFFFF", "#EEEEEE"],
      pageCount: 5,
      pages: { create: [1, 2, 3, 4, 5].map((pageNumber) => ({ pageNumber, width: 520, height: 690, background: { color: "#FFFFFF" } })) },
    },
  });
});

afterAll(() => prisma.$disconnect());

describe("recording reader events", () => {
  it("records a visit with its pages, devices and country, without storing the IP", async () => {
    const result = await recordEvents(
      {
        flipbookId: BOOK,
        sessionId: "sessionAAAA1",
        events: [
          { type: "VIEW" },
          { type: "PAGE_VIEW", page: 1, durationMs: 4_000 },
          { type: "PAGE_VIEW", page: 2, durationMs: 20_000 },
          { type: "PAGE_VIEW", page: 3 },
        ],
      },
      reader(),
    );
    expect(result).toEqual({ recorded: 4 });
    const rows = await prisma.analyticsEvent.findMany({ where: { flipbookId: BOOK, sessionId: "sessionAAAA1" } });
    expect(rows.every((r) => r.device === "Desktop" && r.country === "BR")).toBe(true);
    expect(rows[0].visitorId).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(rows)).not.toContain("203.0.113.7");
    expect((await prisma.flipbook.findUniqueOrThrow({ where: { id: BOOK } })).viewCount).toBe(1);
  });

  it("counts one view per session within 30 minutes", async () => {
    await recordEvents({ flipbookId: BOOK, sessionId: "sessionAAAA1", events: [{ type: "VIEW" }, { type: "VIEW" }] }, reader());
    expect(await prisma.analyticsEvent.count({ where: { flipbookId: BOOK, sessionId: "sessionAAAA1", type: "VIEW" } })).toBe(1);
  });

  it("skips the owner, bots, unpublished books and pages that don't exist", async () => {
    const batch = { flipbookId: BOOK, sessionId: "sessionBBBB2", events: [{ type: "VIEW" as const }] };
    expect(await recordEvents(batch, reader({ viewerId: OWNER }))).toEqual({ recorded: 0, reason: "owner" });
    expect(await recordEvents(batch, reader({ userAgent: "Googlebot/2.1" }))).toEqual({ recorded: 0, reason: "bot" });
    expect(await recordEvents({ ...batch, flipbookId: "fb_theo_priv" }, reader())).toEqual({ recorded: 0, reason: "not-readable" });
    expect(await recordEvents({ ...batch, events: [{ type: "PAGE_VIEW", page: 99 }] }, reader())).toEqual({ recorded: 0 });
  });

  it("caps time on a spread at ten minutes", async () => {
    await recordEvents({ flipbookId: BOOK, sessionId: "sessionCCCC3", events: [{ type: "PAGE_VIEW", page: 4, durationMs: 5 * 60 * 60_000 }] }, reader());
    const row = await prisma.analyticsEvent.findFirstOrThrow({ where: { sessionId: "sessionCCCC3" } });
    expect(row.durationMs).toBe(10 * 60_000);
  });

  it("gives the same reader the same visitor id on one day, and a new one the next", () => {
    const day = new Date("2026-09-19T10:00:00Z");
    expect(visitorIdFor(reader(), BOOK, day)).toBe(visitorIdFor(reader(), BOOK, new Date("2026-09-19T23:00:00Z")));
    expect(visitorIdFor(reader(), BOOK, day)).not.toBe(visitorIdFor(reader(), BOOK, new Date("2026-09-20T10:00:00Z")));
    expect(visitorIdFor(reader(), BOOK, day)).not.toBe(visitorIdFor(reader({ ip: "203.0.113.8" }), BOOK, day));
  });
});

describe("analytics summary", () => {
  it("adds up views, readers, reading time, pages, devices and countries", async () => {
    await recordEvents(
      {
        flipbookId: BOOK,
        sessionId: "sessionDDDD4",
        events: [{ type: "VIEW" }, { type: "PAGE_VIEW", page: 1, durationMs: 6_000 }, { type: "SHARE" }],
      },
      reader({ ip: "198.51.100.2", userAgent: IPHONE, country: "US" }),
    );

    const summary = await getAnalyticsSummary(BOOK, 5, "30d");
    expect(summary.totals).toMatchObject({ views: 2, uniqueVisitors: 2, shares: 1, downloads: 0 });
    // (4 + 20 + 6 minutes-capped… seconds) over 2 visits; session CCCC3 has no VIEW so isn't a visit.
    expect(summary.totals.pageViews).toBe(5);
    expect(summary.viewsPerPage).toEqual([2, 1, 1, 1, 0]);
    expect(summary.devices).toEqual([
      { name: "Desktop", share: 0.5 },
      { name: "Mobile", share: 0.5 },
    ]);
    expect(summary.countries.map((c) => c.name).sort()).toEqual(["Brazil", "United States"]);
    expect(summary.deltas.views).toBe(0); // nothing in the previous 30 days to compare with
  });
});
