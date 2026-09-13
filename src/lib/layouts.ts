import type { ImageElement, PageElement, ShapeElement, TextElement, TextRun } from "@/lib/types";

// Page layouts made of ordinary editor elements (page units, 520 × 690), shared by the
// demo seed and the templates. Element ids are `${pageId}_${key}`, so they stay stable.

export const INK = "#17150F";
export const MUTED = "#6E6A5E";
export const MUTED_2 = "#8C8676";
const BAR = "rgba(23,21,15,.13)";

export type Tint = [string, string];

type Box = Pick<PageElement, "x" | "y" | "width" | "height">;

function base(pageId: string, key: string, name: string, box: Box, zIndex: number) {
  return { id: `${pageId}_${key}`, pageId, name, ...box, rotation: 0, opacity: 1, zIndex, locked: false, visible: true };
}

export function text(
  pageId: string,
  key: string,
  name: string,
  box: Box,
  zIndex: number,
  runs: TextRun[],
  style: Partial<TextElement["properties"]> = {},
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

export function image(
  pageId: string,
  key: string,
  name: string,
  box: Box,
  zIndex: number,
  placeholder: ImageElement["properties"]["placeholder"],
): ImageElement {
  return { ...base(pageId, key, name, box, zIndex), type: "IMAGE", properties: { assetKey: null, fit: "cover", placeholder } };
}

export function shape(pageId: string, key: string, name: string, box: Box, zIndex: number, properties: ShapeElement["properties"]): ShapeElement {
  return { ...base(pageId, key, name, box, zIndex), type: "SHAPE", properties };
}

const bars = (pageId: string, y: number, widths: number[], zStart: number, x = 62) =>
  widths.map((width, i) =>
    shape(pageId, `line${i + 1}`, `Text line ${i + 1}`, { x, y: y + i * 19, width, height: 8 }, zStart + i, {
      shape: "rect",
      fill: BAR,
      radius: 4,
    }),
  );

/** Title page: big serif heading, a picture, an accent disc, a caption and the folio. */
export function coverLayout(
  pageId: string,
  { runs, caption, accent, tint = ["#D9D3C5", "#C3BCAA"] }: { runs: TextRun[]; caption: string; accent: string; tint?: Tint },
): PageElement[] {
  return [
    text(pageId, "heading", "Heading", { x: 44, y: 56, width: 432, height: 162 }, 1, runs, {
      fontFamily: "serif",
      fontSize: 52,
      lineHeight: 1.02,
      letterSpacing: -1.5,
    }),
    image(pageId, "cover", "Cover image", { x: 44, y: 250, width: 270, height: 290 }, 2, {
      from: tint[0],
      to: tint[1],
      label: "IMAGE PLACEHOLDER",
      labelPosition: "center",
    }),
    shape(pageId, "ellipse", "Ellipse", { x: 356, y: 300, width: 120, height: 120 }, 3, { shape: "ellipse", fill: accent, radius: 0 }),
    text(pageId, "caption", "Caption", { x: 44, y: 605, width: 230, height: 33 }, 4, [{ text: caption }], { fontSize: 11, color: MUTED }),
    text(pageId, "folio", "Page number", { x: 436, y: 622, width: 40, height: 16 }, 5, [{ text: "01" }], {
      fontFamily: "mono",
      fontSize: 11,
      fontWeight: 500,
      align: "right",
    }),
  ];
}

/** Text page: mono eyebrow, serif headline and body-text bars. */
export function chapterLayout(pageId: string, { eyebrow, headline }: { eyebrow: string; headline: string }): PageElement[] {
  return [
    text(pageId, "eyebrow", "Eyebrow", { x: 62, y: 73, width: 396, height: 18 }, 1, [{ text: eyebrow }], {
      fontFamily: "mono",
      fontSize: 13,
      fontWeight: 500,
      color: MUTED_2,
      letterSpacing: 1.3,
    }),
    text(pageId, "headline", "Headline", { x: 62, y: 104, width: 396, height: 84 }, 2, [{ text: headline }], {
      fontFamily: "serif",
      fontSize: 38,
      lineHeight: 1.08,
      letterSpacing: -0.6,
    }),
    ...bars(pageId, 212, [396, 396, 325, 253], 3),
  ];
}

/** Full-bleed picture page. */
export function photoLayout(pageId: string, { tint, label = "FULL-BLEED IMAGE PLACEHOLDER" }: { tint: Tint; label?: string }): PageElement[] {
  return [
    image(pageId, "photo", "Photo", { x: 62, y: 73, width: 396, height: 544 }, 1, {
      from: tint[0],
      to: tint[1],
      label,
      labelPosition: "bottom-left",
    }),
  ];
}

/** Four products in a 2 × 2 grid, each with a name and a price. */
export function gridLayout(pageId: string, { title, items, tint }: { title: string; items: [string, string][]; tint: Tint }): PageElement[] {
  const cells = [
    [44, 110],
    [270, 110],
    [44, 390],
    [270, 390],
  ];
  return [
    text(pageId, "title", "Title", { x: 44, y: 48, width: 432, height: 40 }, 1, [{ text: title }], {
      fontFamily: "serif",
      fontSize: 32,
      lineHeight: 1.1,
      letterSpacing: -0.6,
    }),
    ...items.slice(0, 4).flatMap(([name, price], i) => {
      const [x, y] = cells[i];
      return [
        image(pageId, `product${i + 1}`, `Product ${i + 1}`, { x, y, width: 206, height: 206 }, 2 + i * 3, {
          from: tint[0],
          to: tint[1],
          label: "PRODUCT",
          labelPosition: "center",
        }),
        text(pageId, `name${i + 1}`, `Product name ${i + 1}`, { x, y: y + 216, width: 150, height: 21 }, 3 + i * 3, [{ text: name }], {
          fontWeight: 600,
        }),
        text(pageId, `price${i + 1}`, `Price ${i + 1}`, { x: x + 146, y: y + 216, width: 60, height: 21 }, 4 + i * 3, [{ text: price }], {
          fontFamily: "mono",
          fontSize: 13,
          fontWeight: 500,
          align: "right",
          color: MUTED,
        }),
      ];
    }),
  ];
}

/** One big sans statement with an accent rule. */
export function statementLayout(pageId: string, { statement, accent }: { statement: string; accent: string }): PageElement[] {
  return [
    shape(pageId, "rule", "Accent rule", { x: 44, y: 120, width: 64, height: 8 }, 1, { shape: "rect", fill: accent, radius: 4 }),
    text(pageId, "statement", "Statement", { x: 44, y: 156, width: 432, height: 300 }, 2, [{ text: statement }], {
      fontSize: 54,
      fontWeight: 700,
      lineHeight: 1.02,
      letterSpacing: -1.6,
    }),
    ...bars(pageId, 560, [300, 240], 3, 44),
  ];
}

/** Three key numbers, each with a label, above a paragraph. */
export function statsLayout(
  pageId: string,
  { title, stats, accent }: { title: string; stats: [string, string][]; accent: string },
): PageElement[] {
  return [
    text(pageId, "title", "Title", { x: 44, y: 60, width: 432, height: 44 }, 1, [{ text: title }], {
      fontFamily: "serif",
      fontSize: 36,
      lineHeight: 1.1,
      letterSpacing: -0.6,
    }),
    ...stats.slice(0, 3).flatMap(([value, label], i) => [
      text(pageId, `value${i + 1}`, `Figure ${i + 1}`, { x: 44, y: 160 + i * 130, width: 432, height: 64 }, 2 + i * 2, [{ text: value }], {
        fontFamily: "serif",
        fontSize: 60,
        lineHeight: 1,
        letterSpacing: -1.5,
        color: accent,
      }),
      text(pageId, `label${i + 1}`, `Figure label ${i + 1}`, { x: 44, y: 228 + i * 130, width: 432, height: 21 }, 3 + i * 2, [{ text: label }], {
        color: MUTED,
      }),
    ]),
  ];
}

/** A menu or price list: title, then dish and price rows. */
export function listLayout(pageId: string, { title, items }: { title: string; items: [string, string][] }): PageElement[] {
  return [
    text(pageId, "title", "Title", { x: 44, y: 60, width: 432, height: 48 }, 1, [{ text: title }], {
      fontFamily: "serif",
      fontSize: 40,
      lineHeight: 1.05,
      letterSpacing: -0.8,
      align: "center",
    }),
    ...items.slice(0, 8).flatMap(([name, price], i) => [
      text(pageId, `item${i + 1}`, `Item ${i + 1}`, { x: 64, y: 160 + i * 58, width: 300, height: 24 }, 2 + i * 2, [{ text: name }], {
        fontSize: 16,
        fontWeight: 500,
      }),
      text(pageId, `itemprice${i + 1}`, `Item price ${i + 1}`, { x: 376, y: 160 + i * 58, width: 80, height: 24 }, 3 + i * 2, [{ text: price }], {
        fontFamily: "mono",
        fontSize: 14,
        fontWeight: 500,
        align: "right",
        color: MUTED,
      }),
    ]),
  ];
}
