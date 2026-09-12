import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { findTemplate } from "@/lib/templates";
import type { Page } from "@/lib/types";
import { documentSchema } from "@/lib/validation";
import { DEMO_USERS } from "../../../prisma/seed/users";
import * as mutations from "./flipbook-mutations";
import * as repo from "./flipbooks";

// Runs against flipbook_test, reset and seeded by tests/integration-setup.ts.
const MARINA = DEMO_USERS.marina.id;
const THEO = DEMO_USERS.other.id;

afterAll(() => prisma.$disconnect());

const toInput = (pages: Page[]) => documentSchema.parse(pages);

describe("reading flipbooks", () => {
  it("lists only the owner's flipbooks, newest first, with search", async () => {
    const mine = await repo.listFlipbooks(MARINA);
    expect(mine).toHaveLength(12);
    expect(mine.every((fb) => fb.userId === MARINA)).toBe(true);
    const dates = mine.map((fb) => fb.updatedAt);
    expect(dates).toEqual([...dates].sort().reverse());

    const hits = await repo.listFlipbooks(MARINA, { query: "  CATALOG " });
    expect(hits.map((fb) => fb.title).sort()).toEqual(["Summer Catalog 2026", "Winter Catalog 2025"]);
    expect(await repo.listFlipbooks(MARINA, { query: "Handbook" })).toEqual([]); // Theo's book
  });

  it("treats someone else's flipbook as not found", async () => {
    expect((await repo.getOwnedFlipbook(MARINA, "fb_8Kd2"))?.title).toBe("Summer Catalog 2026");
    expect(await repo.getOwnedFlipbook(MARINA, "fb_theo_priv")).toBeNull();
    expect(await repo.getOwnedFlipbook(THEO, "fb_8Kd2")).toBeNull();
  });

  it("lets anyone read published, non-private books", async () => {
    expect(await repo.getReadableFlipbook({ slug: "summer-catalog" })).not.toBeNull();
    expect(await repo.getReadableFlipbook({ id: "fb_theo_pub" }, MARINA)).not.toBeNull();
  });

  it("hides drafts, ready and private books from everyone but their owner", async () => {
    expect(await repo.getReadableFlipbook({ slug: "theo-private-notes" })).toBeNull();
    expect(await repo.getReadableFlipbook({ slug: "theo-private-notes" }, MARINA)).toBeNull();
    expect(await repo.getReadableFlipbook({ slug: "theo-private-notes" }, THEO)).not.toBeNull();
    expect(await repo.getReadableFlipbook({ slug: "lookbook-ss26" })).toBeNull();
    expect(await repo.getReadableFlipbook({ slug: "lookbook-ss26" }, MARINA)).not.toBeNull();
  });

  it("never serves books without pages, even to their owner", async () => {
    expect(await repo.getReadableFlipbook({ slug: "annual-report-2026" }, MARINA)).toBeNull();
    expect(await repo.getReadableFlipbook({ slug: "pricing-v3" }, MARINA)).toBeNull();
  });

  it("returns pages in order with elements in z-order", async () => {
    const pages = await repo.getPages("fb_8Kd2");
    expect(pages.map((p) => p.pageNumber)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(pages[0].elements.map((el) => el.name)).toEqual(["Heading", "Cover image", "Ellipse", "Caption", "Page number"]);
    const eyebrow = pages[3].elements[0];
    expect(eyebrow.type === "TEXT" && eyebrow.properties.runs[0].text).toBe("CHAPTER TWO");

    const spread = await repo.getPages("fb_8Kd2", { pageNumbers: [4, 5] });
    expect(spread.map((p) => p.pageNumber)).toEqual([4, 5]);
  });
});

describe("plans and usage", () => {
  it("resolves the Lifetime Deal and defaults everyone else to free", async () => {
    expect((await repo.getEntitlements(MARINA)).canUseCanvasEditor).toBe(true);
    expect((await repo.getPlan(THEO)).plan).toBe("FREE");
    expect((await repo.getEntitlements(THEO)).canRemoveBranding).toBe(false);
  });

  it("computes usage and dashboard stats from real rows", async () => {
    const usage = await repo.getUsage(MARINA);
    const pdfBytes = await prisma.flipbook.aggregate({ where: { userId: MARINA }, _sum: { fileSize: true } });
    expect(usage.storageBytes).toBe(pdfBytes._sum.fileSize);
    expect(usage.pagesProcessed).toBe(64 + 42 + 12 + 36 + 56 + 24); // readable PDFs

    const stats = await repo.getDashboardStats(MARINA, 204);
    expect(stats.flipbookCount).toBe(12);
    expect(stats.totalViews).toBe(48_190);
    expect(stats.storageLimitBytes).toBe(20e9);
  });
});

describe("writing flipbooks", () => {
  it("creates a private canvas draft from a template with a unique slug", async () => {
    const template = findTemplate("tpl_menu")!;
    const first = await mutations.createFlipbook(MARINA, { template });
    const second = await mutations.createFlipbook(MARINA, { template });
    expect(first).toMatchObject({ type: "CANVAS", status: "DRAFT", visibility: "PRIVATE", pageCount: 8 });
    expect(first.slug).toBe("menu-from-template");
    expect(second.slug).toMatch(/^menu-from-template-[0-9a-f]{6}$/);
    const pages = await repo.getPages(first.id);
    expect(pages).toHaveLength(8);
    expect(pages[0].background.color).toBe(template.tint);
  });

  it("only updates the owner's flipbook", async () => {
    expect(await mutations.updateFlipbook(THEO, "fb_8Kd2", { title: "Hijacked" })).toBe(false);
    expect(await mutations.updateFlipbook(MARINA, "fb_8Kd2", { description: "Fresh copy." })).toBe(true);
    expect((await repo.getOwnedFlipbook(MARINA, "fb_8Kd2"))?.description).toBe("Fresh copy.");
  });

  it("reports taken slugs without changing anything", async () => {
    expect(await mutations.setSlug(MARINA, "fb_3Qx7", "summer-catalog")).toBe("taken");
    expect(await mutations.isSlugTaken("summer-catalog", "fb_8Kd2")).toBe(false);
    expect(await mutations.setSlug(THEO, "fb_3Qx7", "brand-book")).toBe("not-found");
    expect(await mutations.setSlug(MARINA, "fb_3Qx7", "brand-book")).toBe("ok");
    expect(await repo.getReadableFlipbook({ slug: "brand-book" })).not.toBeNull();
  });

  it("publishes books with pages only", async () => {
    expect(await mutations.publishFlipbook(MARINA, "fb_9Rw4")).toBe(true);
    expect((await repo.getReadableFlipbook({ slug: "lookbook-ss26" }))?.status).toBe("PUBLISHED");
    expect(await mutations.publishFlipbook(MARINA, "fb_5Tn1")).toBe(false); // still processing
    expect(await mutations.publishFlipbook(THEO, "fb_2Hc6")).toBe(false);
  });

  it("duplicates pages and elements under new ids", async () => {
    const copy = await mutations.duplicateFlipbook(MARINA, "fb_2Hc6");
    expect(copy).toMatchObject({ title: "Investor Deck (copy)", status: "DRAFT", visibility: "PRIVATE", pageCount: 16 });
    const [original, duplicated] = await Promise.all([repo.getPages("fb_2Hc6"), repo.getPages(copy!.id)]);
    expect(duplicated).toHaveLength(original.length);
    expect(duplicated[0].id).not.toBe(original[0].id);
    expect(duplicated[0].elements.map((el) => el.name)).toEqual(original[0].elements.map((el) => el.name));
    expect(await mutations.duplicateFlipbook(THEO, "fb_2Hc6")).toBeNull();
  });

  it("deletes only the owner's flipbook, with its pages", async () => {
    const draft = await mutations.createFlipbook(MARINA);
    expect(await mutations.deleteFlipbook(THEO, draft.id)).toBe(false);
    expect(await mutations.deleteFlipbook(MARINA, draft.id)).toBe(true);
    expect(await prisma.page.count({ where: { flipbookId: draft.id } })).toBe(0);
  });
});

describe("autosave", () => {
  it("round-trips edits, keeps page ids and renumbers", async () => {
    const draft = await mutations.createFlipbook(MARINA, { template: findTemplate("tpl_brochure")! });
    const pages = await repo.getPages(draft.id);
    const [first, second, ...rest] = pages;
    const heading = {
      id: "el_saved_heading",
      pageId: first.id,
      name: "Heading",
      x: 44,
      y: 60,
      width: 432,
      height: 46,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      locked: false,
      visible: true,
      type: "TEXT" as const,
      properties: {
        runs: [{ text: "Hello" }, { text: "world", italic: true }],
        fontFamily: "serif" as const,
        fontSize: 40,
        fontWeight: 400,
        color: "#17150F",
        align: "left" as const,
        lineHeight: 1.05,
        letterSpacing: -0.8,
      },
    };
    // Swap the first two pages, drop the last one, add a heading.
    const edited = [{ ...second }, { ...first, elements: [heading] }, ...rest.slice(0, -1)];
    expect(await mutations.saveDocument(MARINA, draft.id, toInput(edited))).toBe(true);

    const saved = await repo.getPages(draft.id);
    expect(saved.map((p) => p.id)).toEqual(edited.map((p) => p.id));
    expect(saved.map((p) => p.pageNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(saved[1].elements).toEqual([heading]);
    expect((await repo.getOwnedFlipbook(MARINA, draft.id))?.pageCount).toBe(5);
  });

  it("refuses other people's documents and foreign page ids", async () => {
    const pages = await repo.getPages("fb_2Hc6");
    expect(await mutations.saveDocument(THEO, "fb_2Hc6", toInput(pages))).toBe(false);

    // Marina tries to smuggle Theo's page into her own book: the transaction fails, nothing moves.
    const theirs = await repo.getPages("fb_theo_pub", { pageNumbers: [1] });
    const mine = await mutations.createFlipbook(MARINA);
    await expect(mutations.saveDocument(MARINA, mine.id, toInput(theirs))).rejects.toThrow();
    expect(await prisma.page.count({ where: { id: theirs[0].id, flipbookId: "fb_theo_pub" } })).toBe(1);
    expect(await prisma.page.count({ where: { flipbookId: mine.id } })).toBe(1);
  });
});
