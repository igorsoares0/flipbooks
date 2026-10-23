import { image, shape, text, type Tint } from "@/lib/layouts";
import type { PageElement, TextElement, TextRun } from "@/lib/types";

// "KPI Report": a ten-page monthly report, every page designed on its own. Charts are
// plain shapes, so readers can restyle them in the editor; the pictures ship in
// public/templates/kpi-report/ and are copied into the user's library on creation.

const NAVY = "#0E1A2B";
const NAVY_2 = "#182A44";
const CREAM = "#F4EFE6";
const MIST = "#E9EEF7";
const CORAL = "#FF5B3A";
/** Coral dark enough for small type on light pages. */
const CORAL_INK = "#D9411E";
const SKY = "#9DB8FF";
const SAND = "#D8CDB9";
const MUTED = "#6B6558";
const MUTED_DARK = "rgba(244,239,230,.64)";
const GOOD = "#5FD39E";
const RULE = "rgba(14,26,43,.14)";
const RULE_DARK = "rgba(244,239,230,.16)";

const DARK_PHOTO: Tint = ["#2A3A55", "#4A5D7E"];
const LIGHT_PHOTO: Tint = ["#E4DBCB", "#CFC5B3"];

type Box = { x: number; y: number; width: number; height: number };
type Style = Partial<TextElement["properties"]>;

/** Builds one page's elements, numbering their z-order as they are added. */
function page(pageId: string) {
  const elements: PageElement[] = [];
  const z = () => elements.length + 1;
  const runs = (content: string | TextRun[]) => (typeof content === "string" ? [{ text: content }] : content);
  return {
    elements,
    text: (key: string, name: string, box: Box, content: string | TextRun[], style: Style = {}) =>
      elements.push(text(pageId, key, name, box, z(), runs(content), style)),
    rect: (key: string, name: string, box: Box, fill: string, radius = 0) =>
      elements.push(shape(pageId, key, name, box, z(), { shape: "rect", fill, radius })),
    ellipse: (key: string, name: string, box: Box, fill: string) =>
      elements.push(shape(pageId, key, name, box, z(), { shape: "ellipse", fill, radius: 0 })),
    photo: (key: string, name: string, box: Box, tint: Tint) =>
      elements.push(image(pageId, key, name, box, z(), { from: tint[0], to: tint[1], label: "PHOTO", labelPosition: "bottom-left" })),
  };
}

type Page = ReturnType<typeof page>;

const eyebrow = (p: Page, label: string, y: number, color = CORAL_INK) =>
  p.text("eyebrow", "Eyebrow", { x: 40, y, width: 440, height: 15 }, label, {
    fontFamily: "mono",
    fontSize: 10.5,
    fontWeight: 500,
    color,
    letterSpacing: 1.6,
  });

const title = (p: Page, content: TextRun[], y: number, color = NAVY, fontSize = 42) =>
  p.text("title", "Title", { x: 40, y, width: 440, height: fontSize * 2 }, content, {
    fontFamily: "serif",
    fontSize,
    lineHeight: 1,
    letterSpacing: -0.8,
    color,
  });

// No page numbers on the inside pages: the viewer draws its own, low in the outer corner
// (near x 62, y 617 on left-hand pages), so even pages keep that spot clear.
const footer = (p: Page, dark = false) =>
  p.text("footer", "Footer", { x: 40, y: 648, width: 320, height: 13 }, "HALCYON · SEPTEMBER 2026 KPI REPORT", {
    fontFamily: "mono",
    fontSize: 8.5,
    fontWeight: 500,
    letterSpacing: 1,
    color: dark ? MUTED_DARK : MUTED,
  });

