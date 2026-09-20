import type { Flipbook } from "@/lib/types";

// What the share-preview card shows. Pure, so the wording and the "is there a cover?"
// decision are unit-tested without rendering an image.

export const OG_SIZE = { width: 1200, height: 630 };

export type OgCard = {
  title: string;
  subtitle: string;
  meta: string;
  accent: string;
  /** Storage key of the rendered cover, when the book has one. */
  coverKey: string | null;
};

const INK = "#17150F";

/** The generic card, for the site itself and for anything a reader may not see. */
export function siteCard(host: string): OgCard {
  return {
    title: "Create stunning flipbooks",
    subtitle: "Upload a PDF or design from scratch. Publish a link, embed it anywhere, and measure every page.",
    meta: host,
    accent: "#1B45D6",
    coverKey: null,
  };
}

export function flipbookCard(flipbook: Flipbook, host: string, thumbnailKey: string | null): OgCard {
  const pages = `${flipbook.pageCount} page${flipbook.pageCount === 1 ? "" : "s"}`;
  return {
    title: flipbook.title,
    subtitle: flipbook.description.trim() || "Read it online, on any device.",
    meta: `${host}/f/${flipbook.slug} · ${pages}`,
    accent: /^#[0-9a-fA-F]{6}$/.test(flipbook.settings.accentColor) ? flipbook.settings.accentColor : INK,
    coverKey: thumbnailKey,
  };
}

/** Long titles and descriptions get cut, so the card never overflows. */
export function fit(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
