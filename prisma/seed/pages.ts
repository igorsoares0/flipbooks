import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/flipbook-rules";
import type { ImageElement, Page, PageElement, ShapeElement, TextElement, TextRun } from "@/lib/types";
import type { DemoFlipbook } from "./flipbooks";

const INK = "#17150F";
const MUTED = "#6E6A5E";
const MUTED_2 = "#8C8676";
const BAR = "rgba(23,21,15,.13)";

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

const IMAGE_TINTS: [string, string][] = [
  ["#D9D3C5", "#BDB5A2"],
  ["#C6CFEA", "#9FB0E0"],
  ["#E2D4CC", "#C9B3A6"],
  ["#CFDCD3", "#A9C2B2"],
];

type Box = Pick<PageElement, "x" | "y" | "width" | "height">;

function base(pageId: string, key: string, name: string, box: Box, zIndex: number) {
  return {
    id: `${pageId}_${key}`,
    pageId,
    name,
    ...box,
    rotation: 0,
    opacity: 1,
    zIndex,
    locked: false,
    visible: true,
  };
}

function text(
  pageId: string,
  key: string,
  name: string,
  box: Box,
  zIndex: number,
  runs: TextRun[],
  style: Partial<TextElement["properties"]>,
): TextElement {
  return {
    ...base(pageId, key, name, box, zIndex),
    type: "TEXT",
    properties: {
      runs,
      fontFamily: "sans",
      fontSize: 14,
      fontWeight: 400,
      color: INK,
      align: "left",
      lineHeight: 1.5,
      letterSpacing: 0,
      ...style,
    },
  };
}

function image(
  pageId: string,
  key: string,
  name: string,
  box: Box,
  zIndex: number,
  placeholder: ImageElement["properties"]["placeholder"],
): ImageElement {
  return {
    ...base(pageId, key, name, box, zIndex),
    type: "IMAGE",
    properties: { assetKey: null, fit: "cover", placeholder },
  };
}

function shape(
  pageId: string,
  key: string,
  name: string,
  box: Box,
  zIndex: number,
  properties: ShapeElement["properties"],
): ShapeElement {
  return { ...base(pageId, key, name, box, zIndex), type: "SHAPE", properties };
}

function coverElements(pageId: string, flipbook: MockSource): PageElement[] {
  const runs = flipbook.cover?.runs ?? [{ text: flipbook.title }];
  const caption = flipbook.cover?.caption ?? flipbook.description;
  return [
    text(pageId, "heading", "Heading", { x: 44, y: 56, width: 432, height: 162 }, 1, runs, {
      fontFamily: "serif",
      fontSize: 52,
      lineHeight: 1.02,
      letterSpacing: -1.5,
    }),
    image(pageId, "cover", "Cover image", { x: 44, y: 250, width: 270, height: 290 }, 2, {
      from: "#D9D3C5",
      to: "#C3BCAA",
      label: "IMAGE PLACEHOLDER",
      labelPosition: "center",
    }),
    shape(pageId, "ellipse", "Ellipse", { x: 356, y: 300, width: 120, height: 120 }, 3, {
      shape: "ellipse",
      fill: flipbook.settings.accentColor,
      radius: 0,
    }),
    text(pageId, "caption", "Caption", { x: 44, y: 605, width: 230, height: 33 }, 4, [{ text: caption }], {
      fontSize: 11,
      color: MUTED,
    }),
    text(pageId, "folio", "Page number", { x: 436, y: 622, width: 40, height: 16 }, 5, [{ text: "01" }], {
      fontFamily: "mono",
      fontSize: 11,
      fontWeight: 500,
      align: "right",
    }),
  ];
}

function chapterElements(pageId: string, pageNumber: number): PageElement[] {
  const chapter = Math.floor(pageNumber / 4);
  const headline = HEADLINES[chapter % HEADLINES.length];
  const bars = [396, 396, 325, 253];
  return [
    text(
      pageId,
      "eyebrow",
      "Eyebrow",
      { x: 62, y: 73, width: 396, height: 18 },
      1,
      [{ text: `CHAPTER ${CHAPTERS[chapter] ?? chapter + 1}` }],
      { fontFamily: "mono", fontSize: 13, fontWeight: 500, color: MUTED_2, letterSpacing: 1.3 },
    ),
    text(pageId, "headline", "Headline", { x: 62, y: 104, width: 396, height: 84 }, 2, [{ text: headline }], {
      fontFamily: "serif",
      fontSize: 38,
      lineHeight: 1.08,
      letterSpacing: -0.6,
    }),
    ...bars.map((width, i) =>
      shape(pageId, `line${i + 1}`, `Text line ${i + 1}`, { x: 62, y: 212 + i * 19, width, height: 8 }, 3 + i, {
        shape: "rect",
        fill: BAR,
        radius: 4,
      }),
    ),
  ];
}

function imageElements(pageId: string, pageNumber: number): PageElement[] {
  const [from, to] = IMAGE_TINTS[(((pageNumber - 1) / 2 - 2) % IMAGE_TINTS.length + IMAGE_TINTS.length) % IMAGE_TINTS.length];
  return [
    image(pageId, "photo", "Photo", { x: 62, y: 73, width: 396, height: 544 }, 1, {
      from,
      to,
      label: "FULL-BLEED IMAGE PLACEHOLDER",
      labelPosition: "bottom-left",
    }),
  ];
}

type MockSource = Pick<DemoFlipbook, "id" | "title" | "description" | "pageCount" | "settings" | "cover">;

/** Deterministic demo pages: a cover, then alternating text and image pages. */
export function buildMockPages(flipbook: MockSource): Page[] {
  return Array.from({ length: flipbook.pageCount }, (_, i) => {
    const pageNumber = i + 1;
    const id = `${flipbook.id}_p${pageNumber}`;
    const isImagePage = pageNumber % 2 === 1;
    const elements =
      pageNumber === 1
        ? coverElements(id, flipbook)
        : isImagePage
          ? imageElements(id, pageNumber)
          : chapterElements(id, pageNumber);
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