function cover(pageId: string) {
  const p = page(pageId);
  p.photo("photo", "Cover photo", { x: 0, y: 0, width: 520, height: 400 }, DARK_PHOTO);
  p.rect("shade", "Photo shade", { x: 0, y: 0, width: 520, height: 400 }, "rgba(14,26,43,.2)");
  const top: Style = { fontFamily: "mono", fontSize: 10, fontWeight: 500, letterSpacing: 1.6, color: CREAM };
  p.text("brand", "Company", { x: 40, y: 36, width: 200, height: 15 }, "HALCYON", top);
  p.text("issue", "Issue", { x: 260, y: 36, width: 220, height: 15 }, "ISSUE 09 · SEPTEMBER 2026", { ...top, align: "right" });
  p.ellipse("badge", "Badge", { x: 372, y: 336, width: 124, height: 124 }, CORAL);
  p.text("badgevalue", "Badge figure", { x: 372, y: 372, width: 124, height: 32 }, "+18.4%", {
    fontSize: 27,
    fontWeight: 700,
    letterSpacing: -0.8,
    lineHeight: 1.1,
    align: "center",
    color: NAVY,
  });
  p.text("badgelabel", "Badge label", { x: 372, y: 406, width: 124, height: 14 }, "MRR GROWTH", {
    fontFamily: "mono",
    fontSize: 8.5,
    fontWeight: 500,
    letterSpacing: 1.2,
    align: "center",
    color: NAVY,
  });
  eyebrow(p, "MONTHLY KPI REPORT", 432, CORAL);
  p.text("heading", "Heading", { x: 40, y: 456, width: 440, height: 136 }, [{ text: "September\n" }, { text: "in numbers", italic: true }], {
    fontFamily: "serif",
    fontSize: 68,
    lineHeight: 0.98,
    letterSpacing: -1.8,
    color: CREAM,
  });
  p.text("caption", "Caption", { x: 40, y: 608, width: 300, height: 36 }, "Revenue, customers, product and people: the month at a glance.", {
    fontSize: 12,
    color: MUTED_DARK,
  });
  p.text("folio", "Page number", { x: 400, y: 626, width: 80, height: 14 }, "01 / 10", {
    fontFamily: "mono",
    fontSize: 9.5,
    fontWeight: 500,
    align: "right",
    color: MUTED_DARK,
  });
  return p.elements;
}

function contents(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "CONTENTS", 48);
  p.text("title", "Title", { x: 40, y: 70, width: 230, height: 84 }, [{ text: "Inside this\n" }, { text: "issue", italic: true }], {
    fontFamily: "serif",
    fontSize: 42,
    lineHeight: 1,
    letterSpacing: -0.8,
    color: NAVY,
  });
  p.text("intro", "Introduction", { x: 40, y: 172, width: 220, height: 80 }, "A monthly look at the numbers that move the business, and at the people behind them.", {
    fontSize: 12.5,
    lineHeight: 1.55,
    color: MUTED,
  });
  p.photo("photo", "Team photo", { x: 290, y: 48, width: 190, height: 252 }, LIGHT_PHOTO);
  const sections = [
    ["Executive summary", "03"],
    ["Headline KPIs", "04"],
    ["Revenue", "05"],
    ["Customers & growth", "07"],
    ["Product engagement", "08"],
    ["People & support", "09"],
    ["Next month", "10"],
  ];
  sections.forEach(([name, pageNumber], i) => {
    const y = 326 + i * 38;
    const n = i + 1;
    p.text(`num${n}`, `Section number ${n}`, { x: 40, y: y + 8, width: 30, height: 15 }, String(n).padStart(2, "0"), {
      fontFamily: "mono",
      fontSize: 10.5,
      fontWeight: 500,
      color: CORAL_INK,
    });
    p.text(`section${n}`, `Section ${n}`, { x: 80, y, width: 320, height: 26 }, name, { fontFamily: "serif", fontSize: 23, lineHeight: 1.1, color: NAVY });
    p.text(`page${n}`, `Section page ${n}`, { x: 420, y: y + 8, width: 60, height: 15 }, pageNumber, {
      fontFamily: "mono",
      fontSize: 10.5,
      align: "right",
      color: MUTED,
    });
    p.rect(`rule${n}`, `Rule ${n}`, { x: 40, y: y + 33, width: 440, height: 1 }, RULE);
  });
  footer(p);
  return p.elements;
}

