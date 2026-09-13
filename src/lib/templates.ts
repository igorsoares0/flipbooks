import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/flipbook-rules";
import {
  chapterLayout,
  coverLayout,
  gridLayout,
  listLayout,
  photoLayout,
  statementLayout,
  statsLayout,
  type Tint,
} from "@/lib/layouts";
import type { Page, PageElement, Template, TextRun } from "@/lib/types";

// Template catalog. Picking one creates an editable copy (spec §17): a cover plus
// interior layouts in the template's colours, repeated up to its page count.

type Layout = (pageId: string, pageNumber: number) => PageElement[];

type TemplateDesign = Template & {
  accent: string;
  photo: Tint;
  cover: { runs: TextRun[]; caption: string };
  /** Interior layouts, cycled after the cover. */
  interior: Layout[];
};

const chapter = (headlines: string[]): Layout => (pageId, n) =>
  chapterLayout(pageId, { eyebrow: `SECTION ${String(Math.ceil(n / 2)).padStart(2, "0")}`, headline: headlines[(n - 2) % headlines.length] });

const photo = (tint: Tint): Layout => (pageId) => photoLayout(pageId, { tint });

const DESIGNS: TemplateDesign[] = [
  {
    id: "tpl_editorial",
    name: "Editorial",
    category: "Magazines",
    pageCount: 24,
    tint: "#F4EFE6",
    accent: "#C0392B",
    photo: ["#E2D4CC", "#C9B3A6"],
    cover: { runs: [{ text: "The\n" }, { text: "Editorial", italic: true }], caption: "Stories, people and places, told slowly." },
    interior: [chapter(["The long\ninterview", "Notes from\nthe road", "A quiet\nrevolution"]), photo(["#E2D4CC", "#C9B3A6"])],
  },
  {
    id: "tpl_product_grid",
    name: "Product Grid",
    category: "Catalogs",
    pageCount: 16,
    tint: "#EDF1FB",
    accent: "#1B45D6",
    photo: ["#C6CFEA", "#9FB0E0"],
    cover: { runs: [{ text: "Product\n" }, { text: "Catalog", italic: true }], caption: "The full range, with prices, in one place." },
    interior: [
      (pageId) =>
        gridLayout(pageId, {
          title: "New arrivals",
          items: [["Linen shirt", "$68"], ["Canvas tote", "$34"], ["Straw hat", "$42"], ["Leather sandal", "$96"]],
          tint: ["#C6CFEA", "#9FB0E0"],
        }),
      photo(["#C6CFEA", "#9FB0E0"]),
    ],
  },
  {
    id: "tpl_minimal_zine",
    name: "Minimal Zine",
    category: "Magazines",
    pageCount: 12,
    tint: "#F6F4EF",
    accent: "#17150F",
    photo: ["#D9D3C5", "#BDB5A2"],
    cover: { runs: [{ text: "Minimal\n" }, { text: "Zine", italic: true }], caption: "Issue one. Less, but better." },
    interior: [
      (pageId) => statementLayout(pageId, { statement: "Less noise.\nMore signal.", accent: "#17150F" }),
      chapter(["On making\nthings", "The case for\nwhite space"]),
    ],
  },
  {
    id: "tpl_bold_type",
    name: "Bold Type",
    category: "Marketing",
    pageCount: 20,
    tint: "#F5E9E4",
    accent: "#C98A15",
    photo: ["#E2D4CC", "#C9B3A6"],
    cover: { runs: [{ text: "Bold\n" }, { text: "Type", italic: true }], caption: "Say it big. Say it once." },
    interior: [(pageId) => statementLayout(pageId, { statement: "Big ideas\ndeserve big\nletters.", accent: "#C98A15" }), photo(["#E2D4CC", "#C9B3A6"])],
  },
  {
    id: "tpl_report",
    name: "Report",
    category: "Reports",
    pageCount: 32,
    tint: "#EFF3EF",
    accent: "#1C7A52",
    photo: ["#CFDCD3", "#A9C2B2"],
    cover: { runs: [{ text: "Annual\n" }, { text: "Report", italic: true }], caption: "Results, highlights and the year ahead." },
    interior: [
      (pageId) =>
        statsLayout(pageId, {
          title: "The year in numbers",
          stats: [["+38%", "Revenue growth"], ["12k", "New customers"], ["4.8", "Average rating"]],
          accent: "#1C7A52",
        }),
      chapter(["What we\nlearned", "Where we\ngo next"]),
    ],
  },
  {
    id: "tpl_lookbook",
    name: "Lookbook",
    category: "Portfolios",
    pageCount: 28,
    tint: "#F1EDF4",
    accent: "#17150F",
    photo: ["#E4D9E2", "#CBB9C8"],
    cover: { runs: [{ text: "Look\n" }, { text: "book", italic: true }], caption: "The season, one look at a time." },
    interior: [photo(["#E4D9E2", "#CBB9C8"]), chapter(["Look one:\nthe city", "Look two:\nthe coast"])],
  },
  {
    id: "tpl_menu",
    name: "Menu",
    category: "Business",
    pageCount: 8,
    tint: "#F6F1E4",
    accent: "#C98A15",
    photo: ["#DCD6C8", "#C3BCAA"],
    cover: { runs: [{ text: "The\n" }, { text: "Menu", italic: true }], caption: "Seasonal plates, served all day." },
    interior: [
      (pageId) =>
        listLayout(pageId, {
          title: "Plates",
          items: [
            ["Burrata, peach, basil", "14"],
            ["Grilled sardines", "16"],
            ["Tomato and bread salad", "11"],
            ["Octopus, potato, paprika", "22"],
            ["Wild mushroom rice", "19"],
            ["Lemon tart", "9"],
          ],
        }),
    ],
  },
  {
    id: "tpl_brochure",
    name: "Brochure",
    category: "Brochures",
    pageCount: 6,
    tint: "#EAF0F3",
    accent: "#1B45D6",
    photo: ["#C6CFEA", "#9FB0E0"],
    cover: { runs: [{ text: "Our\n" }, { text: "Services", italic: true }], caption: "What we do, and how we work." },
    interior: [
      chapter(["How we\nwork", "What you\nget"]),
      (pageId) =>
        gridLayout(pageId, {
          title: "Packages",
          items: [["Starter", "$490"], ["Studio", "$1,200"], ["Growth", "$2,900"], ["Custom", "Ask"]],
          tint: ["#C6CFEA", "#9FB0E0"],
        }),
    ],
  },
];

