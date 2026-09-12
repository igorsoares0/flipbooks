import { describe, expect, it } from "vitest";
import { keys } from "./storage/s3";
import { hasPages, slugify, slugProblem, titleFromFilename } from "./flipbook-rules";

describe("titleFromFilename", () => {
  it("turns file names into readable titles", () => {
    expect(titleFromFilename("summer_catalog-2026 (final).PDF")).toBe("Summer catalog 2026 (final)");
    expect(titleFromFilename("  Annual   Report.pdf ")).toBe("Annual Report");
    expect(titleFromFilename(".pdf")).toBe("Untitled flipbook");
    expect(titleFromFilename(`${"x".repeat(300)}.pdf`)).toHaveLength(120);
  });
});

describe("storage keys", () => {
  it("follow the spec's layout, with zero-padded page numbers", () => {
    expect(keys.original("fb_1")).toBe("flipbooks/fb_1/original.pdf");
    expect(keys.page("fb_1", 7)).toBe("flipbooks/fb_1/pages/007.webp");
    expect(keys.thumbnail("fb_1", 123)).toBe("flipbooks/fb_1/thumbnails/123.webp");
    expect(keys.page("fb_1", 7).startsWith(keys.prefix("fb_1"))).toBe(true);
  });
});

describe("slugify", () => {
  it("turns titles into URL-safe slugs", () => {
    expect(slugify("Summer Catalog 2026")).toBe("summer-catalog-2026");
    expect(slugify("  Café & Crème — Menu!  ")).toBe("cafe-creme-menu");
    expect(slugify("Lookbook (from template)")).toBe("lookbook-from-template");
  });

  it("falls back when nothing usable is left", () => {
    expect(slugify("¿¿¿")).toBe("flipbook");
  });

  it("leaves room for a uniqueness suffix", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(74);
  });
});

describe("slugProblem", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(slugProblem("summer-catalog")).toBeNull();
    expect(slugProblem("2026")).toBeNull();
  });

  it("rejects malformed and reserved slugs", () => {
    expect(slugProblem("Summer")).toMatch(/lowercase/);
    expect(slugProblem("summer--catalog")).toMatch(/lowercase/);
    expect(slugProblem("-summer")).toMatch(/lowercase/);
    expect(slugProblem("")).toMatch(/lowercase/);
    expect(slugProblem("dashboard")).toMatch(/reserved/);
    expect(slugProblem("a".repeat(81))).toMatch(/under 80/);
  });
});

describe("hasPages", () => {
  it("is false while a PDF is processing or after it failed", () => {
    expect(hasPages({ status: "PUBLISHED", pageCount: 64 })).toBe(true);
    expect(hasPages({ status: "DRAFT", pageCount: 1 })).toBe(true);
    expect(hasPages({ status: "PROCESSING", pageCount: 64 })).toBe(false);
    expect(hasPages({ status: "FAILED", pageCount: 0 })).toBe(false);
    expect(hasPages({ status: "READY", pageCount: 0 })).toBe(false);
  });
});