function summary(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "01 — EXECUTIVE SUMMARY", 48);
  p.text(
    "statement",
    "Statement",
    { x: 40, y: 76, width: 440, height: 190 },
    [
      { text: "Our strongest month yet: revenue up " },
      { text: "18%", italic: true },
      { text: ", churn at a record low, and more new customers than in any month since launch." },
    ],
    { fontFamily: "serif", fontSize: 33, lineHeight: 1.14, letterSpacing: -0.5, color: NAVY },
  );
  p.rect("accent", "Accent rule", { x: 40, y: 300, width: 48, height: 4 }, CORAL, 2);
  const points = [
    ["Revenue beat plan", "MRR reached $1.28M, 6% above plan, led by annual upgrades from mid-market accounts."],
    ["Lower churn", "Logo churn fell to 1.9% once the new onboarding flow reached every account."],
    ["Cheaper growth", "CAC dropped 7% as organic sign-ups grew faster than paid channels."],
  ];
  points.forEach(([heading, body], i) => {
    const x = 40 + i * 153;
    const n = i + 1;
    p.text(`pointnum${n}`, `Highlight number ${n}`, { x, y: 330, width: 134, height: 15 }, String(n).padStart(2, "0"), {
      fontFamily: "mono",
      fontSize: 10.5,
      fontWeight: 500,
      color: CORAL_INK,
    });
    p.text(`point${n}`, `Highlight ${n}`, { x, y: 352, width: 134, height: 20 }, heading, { fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: NAVY });
    p.text(`pointbody${n}`, `Highlight text ${n}`, { x, y: 376, width: 134, height: 108 }, body, { fontSize: 11.5, lineHeight: 1.55, color: MUTED });
  });
  p.rect("card", "Card", { x: 40, y: 516, width: 440, height: 108 }, NAVY, 14);
  p.text("cardlabel", "Card label", { x: 64, y: 538, width: 200, height: 14 }, "THE ONE NUMBER TO REMEMBER", {
    fontFamily: "mono",
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1.2,
    color: SKY,
  });
  p.text("cardvalue", "Card figure", { x: 64, y: 556, width: 180, height: 50 }, "$1.28M", {
    fontFamily: "serif",
    fontSize: 48,
    lineHeight: 1,
    letterSpacing: -1,
    color: CREAM,
  });
  p.text("cardtext", "Card text", { x: 262, y: 556, width: 194, height: 48 }, "Monthly recurring revenue, up from $1.08M in August.", {
    fontSize: 12,
    lineHeight: 1.5,
    color: MUTED_DARK,
  });
  footer(p);
  return p.elements;
}

function kpis(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "02 — HEADLINE KPIS", 48, CORAL);
  title(p, [{ text: "Six numbers,\n" }, { text: "one month", italic: true }], 70, CREAM);
  const tiles: [label: string, value: string, delta: string, good: boolean][] = [
    ["MRR", "$1.28M", "+18.4%", true],
    ["NEW CUSTOMERS", "1,342", "+9.2%", true],
    ["LOGO CHURN", "1.9%", "−0.6 pt", true],
    ["NPS", "62", "+4", true],
    ["CAC", "$412", "−7.0%", true],
    ["GROSS MARGIN", "78%", "−0.8 pt", false],
  ];
  tiles.forEach(([label, value, delta, good], i) => {
    const x = 40 + (i % 2) * 230;
    const y = 190 + Math.floor(i / 2) * 140;
    const n = i + 1;
    p.rect(`tile${n}`, `KPI tile ${n}`, { x, y, width: 210, height: 128 }, NAVY_2, 14);
    p.text(`label${n}`, `KPI label ${n}`, { x: x + 18, y: y + 18, width: 174, height: 14 }, label, {
      fontFamily: "mono",
      fontSize: 9.5,
      fontWeight: 500,
      letterSpacing: 1.2,
      color: SKY,
    });
    p.text(`value${n}`, `KPI value ${n}`, { x: x + 18, y: y + 38, width: 174, height: 50 }, value, {
      fontFamily: "serif",
      fontSize: 48,
      lineHeight: 1,
      letterSpacing: -1,
      color: CREAM,
    });
    p.rect(`pill${n}`, `Change pill ${n}`, { x: x + 18, y: y + 94, width: 66, height: 20 }, good ? "rgba(95,211,158,.16)" : "rgba(255,91,58,.18)", 10);
    p.text(`delta${n}`, `Change ${n}`, { x: x + 18, y: y + 97, width: 66, height: 15 }, delta, {
      fontFamily: "mono",
      fontSize: 10,
      fontWeight: 600,
      align: "center",
      color: good ? GOOD : CORAL,
    });
    p.text(`vs${n}`, `Comparison ${n}`, { x: x + 92, y: y + 97, width: 100, height: 15 }, "vs August", { fontSize: 10.5, color: MUTED_DARK });
  });
  footer(p, true);
  return p.elements;
}