export const TEMPLATES: Template[] = DESIGNS.map(({ id, name, category, pageCount, tint }) => ({ id, name, category, pageCount, tint }));

export function findTemplate(id: string | undefined) {
  return TEMPLATES.find((t) => t.id === id);
}

/** The template's pages as editor documents. `idPrefix` keeps page and element ids unique. */
export function buildTemplatePages(templateId: string, idPrefix: string, limit?: number): Page[] {
  const design = DESIGNS.find((d) => d.id === templateId);
  if (!design) return [];
  const count = Math.min(design.pageCount, limit ?? design.pageCount);
  return Array.from({ length: count }, (_, i) => {
    const pageNumber = i + 1;
    const pageId = `${idPrefix}_p${pageNumber}`;
    const elements =
      pageNumber === 1
        ? coverLayout(pageId, { ...design.cover, accent: design.accent, tint: design.photo })
        : design.interior[(pageNumber - 2) % design.interior.length](pageId, pageNumber);
    return {
      id: pageId,
      flipbookId: idPrefix,
      pageNumber,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      background: { color: design.tint },
      backgroundImageKey: null,
      elements,
    };
  });
}

export type TemplateWithCover = Template & { cover: Page };

/** Every template with its real first page, for the gallery's previews. */
export function templatesWithCovers(): TemplateWithCover[] {
  return TEMPLATES.map((template) => ({ ...template, cover: buildTemplatePages(template.id, `preview_${template.id}`, 1)[0] }));
}
