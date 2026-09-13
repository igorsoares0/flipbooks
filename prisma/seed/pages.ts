import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/flipbook-rules";
import { chapterLayout, coverLayout, photoLayout, type Tint } from "@/lib/layouts";
import type { Page } from "@/lib/types";
import type { DemoFlipbook } from "./flipbooks";

// Demo pages for the seeded flipbooks: a cover, then alternating text and photo pages.

const HEADLINES = [
  "Morning light\non the terrace",
  "Light, linen\nand long evenings",
  "Salt, stone\nand slow lunches",
  "Colour for\nthe coast",
  "Weekend\nessentials",
  "Made to\nbe worn",
];

const CHAPTERS = [
  "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN",
];

const IMAGE_TINTS: Tint[] = [
  ["#D9D3C5", "#BDB5A2"],
  ["#C6CFEA", "#9FB0E0"],
  ["#E2D4CC", "#C9B3A6"],
  ["#CFDCD3", "#A9C2B2"],
];

type MockSource = Pick<DemoFlipbook, "id" | "title" | "description" | "pageCount" | "settings" | "cover">;

/** Deterministic demo pages: a cover, then alternating text and image pages. */
export function buildMockPages(flipbook: MockSource): Page[] {
  return Array.from({ length: flipbook.pageCount }, (_, i) => {
    const pageNumber = i + 1;
    const id = `${flipbook.id}_p${pageNumber}`;
    const isImagePage = pageNumber % 2 === 1;
    const chapter = Math.floor(pageNumber / 4);
    const tint = IMAGE_TINTS[(((pageNumber - 1) / 2 - 2) % IMAGE_TINTS.length + IMAGE_TINTS.length) % IMAGE_TINTS.length];
    const elements =
      pageNumber === 1
        ? coverLayout(id, {
            runs: flipbook.cover?.runs ?? [{ text: flipbook.title }],
            caption: flipbook.cover?.caption ?? flipbook.description,
            accent: flipbook.settings.accentColor,
          })
        : isImagePage
          ? photoLayout(id, { tint })
          : chapterLayout(id, {
              eyebrow: `CHAPTER ${CHAPTERS[chapter] ?? chapter + 1}`,
              headline: HEADLINES[chapter % HEADLINES.length],
            });
    return {
      id,
      flipbookId: flipbook.id,
      pageNumber,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      background: { color: pageNumber === 1 ? "#FFFFFF" : isImagePage ? "#EDE9E0" : "#F6F4EF" },
      backgroundImageKey: null,
      elements,
    };
  });
}
