import { describe, expect, it } from "vitest";
import { hasPages, slugify, slugProblem } from "./flipbook-rules";

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
