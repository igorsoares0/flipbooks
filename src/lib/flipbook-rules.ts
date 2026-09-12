import type { Flipbook, FlipbookSettings } from "@/lib/types";

// Rules shared by the server (actions, queries) and the client (forms).

/** Every new page uses the canvas editor's artboard size (roughly 3:4). */
export const PAGE_WIDTH = 520;
export const PAGE_HEIGHT = 690;

export const DEFAULT_SETTINGS: FlipbookSettings = {
  backgroundColor: "#17150F",
  accentColor: "#1B45D6",
  showBranding: true,
  showLogo: true,
  showShare: true,
  showDownload: false,
  showFullscreen: true,
  showThumbnails: true,
};

export const DESCRIPTION_MAX = 160;
export const TITLE_MAX = 120;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 80;
const RESERVED_SLUGS = new Set(["admin", "api", "app", "dashboard", "embed", "f", "login", "new", "register", "settings", "untitled"]);

export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens.";
  if (slug.length > SLUG_MAX) return `Keep it under ${SLUG_MAX} characters.`;
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved.";
  return null;
}

export function slugify(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX - 6)
    .replace(/-+$/, "");
  return slug || "flipbook";
}

/** Processing and failed books have no pages yet, so they can't be opened or edited. */
export function hasPages(flipbook: Pick<Flipbook, "status" | "pageCount">) {
  return ["DRAFT", "READY", "PUBLISHED"].includes(flipbook.status) && flipbook.pageCount > 0;
}
