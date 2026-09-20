import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/flipbook-rules";
import type { Flipbook } from "@/lib/types";
import { fit, flipbookCard, siteCard } from "./card";

const book = (overrides: Partial<Flipbook> = {}): Flipbook => ({
  id: "fb_1",
  userId: "usr_1",
  title: "Summer Catalog 2026",
  slug: "summer-catalog",
  type: "PDF",
  status: "PUBLISHED",
  visibility: "PUBLIC",
  description: "Sixty-four pages of the new season.",
  settings: { ...DEFAULT_SETTINGS, accentColor: "#C0392B" },
  pageCount: 64,
  fileSize: null,
  error: null,
  thumbnailTint: ["#EEE", "#DDD"],
  thumbnailUrl: null,
  views: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  publishedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

describe("share preview card", () => {
  it("shows the book's title, description, address and page count", () => {
    expect(flipbookCard(book(), "flipbook.co", "flipbooks/fb_1/thumbnails/001.webp")).toEqual({
      title: "Summer Catalog 2026",
      subtitle: "Sixty-four pages of the new season.",
      meta: "flipbook.co/f/summer-catalog · 64 pages",
      accent: "#C0392B",
      coverKey: "flipbooks/fb_1/thumbnails/001.webp",
    });
  });

  it("falls back to a line of copy, counts one page, and ignores a broken accent", () => {
    const card = flipbookCard(book({ description: "   ", pageCount: 1, settings: { ...DEFAULT_SETTINGS, accentColor: "red" } }), "flipbook.co", null);
    expect(card).toMatchObject({ subtitle: "Read it online, on any device.", meta: "flipbook.co/f/summer-catalog · 1 page", accent: "#17150F", coverKey: null });
  });

  it("has a generic card for the site and for books readers can't see", () => {
    expect(siteCard("flipbook.co")).toMatchObject({ title: "Create stunning flipbooks", meta: "flipbook.co", coverKey: null });
  });

  it("cuts long text instead of overflowing the card", () => {
    expect(fit("  Summer   Catalog  ", 40)).toBe("Summer Catalog");
    expect(fit("x".repeat(80), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
