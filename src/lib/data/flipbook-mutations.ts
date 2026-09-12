import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, PAGE_HEIGHT, PAGE_WIDTH, slugify } from "@/lib/flipbook-rules";
import type { Template } from "@/lib/types";
import type { DocumentInput, FlipbookPatch } from "@/lib/validation";
import { toFlipbook } from "./mappers";

// Write side. Callers (server actions) authenticate and validate first; every
// function here still scopes by owner so a wrong id can never touch another account.

const COVER_TINTS: [string, string][] = [
  ["#E8DFC9", "#D2C4A4"],
  ["#DCE3FA", "#BCC8F2"],
  ["#F2DFD9", "#E0C3B8"],
  ["#E2EDE6", "#C7DCD0"],
  ["#F1EDF4", "#D8CEE0"],
];

const suffix = () => randomBytes(3).toString("hex");

export async function isSlugTaken(slug: string, exceptFlipbookId?: string) {
  const row = await prisma.flipbook.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(row && row.id !== exceptFlipbookId);
}

async function uniqueSlug(title: string) {
  const base = slugify(title);
  if (!(await isSlugTaken(base))) return base;
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${suffix()}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  throw new Error("Could not find a free slug");
}

export async function createFlipbook(userId: string, { template }: { template?: Template } = {}) {
  const title = template ? `${template.name} (from template)` : "Untitled flipbook";
  const pageCount = template?.pageCount ?? 1;
  const tint = COVER_TINTS[Math.floor(Math.random() * COVER_TINTS.length)];

  const flipbook = await prisma.flipbook.create({
    data: {
      userId,
      title,
      slug: await uniqueSlug(title),
      type: "CANVAS",
      status: "DRAFT",
      visibility: "PRIVATE",
      settings: { ...DEFAULT_SETTINGS },
      thumbnailTint: tint,
      pageCount,
      pages: {
        create: Array.from({ length: pageCount }, (_, i) => ({
          pageNumber: i + 1,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          background: { color: template?.tint ?? "#FFFFFF" },
        })),
      },
    },
  });
  return toFlipbook(flipbook);
}

/** Returns false when the flipbook doesn't exist or isn't the caller's. */
export async function updateFlipbook(userId: string, id: string, patch: FlipbookPatch) {
  const { count } = await prisma.flipbook.updateMany({ where: { id, userId }, data: patch });
  return count === 1;
}

export async function setSlug(userId: string, id: string, slug: string): Promise<"ok" | "taken" | "not-found"> {
  try {
    const { count } = await prisma.flipbook.updateMany({ where: { id, userId }, data: { slug } });
    return count === 1 ? "ok" : "not-found";
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "taken";
    throw error;
  }
}

export async function publishFlipbook(userId: string, id: string) {
  const { count } = await prisma.flipbook.updateMany({
    where: { id, userId, pageCount: { gt: 0 }, status: { in: ["DRAFT", "READY", "PUBLISHED"] } },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  return count === 1;
}

export async function deleteFlipbook(userId: string, id: string) {
  const { count } = await prisma.flipbook.deleteMany({ where: { id, userId } });
  return count === 1;
}

export async function duplicateFlipbook(userId: string, id: string) {
  const source = await prisma.flipbook.findFirst({
    where: { id, userId },
    include: { pages: { include: { elements: true }, orderBy: { pageNumber: "asc" } } },
  });
  if (!source) return null;

  const title = `${source.title} (copy)`;
  const copy = await prisma.flipbook.create({
    data: {
      userId,
      title,
      slug: await uniqueSlug(title),
      type: source.type,
      status: source.pageCount > 0 ? "DRAFT" : source.status,
      visibility: "PRIVATE",
      description: source.description,
      settings: source.settings as Prisma.InputJsonValue,
      thumbnailKey: source.thumbnailKey,
      thumbnailTint: source.thumbnailTint,
      originalPdfKey: source.originalPdfKey,
      fileSize: source.fileSize,
      pageCount: source.pageCount,
      pages: {
        create: source.pages.map((page) => ({
          pageNumber: page.pageNumber,
          width: page.width,
          height: page.height,
          background: page.background as Prisma.InputJsonValue,
          backgroundImageKey: page.backgroundImageKey,
          elements: {
            create: page.elements.map(({ id: _id, pageId: _pageId, createdAt: _c, updatedAt: _u, properties, ...el }) => ({
              ...el,
              properties: properties as Prisma.InputJsonValue,
            })),
          },
        })),
      },
    },
  });
  return toFlipbook(copy);
}

/**
 * Autosave. In one transaction: pages keep their ids (analytics events point at them),
 * removed pages are deleted, new ones created, and every element is rewritten with the
 * client's ids so the editor's selection survives a save. A per-element diff is a later
 * optimization.
 */
export async function saveDocument(userId: string, id: string, pages: DocumentInput) {
  const owned = await prisma.flipbook.findFirst({
    where: { id, userId },
    select: { pages: { select: { id: true } } },
  });
  if (!owned) return false;

  const existing = new Set(owned.pages.map((p) => p.id));
  const incoming = pages.map((page, i) => ({ ...page, pageNumber: i + 1 }));

  await prisma.$transaction(async (tx) => {
    await tx.element.deleteMany({ where: { page: { flipbookId: id } } });
    await tx.page.deleteMany({ where: { flipbookId: id, id: { notIn: incoming.map((p) => p.id) } } });

    for (const page of incoming) {
      const data = {
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        background: page.background,
        backgroundImageKey: page.backgroundImageKey,
      };
      // Only pages already in this flipbook are updated; a foreign id fails the create
      // on its primary key instead of being moved over from another account.
      if (existing.has(page.id)) await tx.page.update({ where: { id: page.id }, data });
      else await tx.page.create({ data: { ...data, id: page.id, flipbookId: id } });
    }

    const elements = incoming.flatMap((page) =>
      page.elements.map((el) => ({ ...el, pageId: page.id, properties: el.properties as Prisma.InputJsonValue })),
    );
    if (elements.length > 0) await tx.element.createMany({ data: elements });
    await tx.flipbook.update({ where: { id }, data: { pageCount: incoming.length } });
  });
  return true;
}
