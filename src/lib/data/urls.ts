import "server-only";

import type { Flipbook as FlipbookRow } from "@/generated/prisma/client";
import { presignGet } from "@/lib/storage";
import type { Flipbook, Page } from "@/lib/types";

// Files stay private in the bucket; readers get short-lived signed URLs, created per
// request after the access check has already happened. (A public CDN domain for
// published books can replace this later without touching the UI.)

const URL_TTL_SECONDS = 60 * 60;

export async function withPageImageUrls(pages: Page[]): Promise<Page[]> {
  return Promise.all(
    pages.map(async (page) =>
      page.backgroundImageKey
        ? { ...page, backgroundImageUrl: await presignGet(page.backgroundImageKey, { expiresIn: URL_TTL_SECONDS }) }
        : page,
    ),
  );
}

export async function withThumbnailUrl(flipbook: Flipbook, row: Pick<FlipbookRow, "thumbnailKey">): Promise<Flipbook> {
  if (!row.thumbnailKey) return flipbook;
  return { ...flipbook, thumbnailUrl: await presignGet(row.thumbnailKey, { expiresIn: URL_TTL_SECONDS }) };
}
