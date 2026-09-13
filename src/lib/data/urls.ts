import "server-only";

import type { Flipbook as FlipbookRow } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { presignGet } from "@/lib/storage";
import type { Flipbook, Page, PageElement } from "@/lib/types";

// Files stay private in the bucket; readers get short-lived signed URLs, created per
// request after the access check has already happened. (A public CDN domain for
// published books can replace this later without touching the UI.)

const URL_TTL_SECONDS = 60 * 60;

/** Signs rendered PDF pages and placed pictures. Pictures whose file was deleted stay unsigned. */
export async function withPageImageUrls(pages: Page[]): Promise<Page[]> {
  const assetKeys = [
    ...new Set(pages.flatMap((page) => page.elements.flatMap((el) => (el.type === "IMAGE" && el.properties.assetKey ? [el.properties.assetKey] : [])))),
  ];
  // Only keys that are still in someone's library get a URL; the rest render "Image missing".
  const existing = assetKeys.length
    ? new Set((await prisma.asset.findMany({ where: { key: { in: assetKeys } }, select: { key: true } })).map((a) => a.key))
    : new Set<string>();
  const signed = new Map(
    await Promise.all([...existing].map(async (key) => [key, await presignGet(key, { expiresIn: URL_TTL_SECONDS })] as const)),
  );

  const signElement = (el: PageElement): PageElement =>
    el.type === "IMAGE" && el.properties.assetKey && signed.has(el.properties.assetKey)
      ? { ...el, properties: { ...el.properties, imageUrl: signed.get(el.properties.assetKey) } }
      : el;

  return Promise.all(
    pages.map(async (page) => ({
      ...page,
      elements: signed.size ? page.elements.map(signElement) : page.elements,
      ...(page.backgroundImageKey
        ? { backgroundImageUrl: await presignGet(page.backgroundImageKey, { expiresIn: URL_TTL_SECONDS }) }
        : {}),
    })),
  );
}

export async function withThumbnailUrl(flipbook: Flipbook, row: Pick<FlipbookRow, "thumbnailKey">): Promise<Flipbook> {
  if (!row.thumbnailKey) return flipbook;
  return { ...flipbook, thumbnailUrl: await presignGet(row.thumbnailKey, { expiresIn: URL_TTL_SECONDS }) };
}