function revenue(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "03 — REVENUE", 48);
  title(p, [{ text: "Monthly recurring\n" }, { text: "revenue", italic: true }], 70);
  p.text("figure", "Figure", { x: 40, y: 168, width: 240, height: 64 }, "$1.28M", {
    fontFamily: "serif",
    fontSize: 64,
    lineHeight: 1,
    letterSpacing: -1.6,
    color: CORAL_INK,
  });
  p.text("figurelabel", "Figure label", { x: 40, y: 238, width: 240, height: 18 }, "MRR, September 2026", { fontSize: 12, color: MUTED });
  const minis = [
    ["+$199K", "NET NEW MRR"],
    ["$15.4M", "ANNUAL RUN RATE"],
  ];
  minis.forEach(([value, label], i) => {
    const x = 300 + i * 96;
    p.text(`mini${i + 1}`, `Mini figure ${i + 1}`, { x, y: 182, width: 90, height: 28 }, value, {
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: -0.5,
      lineHeight: 1.2,
      color: NAVY,
    });
    p.text(`minilabel${i + 1}`, `Mini label ${i + 1}`, { x, y: 214, width: 90, height: 26 }, label, {
      fontFamily: "mono",
      fontSize: 8.5,
      fontWeight: 500,
      letterSpacing: 0.8,
      lineHeight: 1.4,
      color: MUTED,
    });
  });

  // Bar chart: the last twelve months, in thousands.
  const months = ["O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S"];
  const values = [720, 748, 771, 802, 839, 868, 902, 941, 990, 1034, 1081, 1280];
  const baseline = 560;
  const chartHeight = 230;
  const max = 1280;
  const left = 84;
  const slot = (480 - left) / months.length;
  [400, 800, 1200].forEach((v, i) => {
    const y = baseline - (v / max) * chartHeight;
    p.rect(`grid${i + 1}`, `Gridline ${i + 1}`, { x: left, y, width: 480 - left, height: 1 }, RULE);
    p.text(`axis${i + 1}`, `Axis label ${i + 1}`, { x: 40, y: y - 6, width: 38, height: 13 }, `$${v / 1000}M`, {
      fontFamily: "mono",
      fontSize: 8.5,
      color: MUTED,
    });
  });
  values.forEach((v, i) => {
    const height = (v / max) * chartHeight;
    const x = left + i * slot + (slot - 20) / 2;
    const last = i === values.length - 1;
    p.rect(`bar${i + 1}`, `Bar ${i + 1}`, { x, y: baseline - height, width: 20, height }, last ? CORAL : SAND, 3);
    p.text(`month${i + 1}`, `Month ${i + 1}`, { x: left + i * slot, y: baseline + 8, width: slot, height: 13 }, months[i], {
      fontFamily: "mono",
      fontSize: 8.5,
      align: "center",
      color: last ? CORAL_INK : MUTED,
    });
  });
  p.rect("baseline", "Baseline", { x: left, y: baseline, width: 480 - left, height: 1.5 }, NAVY);
  p.text(
    "note",
    "Note",
    { x: 40, y: 596, width: 440, height: 36 },
    "September's jump comes from 41 annual upgrades closed in the last week of the quarter. Without them, MRR grew 4.6%.",
    { fontSize: 11.5, lineHeight: 1.55, color: MUTED },
  );
  footer(p);
  return p.elements;
}

function quote(pageId: string) {
  const p = page(pageId);
  p.photo("photo", "Full-page photo", { x: 0, y: 0, width: 520, height: 690 }, DARK_PHOTO);
  p.rect("card", "Quote card", { x: 32, y: 452, width: 456, height: 206 }, "rgba(14,26,43,.9)", 16);
  p.text("mark", "Quote mark", { x: 60, y: 462, width: 60, height: 56 }, "“", { fontFamily: "serif", fontSize: 72, lineHeight: 1, color: CORAL });
  p.text(
    "quote",
    "Quote",
    { x: 60, y: 506, width: 400, height: 92 },
    [{ text: "We didn’t grow by doing more. We grew by doing fewer things, much better.", italic: true }],
    { fontFamily: "serif", fontSize: 26, lineHeight: 1.18, letterSpacing: -0.3, color: CREAM },
  );
  p.text("author", "Attribution", { x: 60, y: 618, width: 400, height: 14 }, "MAYA OKAFOR — CHIEF EXECUTIVE OFFICER", {
    fontFamily: "mono",
    fontSize: 9.5,
    fontWeight: 500,
    letterSpacing: 1.2,
    color: SKY,
  });
  return p.elements;
}

