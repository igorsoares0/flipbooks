import type {
  Element as ElementRow,
  Flipbook as FlipbookRow,
  Page as PageRow,
} from "@/generated/prisma/client";
import { DEFAULT_SETTINGS } from "@/lib/flipbook-rules";
import type { Flipbook, FlipbookSettings, Page, PageElement } from "@/lib/types";

// Database rows → the domain types the UI already uses (src/lib/types.ts).

export function toFlipbook(row: FlipbookRow): Flipbook {
  const [from = "#EFEBE2", to = "#DDD7C9"] = row.thumbnailTint;
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    slug: row.slug,
    type: row.type,
    status: row.status,
    visibility: row.visibility,
    description: row.description,
    settings: { ...DEFAULT_SETTINGS, ...(row.settings as unknown as Partial<FlipbookSettings>) },
    pageCount: row.pageCount,
    fileSize: row.fileSize,
    error: row.error,
    thumbnailTint: [from, to],
    // Signed separately (src/lib/data/urls.ts): mappers stay synchronous and storage-free.
    thumbnailUrl: null,
    // Views only mean something once a book can be read.
    views: row.status === "PUBLISHED" || row.status === "READY" ? row.viewCount : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export function toElement(row: ElementRow): PageElement {
  return {
    id: row.id,
    pageId: row.pageId,
    name: row.name,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    opacity: row.opacity,
    zIndex: row.zIndex,
    locked: row.locked,
    visible: row.visible,
    type: row.type,
    // Written only through the validated document schema (src/lib/validation.ts).
    properties: row.properties,
  } as PageElement;
}

export function toPage(row: PageRow & { elements: ElementRow[] }): Page {
  return {
    id: row.id,
    flipbookId: row.flipbookId,
    pageNumber: row.pageNumber,
    width: row.width,
    height: row.height,
    background: row.background as unknown as Page["background"],
    backgroundImageKey: row.backgroundImageKey,
    elements: row.elements.map(toElement),
  };
}
