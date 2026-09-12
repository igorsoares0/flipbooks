// Data access layer. Pages and layouts only call these functions; phase 2 swaps
// the mock bodies for Prisma queries (with auth + ownership checks) without touching the UI.
import "server-only";

import { mockFlipbooks } from "@/lib/mock/flipbooks";
import { buildMockPages, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/mock/pages";
import { mockAnalytics, mockBilling, mockDashboard, mockTemplates, mockUser } from "@/lib/mock/workspace";
import type { AnalyticsRange, AnalyticsSummary, Billing, DashboardStats, Flipbook, Page, Template, User } from "@/lib/types";

/** Strips mock-only fields (the generated cover copy). */
function toFlipbook(mock: (typeof mockFlipbooks)[number]): Flipbook {
  const flipbook = { ...mock };
  delete flipbook.cover;
  return flipbook;
}

export async function getCurrentUser(): Promise<User> {
  return mockUser;
}

export async function getFlipbooks(query?: string): Promise<Flipbook[]> {
  const q = query?.trim().toLowerCase();
  return mockFlipbooks.filter((fb) => !q || fb.title.toLowerCase().includes(q)).map(toFlipbook);
}

export async function getRecentFlipbooks(limit = 6): Promise<Flipbook[]> {
  return (await getFlipbooks()).slice(0, limit);
}

export async function getFlipbook(id: string): Promise<Flipbook | null> {
  const match = mockFlipbooks.find((fb) => fb.id === id);
  return match ? toFlipbook(match) : null;
}

/**
 * Flipbook as a reader may see it. Phase 1 has no sessions, so owner previews of
 * drafts are allowed here; the auth phase restricts non-published books to their owner.
 */
export async function getViewableFlipbook(by: { slug: string } | { id: string }): Promise<Flipbook | null> {
  const match = mockFlipbooks.find((fb) => ("slug" in by ? fb.slug === by.slug : fb.id === by.id));
  if (!match || !isViewable(match)) return null;
  return toFlipbook(match);
}

export function isViewable(flipbook: Pick<Flipbook, "status" | "pageCount">) {
  return ["DRAFT", "READY", "PUBLISHED"].includes(flipbook.status) && flipbook.pageCount > 0;
}

const pageCache = new Map<string, Page[]>();

export async function getFlipbookPages(flipbookId: string): Promise<Page[]> {
  const match = mockFlipbooks.find((fb) => fb.id === flipbookId);
  if (!match || !isViewable(match)) return [];
  if (!pageCache.has(flipbookId)) pageCache.set(flipbookId, buildMockPages(match));
  return pageCache.get(flipbookId)!;
}

/** Id used by "Open editor" and template cards until creation is persisted in phase 2. */
export const DRAFT_FLIPBOOK_ID = "draft";

/**
 * Document for the canvas editor. `draft` is an unsaved blank canvas, optionally
 * seeded from a template; phase 2 replaces it with "create the flipbook, then redirect".
 */
export async function getEditorDocument(
  id: string,
  templateId?: string,
): Promise<{ flipbook: Flipbook; pages: Page[] } | null> {
  if (id !== DRAFT_FLIPBOOK_ID) {
    const flipbook = await getFlipbook(id);
    if (!flipbook || !isViewable(flipbook)) return null;
    return { flipbook, pages: await getFlipbookPages(id) };
  }

  const template = mockTemplates.find((t) => t.id === templateId);
  const flipbook: Flipbook = {
    ...toFlipbook(mockFlipbooks[0]),
    id: DRAFT_FLIPBOOK_ID,
    title: template ? `${template.name} (from template)` : "Untitled flipbook",
    slug: "untitled",
    type: "CANVAS",
    status: "DRAFT",
    visibility: "PRIVATE",
    description: "",
    pageCount: template?.pageCount ?? 1,
    fileSize: null,
    views: null,
    publishedAt: null,
  };
  const pages = Array.from({ length: flipbook.pageCount }, (_, i) => ({
    id: `${DRAFT_FLIPBOOK_ID}_p${i + 1}`,
    flipbookId: DRAFT_FLIPBOOK_ID,
    pageNumber: i + 1,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    background: { color: template?.tint ?? "#FFFFFF" },
    backgroundImageKey: null,
    elements: [],
  }));
  return { flipbook, pages };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const flipbooks = await getFlipbooks();
  return {
    flipbookCount: flipbooks.length,
    publishedThisMonth: mockDashboard.publishedThisMonth,
    totalViews: flipbooks.reduce((sum, fb) => sum + (fb.views ?? 0), 0),
    viewsDelta: mockDashboard.viewsDelta,
    avgReadSeconds: mockDashboard.avgReadSeconds,
    storageBytes: mockBilling.usage.storageBytes,
    storageLimitBytes: mockBilling.entitlements.maxStorageBytes,
  };
}

/** The flipbook the sidebar "Analytics" item opens: the most viewed one. */
export async function getTopFlipbook(): Promise<Flipbook | null> {
  const flipbooks = await getFlipbooks();
  return flipbooks.reduce<Flipbook | null>((top, fb) => ((fb.views ?? 0) > (top?.views ?? -1) ? fb : top), null);
}

export async function getAnalytics(flipbookId: string, range: AnalyticsRange): Promise<AnalyticsSummary | null> {
  const flipbook = await getFlipbook(flipbookId);
  if (!flipbook || flipbook.status !== "PUBLISHED") return null;
  return mockAnalytics(range);
}

export async function getBilling(): Promise<Billing> {
  return mockBilling;
}

export async function getTemplates(): Promise<Template[]> {
  return mockTemplates;
}