function funnel(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "04 — CUSTOMERS & GROWTH", 48);
  title(p, [{ text: "From visitor\n" }, { text: "to customer", italic: true }], 70);
  const steps: [label: string, value: string, rate: string, width: number][] = [
    ["VISITORS", "182.4K", "100%", 280],
    ["SIGN-UPS", "12,410", "6.8%", 206],
    ["ACTIVATED", "5,102", "41.1%", 144],
    ["PAYING", "1,342", "26.3%", 92],
  ];
  steps.forEach(([label, value, rate, width], i) => {
    const y = 190 + i * 76;
    const n = i + 1;
    const last = i === steps.length - 1;
    p.text(`steplabel${n}`, `Step label ${n}`, { x: 40, y, width: 150, height: 14 }, label, {
      fontFamily: "mono",
      fontSize: 9.5,
      fontWeight: 500,
      letterSpacing: 1.2,
      color: MUTED,
    });
    p.text(`stepvalue${n}`, `Step value ${n}`, { x: 40, y: y + 14, width: 150, height: 36 }, value, {
      fontFamily: "serif",
      fontSize: 34,
      lineHeight: 1,
      letterSpacing: -0.6,
      color: NAVY,
    });
    p.rect(`stepbar${n}`, `Step bar ${n}`, { x: 200, y: y + 2, width, height: 48 }, last ? CORAL : NAVY, 8);
    p.text(`steprate${n}`, `Step rate ${n}`, { x: 214, y: y + 18, width: width - 20, height: 15 }, rate, {
      fontFamily: "mono",
      fontSize: 10.5,
      fontWeight: 600,
      color: last ? NAVY : CREAM,
    });
  });
  p.text("ratenote", "Rate note", { x: 200, y: 494, width: 280, height: 14 }, "Each rate is the share of the step above.", {
    fontSize: 10.5,
    color: MUTED,
  });
  const stats = [
    ["$9,540", "Average contract value"],
    ["38 days", "Median time to close"],
    ["112%", "Net revenue retention"],
  ];
  stats.forEach(([value, label], i) => {
    const x = 40 + i * 153;
    const n = i + 1;
    p.rect(`statrule${n}`, `Stat rule ${n}`, { x, y: 532, width: 134, height: 1 }, RULE);
    p.text(`stat${n}`, `Stat ${n}`, { x, y: 546, width: 134, height: 30 }, value, {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: -0.6,
      lineHeight: 1.2,
      color: NAVY,
    });
    p.text(`statlabel${n}`, `Stat label ${n}`, { x, y: 580, width: 134, height: 18 }, label, { fontSize: 11.5, color: MUTED });
  });
  footer(p);
  return p.elements;
}

function engagement(pageId: string) {
  const p = page(pageId);
  p.photo("photo", "Product photo", { x: 0, y: 0, width: 520, height: 260 }, LIGHT_PHOTO);
  eyebrow(p, "05 — PRODUCT ENGAGEMENT", 290);
  title(p, [{ text: "People use it,\n" }, { text: "and come back", italic: true }], 312, NAVY, 38);
  p.text("figure", "Figure", { x: 40, y: 416, width: 170, height: 64 }, "48%", {
    fontFamily: "serif",
    fontSize: 66,
    lineHeight: 1,
    letterSpacing: -1.6,
    color: CORAL_INK,
  });
  p.text("figurelabel", "Figure label", { x: 40, y: 488, width: 170, height: 54 }, "DAU / MAU stickiness, up from 44% in August.", {
    fontSize: 12,
    lineHeight: 1.5,
    color: MUTED,
  });
  p.text("adoption", "Chart title", { x: 240, y: 420, width: 240, height: 14 }, "FEATURE ADOPTION", {
    fontFamily: "mono",
    fontSize: 9.5,
    fontWeight: 500,
    letterSpacing: 1.2,
    color: MUTED,
  });
  const features: [string, number][] = [
    ["Dashboards", 0.86],
    ["Scheduled reports", 0.64],
    ["Alerts", 0.51],
    ["API access", 0.23],
  ];
  features.forEach(([name, share], i) => {
    const y = 446 + i * 42;
    const n = i + 1;
    p.text(`feature${n}`, `Feature ${n}`, { x: 240, y, width: 170, height: 18 }, name, { fontSize: 12.5, fontWeight: 500, color: NAVY });
    p.text(`share${n}`, `Feature share ${n}`, { x: 420, y: y + 1, width: 60, height: 15 }, `${Math.round(share * 100)}%`, {
      fontFamily: "mono",
      fontSize: 10.5,
      fontWeight: 500,
      align: "right",
      color: NAVY,
    });
    p.rect(`track${n}`, `Track ${n}`, { x: 240, y: y + 22, width: 240, height: 8 }, "rgba(14,26,43,.1)", 4);
    p.rect(`fill${n}`, `Fill ${n}`, { x: 240, y: y + 22, width: 240 * share, height: 8 }, i === 0 ? CORAL : NAVY, 4);
  });
  footer(p);
  return p.elements;
}

