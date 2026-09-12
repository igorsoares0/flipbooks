import { describe, expect, it } from "vitest";
import {
  DRAFT_FLIPBOOK_ID,
  getAnalytics,
  getDashboardStats,
  getEditorDocument,
  getFlipbook,
  getFlipbookPages,
  getFlipbooks,
  getRecentFlipbooks,
  getTopFlipbook,
  getViewableFlipbook,
} from ".";

// These pin the behavior pages rely on, so the Prisma-backed versions in phase 2
// can be checked against the same expectations.

describe("flipbook queries", () => {
  it("lists every flipbook and searches titles case-insensitively", async () => {
    expect(await getFlipbooks()).toHaveLength(12);
    const hits = await getFlipbooks("  CATALOG ");
    expect(hits.map((f) => f.title)).toEqual(["Summer Catalog 2026", "Winter Catalog 2025"]);
  });

  it("returns the six most recent for the dashboard", async () => {
    expect(await getRecentFlipbooks()).toHaveLength(6);
  });

  it("never leaks mock-only fields", async () => {
    const fb = await getFlipbook("fb_8Kd2");
    expect(fb).not.toHaveProperty("cover");
    expect(await getFlipbook("nope")).toBeNull();
  });

  it("only lets readers view books that have pages", async () => {
    expect(await getViewableFlipbook({ slug: "summer-catalog" })).not.toBeNull();
    expect(await getViewableFlipbook({ id: "fb_9Rw4" })).not.toBeNull(); // READY
    expect(await getViewableFlipbook({ slug: "annual-report-2026" })).toBeNull(); // PROCESSING
    expect(await getViewableFlipbook({ slug: "pricing-v3" })).toBeNull(); // FAILED
    expect(await getViewableFlipbook({ slug: "nope" })).toBeNull();
  });
});

describe("pages", () => {
  it("builds one page per page count with stable ids", async () => {
    const pages = await getFlipbookPages("fb_8Kd2");
    expect(pages).toHaveLength(64);
    expect(pages.map((p) => p.pageNumber)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(await getFlipbookPages("fb_8Kd2")).toBe(pages);
  });

  it("matches the design: the cover, then chapter two on page 4 and a photo on page 5", async () => {
    const pages = await getFlipbookPages("fb_8Kd2");
    expect(pages[0].elements.map((el) => el.name)).toEqual(["Heading", "Cover image", "Ellipse", "Caption", "Page number"]);
    const text = (el: (typeof pages)[number]["elements"][number]) =>
      el.type === "TEXT" ? el.properties.runs.map((r) => r.text).join("") : "";
    expect(text(pages[3].elements[0])).toBe("CHAPTER TWO");
    expect(text(pages[3].elements[1])).toBe("Light, linen\nand long evenings");
    expect(pages[4].elements[0].type).toBe("IMAGE");
  });

  it("has no pages for processing or failed books", async () => {
    expect(await getFlipbookPages("fb_5Tn1")).toEqual([]);
    expect(await getFlipbookPages("fb_7Pm3")).toEqual([]);
  });
});

describe("editor documents", () => {
  it("opens an existing book with its pages", async () => {
    const doc = await getEditorDocument("fb_3Qx7");
    expect(doc?.flipbook.type).toBe("CANVAS");
    expect(doc?.pages).toHaveLength(28);
  });

  it("refuses books that cannot be edited yet", async () => {
    expect(await getEditorDocument("fb_5Tn1")).toBeNull();
    expect(await getEditorDocument("nope")).toBeNull();
  });

  it("creates an unsaved blank draft", async () => {
    const doc = await getEditorDocument(DRAFT_FLIPBOOK_ID);
    expect(doc?.flipbook).toMatchObject({ title: "Untitled flipbook", type: "CANVAS", status: "DRAFT" });
    expect(doc?.pages).toHaveLength(1);
    expect(doc?.pages[0].elements).toEqual([]);
  });

  it("seeds a draft from a template", async () => {
    const doc = await getEditorDocument(DRAFT_FLIPBOOK_ID, "tpl_menu");
    expect(doc?.flipbook.title).toBe("Menu (from template)");
    expect(doc?.pages).toHaveLength(8);
    expect(doc?.pages[0].background.color).toBe("#F6F1E4");
  });
});

describe("dashboard and analytics", () => {
  it("derives totals from the flipbooks", async () => {
    const stats = await getDashboardStats();
    expect(stats.flipbookCount).toBe(12);
    expect(stats.totalViews).toBe(48_190);
    expect(stats.storageLimitBytes).toBe(20e9);
  });

  it("opens analytics for the most-read book", async () => {
    expect((await getTopFlipbook())?.id).toBe("fb_8Kd2");
  });

  it("only has analytics for published books", async () => {
    const summary = await getAnalytics("fb_8Kd2", "30d");
    expect(summary?.totals.views).toBe(12_480);
    expect(summary?.viewsPerPage).toHaveLength(16);
    expect((await getAnalytics("fb_8Kd2", "90d"))!.totals.views).toBeGreaterThan(12_480);
    expect(await getAnalytics("fb_9Rw4", "30d")).toBeNull();
  });
});