function people(pageId: string) {
  const p = page(pageId);
  eyebrow(p, "06 — PEOPLE & SUPPORT", 48);
  title(p, [{ text: "The team behind\n" }, { text: "the numbers", italic: true }], 70);
  p.photo("photo", "Team photo", { x: 40, y: 172, width: 440, height: 240 }, LIGHT_PHOTO);
  const stats = [
    ["1h 42m", "Median first response"],
    ["96%", "Customer satisfaction (CSAT)"],
    ["4,812", "Tickets resolved"],
    ["84", "Team members, 6 joined this month"],
  ];
  stats.forEach(([value, label], i) => {
    const x = 40 + (i % 2) * 230;
    const y = 436 + Math.floor(i / 2) * 96;
    const n = i + 1;
    p.rect(`rule${n}`, `Stat rule ${n}`, { x, y, width: 210, height: 1 }, RULE);
    p.text(`stat${n}`, `Stat ${n}`, { x, y: y + 12, width: 210, height: 44 }, value, {
      fontFamily: "serif",
      fontSize: 42,
      lineHeight: 1,
      letterSpacing: -0.8,
      color: i === 1 ? CORAL_INK : NAVY,
    });
    p.text(`statlabel${n}`, `Stat label ${n}`, { x, y: y + 60, width: 210, height: 18 }, label, { fontSize: 11.5, color: MUTED });
  });
  footer(p);
  return p.elements;
}

function nextMonth(pageId: string) {
  const p = page(pageId);
  p.photo("photo", "Skyline photo", { x: 0, y: 0, width: 520, height: 290 }, DARK_PHOTO);
  eyebrow(p, "07 — NEXT MONTH", 312, CORAL);
  title(p, [{ text: "October\n" }, { text: "priorities", italic: true }], 334, CREAM);
  const goals = [
    ["Close the Q4 enterprise pipeline", "$1.40M MRR"],
    ["Ship self-serve onboarding v2", "CHURN < 1.8%"],
    ["Launch the partner program", "20 PARTNERS"],
    ["Hire support in EMEA", "+5 HIRES"],
  ];
  goals.forEach(([goal, target], i) => {
    const y = 436 + i * 42;
    const n = i + 1;
    p.text(`num${n}`, `Goal number ${n}`, { x: 40, y: y + 2, width: 30, height: 15 }, String(n).padStart(2, "0"), {
      fontFamily: "mono",
      fontSize: 10.5,
      fontWeight: 500,
      color: CORAL,
    });
    p.text(`goal${n}`, `Goal ${n}`, { x: 80, y, width: 290, height: 20 }, goal, { fontSize: 14, fontWeight: 500, color: CREAM });
    p.text(`target${n}`, `Target ${n}`, { x: 370, y: y + 2, width: 110, height: 15 }, target, {
      fontFamily: "mono",
      fontSize: 9.5,
      fontWeight: 500,
      letterSpacing: 0.8,
      align: "right",
      color: SKY,
    });
    p.rect(`rule${n}`, `Rule ${n}`, { x: 40, y: y + 31, width: 440, height: 1 }, RULE_DARK);
  });
  footer(p, true);
  return p.elements;
}

export const KPI_REPORT_PAGES = [
  { background: NAVY, elements: cover },
  { background: CREAM, elements: contents },
  { background: CREAM, elements: summary },
  { background: NAVY, elements: kpis },
  { background: CREAM, elements: revenue },
  { background: NAVY, elements: quote },
  { background: CREAM, elements: funnel },
  { background: MIST, elements: engagement },
  { background: CREAM, elements: people },
  { background: NAVY, elements: nextMonth },
];

/** Bundled pictures (under public/templates/), by `p{page}_{element key}`. */
export const KPI_REPORT_PHOTOS: Record<string, string> = {
  p1_photo: "kpi-report/cover.webp",
  p2_photo: "kpi-report/meeting.webp",
  p6_photo: "kpi-report/window.webp",
  p8_photo: "kpi-report/laptop.webp",
  p9_photo: "kpi-report/support.webp",
  p10_photo: "kpi-report/skyline.webp",
};
