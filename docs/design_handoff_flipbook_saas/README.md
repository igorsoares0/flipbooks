# Handoff: Flipbook SaaS — Web App Interface

## Overview

A complete UI for a flipbook SaaS: users upload a PDF (or design from scratch on a canvas), edit pages, publish to a public URL, embed via iframe, and measure reading behavior. The product launches with a Lifetime Deal (LTD) sold through Paddle, with all features gated behind an entitlements layer.

This handoff covers **nine screens** in one prototype file: Dashboard, Create flipbook, Canvas editor, Public viewer, Flipbook settings (General / Branding / Share & embed), Analytics, Billing, Auth (login / register / forgot), and the Marketing landing page.

The design was built from the product spec `uploads/flipbook-saas-spec-driven-development.md` (Next.js + React + TypeScript + Tailwind, Auth.js, Prisma/Neon, Cloudflare R2, Resend, Paddle, Hetzner workers, Konva + Zustand editor).

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show intended look and behavior, not production code to copy directly. The prototype uses a lightweight streaming-component runtime (`support.js`) and inline styles; none of that should ship.

The task is to **recreate these designs in the target codebase** (per the spec: Next.js App Router + React + TypeScript + Tailwind), using its established patterns, component library and tokens. Map the inline style values below onto Tailwind theme tokens rather than hardcoding them per element.

## Fidelity

**High-fidelity.** Final colors, typography, spacing and interaction states. Recreate pixel-accurately. Two deliberate exceptions:

- **All imagery is placeholder** — flipbook page thumbnails, cover images and template previews are CSS gradients with a `IMAGE PLACEHOLDER` label. Replace with real rendered page thumbnails from R2.
- **The logo** is a simple two-rectangle mark standing in for a real brand mark.

---

## Design Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F3F1EC` | App canvas / page background (warm paper) |
| `surface` | `#FFFFFF` | Cards, panels, sidebar, inputs |
| `surface-sunken` | `#FBFAF7` | Hover rows, inset cards, chips |
| `surface-alt` | `#F1EFE8` | Active nav item, active tool |
| `ink` | `#17150F` | Primary text, primary buttons, dark surfaces |
| `ink-2` | `#2C2920` | Primary button hover |
| `ink-70` | `#4F4B40` | Secondary text, inactive nav labels |
| `muted` | `#6E6A5E` | Body copy on light surfaces |
| `muted-2` | `#8C8676` | Meta text, captions |
| `muted-3` | `#A5A091` | Placeholder text, mono micro-labels |
| `line` | `#E4E0D6` | All borders and dividers on light |
| `line-soft` | `#F4F1EA` | Row dividers inside cards |
| `line-strong` | `#C9C3B4` | Dashed dropzone borders |
| `accent` | `#1B45D6` | Primary accent (cobalt): CTAs, selection, active bars |
| `accent-hover` | `#122F93` | Accent button hover |
| `accent-soft` | `#E8ECFB` | Accent tint backgrounds |
| `accent-soft-2` | `#DCE3FA` | Avatar background |
| `success` | `#1C7A52` | Published status, positive deltas |
| `success-soft` | `#E7F2EC` | Published badge background |
| `warning` | `#C98A15` | Processing, unsaved, bandwidth warning |
| `warning-soft` | `#FDF0DC` | Processing badge background |
| `danger` | `#C0392B` | Failed status, destructive actions, negative deltas |
| `danger-soft` | `#FBECEA` | Failed badge background |
| `danger-line` | `#F0D8D4` | Destructive button border |
| `danger-tint` | `#FDF3F1` | Destructive button hover |
| `on-dark` | `#F6F4EF` | Text on `ink` surfaces; also the viewer paper color |
| `on-dark-dim` | `#B7B2A5` | Secondary text on `ink` |
| `on-dark-dim-2` | `#8F8A7C` | Tertiary text on `ink` |
| `line-dark` | `#3B382E` | Borders on `ink` surfaces |
| `paper-2` | `#EDE9E0` | Right page of the viewer spread |
| `page-shade` | `#D9D3C5` → `#BDB5A2` | Image placeholder gradient (150deg) |

Branding-configurable accents offered to end users: `#1B45D6`, `#C0392B`, `#1C7A52`, `#C98A15`, `#17150F`.
Viewer backgrounds offered: `#17150F`, `#F3F1EC`, `#26303F`.

### Typography

Three families, loaded from Google Fonts:

- **Instrument Sans** (400/500/600/700) — all UI text.
- **Instrument Serif** (regular + italic) — display: page titles, big metric numbers, the flipbook's own editorial content.
- **JetBrains Mono** (400/500) — micro-labels, numbers, URLs, code, page counters.

| Role | Spec |
|---|---|
| Page title (serif) | Instrument Serif 400, 30–34px, `letter-spacing:-0.5px`, line-height 1.1 |
| Marketing H1 | Instrument Serif 400, `clamp(42px,6.4vw,72px)`, `letter-spacing:-2px`, line-height 1.02 |
| Big stat | Instrument Serif 400, 38px, line-height 1.05, `letter-spacing:-1px` |
| Metric value | Instrument Sans 600, 24px, `letter-spacing:-0.6px` |
| Header / section title | Instrument Sans 600, 13–15.5px, `letter-spacing:-0.2 to -0.3px` |
| Body | Instrument Sans 400, 12.5–13.5px, line-height 1.55 |
| Meta / caption | Instrument Sans 400, 11–11.5px |
| Button | Instrument Sans 600, 12.5–14px, `line-height:1.3`, `white-space:nowrap` |
| Micro-label (mono) | JetBrains Mono 500, 9.5–11px, `letter-spacing:.06–.1em`, usually uppercase |

### Spacing, radius, elevation

- Spacing scale in use: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 28 px. Layout gutters 18–28px; page padding `28px 28px 60px`.
- Radius: `4px` page thumbnails · `6–7px` small chips/buttons · `8–9px` buttons, inputs · `10–12px` inner cards, icon tiles · `13–16px` cards · `18–20px` hero/promo blocks · `20–22px` pills · `50%` avatars, round nav buttons.
- Borders: always `1px solid #E4E0D6` (`1.5px dashed #C9C3B4` for dropzones, `1.5–2px solid` for selected states).
- Shadows: cards are borders-only, no shadow. `0 1px 3px rgba(23,21,15,.08)` page thumbnails · `0 8px 30px rgba(23,21,15,.12)` editor canvas · `0 24px 70px rgba(0,0,0,.55)` viewer spread · `0 30px 70px rgba(23,21,15,.22)` marketing hero block.
- Content max-widths: 1180px dashboard/marketing, 1100px analytics, 1080px settings, 980px create, 900px billing, 360px auth form.

---

## Global Layout

### App shell (Dashboard, Create, Settings, Analytics, Billing)

Two columns, `display:flex`, full viewport height.

**Sidebar** — 236px fixed, `background:#FFFFFF`, `border-right:1px solid #E4E0D6`, `position:sticky; top:0; height:100vh`, `flex-direction:column`.
- Logo block: `padding:22px 20px 18px`, 26px rounded-7px `#17150F` tile + wordmark "Flipbook" (15.5px/600) + `LTD` mono badge pushed right (9px mono, 1px border, radius 4px).
- Nav: section label `WORKSPACE` (10px mono, `#A5A091`, `.08em`), then items at `padding:8px 9px`, `gap:10px`, radius 9px, 12.5px. Active = `background:#F1EFE8; color:#17150F; font-weight:600`. Inactive = transparent, `#4F4B40`, 500. Hover = `#F3F1EC`. Icons are 15px 1.4-stroke line icons.
  Items: Dashboard · Flipbooks (badge `12`) · Templates · Assets · Analytics · Billing · Settings.
- Footer block (`margin-top:auto; padding:16px`): storage card (`#FBFAF7`, 1px border, radius 12px) with label + `2.4 / 20 GB` mono value + 5px progress track (`#E9E5DB`, fill `#1B45D6` at 12%) + `Lifetime plan · 12% used`; two small secondary buttons (`Site`, `Sign out`); user row with 28px circular avatar (`#DCE3FA` / `#1B45D6`, initials 11.5px/600), name 12.5px/600, email 11px `#8C8676`, both truncated.

**Main** — `flex:1; min-width:0`.
- **Topbar**: 62px, `border-bottom:1px solid #E4E0D6`, `background:rgba(243,241,236,.85)` + `backdrop-filter:blur(8px)`, sticky, `padding:0 28px`. Left: screen title (15px/600). Right: search pill (240px, `flex:0 1 240px`, shrinkable, 1px border, radius 9px, magnifier icon + "Search flipbooks" truncated) and primary button **Create flipbook** (`#17150F`, white, radius 9px, `9px 15px`, plus icon).
- **Content**: `padding:28px 28px 60px`, entrance animation `fbfade .25s ease` (`opacity 0 → 1`, `translateY(6px) → 0`).

### Full-bleed screens

Editor, Viewer, Auth and Marketing render **without** the shell, at `100vh` / `min-height:100vh`.

### Responsive

Everything except the editor and the viewer spread is fluid: wrapping flex rows with `flex:1 1 <basis>; min-width:0`, `grid-template-columns:repeat(auto-fit,minmax(Xpx,1fr))` for card grids. No fixed page widths. The editor is desktop/tablet-first (fixed rails). Mobile viewer (single page + swipe) is **not yet designed** — see Gaps.

---

## Screens

### 1. Dashboard

**Purpose:** see the portfolio at a glance and jump into a flipbook.

**Layout:** max-width 1180px, `flex-direction:column; gap:24px`.

**a) Stat cards** — `grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px`. Each: white, 1px border, radius 14px, `padding:18px 18px 16px`; mono uppercase label (10px, `#8C8676`); Instrument Serif 38px value; 11.5px `#6E6A5E` sub-line.

| Label | Value | Sub |
|---|---|---|
| FLIPBOOKS | 12 | 3 published this month |
| TOTAL VIEWS | 48.2k | +18% vs last 30 days |
| AVG. READ TIME | 3:24 | Across published books |
| STORAGE | 2.4 | GB of 20 GB on Lifetime |

**b) Recent flipbooks table** — full-width card, radius 16px, `overflow:hidden`.
- Header row: `padding:16px 18px`, `border-bottom:1px solid #EFEBE2`; title "Recent flipbooks" (13.5px/600); right-aligned type filters `All` (active: `#F3F1EC` pill) / `PDF` / `Canvas` in 11px mono.
- Data row: `display:flex; flex-wrap:wrap; gap:10px 14px; padding:13px 18px; border-bottom:1px solid #F4F1EA`; hover `#FBFAF7`.
  - Thumbnail 44×58, radius 4px, 1px border, gradient background with three faux content bars (`rgba(23,21,15,.22/.13/.08)`).
  - Title cell `flex:1 1 140px; min-width:140px`: title 13.5px/600 truncated + type badge (`PDF`/`CANVAS`, 9.5px mono, 1px border, radius 4px); meta line 11.5px `#8C8676`.
  - Meta group `margin-left:auto`, `gap:14px`: status badge, views (60px, right, 12px mono), updated (80px, right, 11.5px `#8C8676`).
  - Actions: `Edit` (secondary, radius 7px), eye icon button (30×28), `···` overflow (30×28).
- Status badge: inline-flex pill, radius 20px, `padding:3px 9px`, 11px/600, 5px dot in the same color. Published `#1C7A52`/`#E7F2EC` · Draft `#6E6A5E`/`#F1EFE8` · Processing `#9A6B0C`/`#FDF0DC` · Ready `#1B45D6`/`#E8ECFB` · Failed `#C0392B`/`#FBECEA`.

Sample rows (title · type · meta · status · views · updated): Summer Catalog 2026 · PDF · 64 pages · 18.4 MB · Published · 12,480 · 2h ago; Brand Guidelines v4 · CANVAS · 28 pages · edited by you · Published · 3,106 · Yesterday; Annual Report 2026 · PDF · 64 pages · rendering · Processing · — · Just now; Lookbook SS26 · PDF · 42 pages · 22.1 MB · Ready · 0 · 2m ago; Investor Deck · CANVAS · 16 pages · private · Draft · — · Sep 4; Pricing v3 · PDF · Upload failed · invalid font · Failed · — · Sep 2.

**c) Empty state** (when the user has no flipbooks) — replaces the rows: `padding:52px 24px`, centered; 56×70 dashed page outline with two bars; "No flipbooks yet" (14px/600); "Drop in a PDF and we'll render the pages, or start from a blank canvas." (12.5px, max-width 320px); primary button "Create your first flipbook".

### 2. Create flipbook

**Purpose:** the fork between the two creation paths.

Max-width 980px. Serif H1 "Create a flipbook" (34px) + sub "Two ways in. Both end up in the same viewer, publishing and analytics."

**Two option cards** — `repeat(auto-fit,minmax(320px,1fr))`, gap 16px, radius 16px, `padding:26px`, centered content.
- *From PDF*: `1.5px dashed #C9C3B4`, hover `border-color:#1B45D6; background:#FBFBFF`. 46px `#E8ECFB` tile with upload glyph; title 15px/600; "Drag a PDF here or browse. Max 100 MB, up to 300 pages on your Lifetime plan."; accent button "Choose file"; mono footnote `PDF · UPLOAD → R2 → WORKER → READY`.
- *From scratch*: solid 1px border. `#F1EFE8` tile with plus-in-square glyph; "Open the canvas editor with a blank page, or start from one of the templates below."; ink button "Open editor"; footnote `CANVAS · KONVA + ZUSTAND`.

**Templates** — category tabs (Magazines active with 1.5px underline, then Catalogs, Business, Brochures, Portfolios, Reports, Marketing) and a `repeat(auto-fill,minmax(160px,1fr))` grid. Each card: `aspect-ratio:3/4`, radius 10px, tinted background, inset 12px faux layout (34% image block, heading bar, two text bars, bottom button bar), hover `border-color:#17150F`; name 12.5px/600 + "N pages" 11px below.
Templates: Editorial 24 `#F4EFE6` · Product Grid 16 `#EDF1FB` · Minimal Zine 12 `#F6F4EF` · Bold Type 20 `#F5E9E4` · Report 32 `#EFF3EF` · Lookbook 28 `#F1EDF4` · Menu 8 `#F6F1E4` · Brochure 6 `#EAF0F3`.

### 3. Canvas editor (full-bleed)

`height:100vh`, `background:#E9E6DE`, column layout.

**Topbar** — 52px white, 1px bottom border, `padding:0 14px`, gap 14px:
back button (30px square, radius 8px) · doc title 13.5px/600 + `CANVAS` badge · menus `File` `Edit` `View` (12.5px `#6E6A5E`) · divider · undo/redo icon buttons · right group: save indicator (6px dot + label — `#1C7A52` "Saved" / `#C98A15` "Saving…"), `Preview` secondary, `Publish` accent.

**Tool rail** — 64px white, 1px right border. Six 48×50 buttons stacked (icon 18px + 9.5px label): Text, Shapes, Uploads, Elements, Photos, Layers. Active = `background:#F1EFE8`.

**Tool panel** — 236px white, 1px right border, `padding:16px`. Panel title 12.5px/600, then:
- *Text*: three preview buttons — "Add a heading" (Instrument Serif 22px), "Add a subheading" (14px/600), "Add body text" (12px); 1px border, radius 9px, hover `border-color:#1B45D6`.
- *Shapes*: 3-col grid of square tiles containing a 26px square, 26px circle, 28×2 line in `#17150F`.
- *Uploads*: dashed dropzone ("Drop images here / JPG · PNG · WebP · SVG") + 2-col grid of six square tinted asset thumbnails (`#D9D3C5 #C6CFEA #E2D4CC #CFDCD3 #DCD6C8 #E4D9E2`).

**Canvas area** — `flex:1; overflow:auto`, centered, `padding:28px`. The page is a fixed 520×690 white artboard with `0 8px 30px rgba(23,21,15,.12)` and absolutely-positioned elements:
- Heading at `left:44 top:56 right:44` — Instrument Serif 52px / 1.02 / `-1.5px`, "Summer / *Catalog* 26" (the word *Catalog* italic).
- Image placeholder `left:44 top:250`, 270×290, gradient `150deg #D9D3C5 → #C3BCAA`, centered mono label.
- Circle `right:44 top:300`, 120×120, `#1B45D6`.
- Footer row at `bottom:52`: caption 11px `#6E6A5E` (max 230px) and mono page number `01`.
- **Selection**: 1.5px `#1B45D6` outline offset −8px (text) / −1.5px (image) / −6px + round (circle), with 7×7 white square handles with 1.5px accent borders at the corners. Clicking the artboard background deselects (selects the page).

**Pages filmstrip** — 104px white bar, 1px top border, horizontally scrollable, `gap:10px`, `padding:0 16px`. Each page: 54×70 white rect, radius 3px, `1px solid #E4E0D6` (active `2px solid #1B45D6`), 9.5px mono number below. Trailing `+` button: 54×70 dashed, hover accent.

**Properties panel** — 250px white, 1px left border, `padding:16px`.
- Header: element name 12.5px/600 + type badge (`TEXT` / `IMAGE` / `SHAPE` / `PAGE`).
- `POSITION & SIZE` — 2-col grid of four read-only fields (mono key `X Y W H` + value), 1px border, radius 8px, `padding:7px 9px`.
- `TRANSFORM` — Rotation slider (4px track `#EFEBE2`, 12px white knob with 1.5px `#17150F` border, centered at 0°) and Opacity slider (filled `#17150F` at 100%).
- `TYPOGRAPHY` (text selection only) — font select showing "Instrument Serif", size `52 px` + line-height `1.02 lh` fields, alignment segmented control (Left active with `#17150F` border), 4 color swatches (26px, radius 7px: ink, accent, danger, success) + current mono hex `#17150F`.
- Footer: `Duplicate` secondary and `Delete` (danger border `#F0D8D4`, text `#C0392B`, hover `#FDF3F1`).

Per-element values: Heading 44/56/432/162 · Cover image 44/250/270/290 · Ellipse 356/300/120/120 · Page 0/0/520/690.

### 4. Public viewer (full-bleed)

`height:100vh`, `background:#17150F` (branding-configurable).

**Topbar** 56px: back button (1px `#3B382E` border) · title 13.5px/600 `#F6F4EF` + mono URL `flipbook.co/f/summer-catalog` in `#8F8A7C` · right: `Thumbnails` `Zoom` `Share` `Fullscreen` (32px tall, 1px `#3B382E` border, transparent, hover `border-color:#F6F4EF`).

**Spread** — centered row with 42px round prev/next buttons either side (`gap:22px`, `padding:0 24px`). The spread itself: `display:flex; height:min(74vh,100%); width:auto; max-width:100%; aspect-ratio:3/2; border-radius:3px; overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.55)` — **height-driven sizing is load-bearing**; an auto-width aspect-ratio flex item collapses.
- Left page: `#F6F4EF`, `padding:7% 6%`, inner shadow `inset -14px 0 24px -18px rgba(0,0,0,.6)`; mono eyebrow `CHAPTER TWO`; Instrument Serif `min(4.2vh,34px)` headline "Light, linen / and long evenings"; four faux text bars; mono page number pinned bottom.
- Right page: `#EDE9E0`, inner shadow mirrored; inset 7%/6% gradient image placeholder; mono page number bottom-right.

**Bottom bar** 96px: horizontally scrollable strip of 26×34 thumbnails (current spread pages `#F6F4EF`, others `rgba(246,244,239,.24)`) and a pill (`rgba(255,255,255,.06)`, 1px `#3B382E`, radius 22px) with mono counter `4–5 / 64`, divider, and "Powered by Flipbook".

Paging moves two pages at a time, clamped to 2…62.

### 5. Flipbook settings

Max-width 1080px. Header: mono `SETTINGS` eyebrow, serif title, right-aligned `Preview` + `Share` buttons. Tab bar (`General` / `Branding` / `Share & embed`): 13px, active 600 `#17150F` with 2px bottom border, inactive 500 `#8C8676`, sitting on a `1px solid #E4E0D6` rule.

Two columns: form `flex:1 1 420px`, live preview `flex:1 1 300px; position:sticky; top:90px`.

**General** — white card, radius 16px, `padding:20px 22px`, `gap:16px`:
- Title field (read-only style box, radius 9px).
- Public URL: split field with mono prefix `flipbook.co/f/` in `#A5A091` + editable slug in ink + green "Available"; helper "Changing the slug keeps a redirect from the old URL for 30 days."
- Description with "· used for SEO and link previews" hint, 64px min-height, mono counter `88 / 160`.
- Visibility: three selectable cards (`flex:1 1 150px`), 1.5px border — selected `#17150F` + `#F7F6F1`. Public "Anyone with the link" · Unlisted "Hidden from search" · Private "Only you".
- Danger card: 1px `#F0D8D4` border, "Delete flipbook" + "Removes pages, assets and analytics. Cannot be undone." + `Delete` button.

**Branding** — accent swatch row (5 × 30px, radius 9px; selected gets `2px solid #17150F` + `0 0 0 2px #fff inset`) with the live hex in mono; viewer-background swatch row (3); then six toggle rows separated by `1px solid #F4F1EA`, each with label 12.5px/500 + 11px sub and a 38×22 switch (track radius 20px, off `#DDD8CC`, on = the chosen accent, 18px white knob with `0 1px 2px rgba(0,0,0,.2)`):
Show your logo (on) · Share button (on) · Allow PDF download (off) · Fullscreen button (on) · Thumbnail strip (on) · Powered by Flipbook (on).

**Share & embed** — public link field + `Copy link`; share chips (LinkedIn, X, WhatsApp, Email, QR code — radius 20px, `nowrap`); embed code block on `#17150F`, radius 10px, `pre` in 11.5px/1.7 JetBrains Mono `#C9C3B4`:
```html
<iframe
  src="https://flipbook.co/embed/fb_8Kd2"
  width="100%"
  height="600"
  frameborder="0"
  loading="lazy">
</iframe>
```
plus `Copy code` / `WordPress shortcode`; and a link-preview card (118px gradient thumb + `FLIPBOOK.CO` mono domain, title, description).

**Live viewer preview** (right column) — mono label `LIVE VIEWER PREVIEW`, then a miniature viewer inside a 14px-radius bordered box that re-renders from the branding state: shell background = chosen ground; text color flips to `#17150F` on the light ground; logo chip = accent; Share / PDF / ⤢ chips, thumbnail strip, counter and "Powered by Flipbook" each appear only when their toggle is on. Caption: "Lifetime plan lets you remove the Flipbook badge."

### 6. Analytics

Max-width 1100px. Header: mono `FLIPBOOK` eyebrow, serif title "Summer Catalog 2026", sub `app.flipbook.co/f/summer-catalog · published Aug 21`; right: range segmented control `30d` (active `#F3F1EC`) / `90d` / `All`.

**Metric cards** — `repeat(auto-fit,minmax(150px,1fr))`, radius 13px, `padding:15px 16px`: mono label, 24px/600 value, delta line (`#1C7A52` positive, `#C0392B` negative).
VIEWS 12,480 +18.4% · UNIQUE 8,912 +11.2% · PAGE VIEWS 96,204 +22.8% · AVG. TIME 4:12 −0:18 · SHARES 318 +6.0% · DOWNLOADS 1,024 +3.1%.

**Views per page** (`flex:1 1 420px`) — 180px-tall bar chart, 16 bars (`max-width:26px`, radius `3px 3px 0 0`, `#17150F` at 82% opacity; page 10 highlighted `#C98A15`), 9px mono page numbers beneath, hover `#1B45D6`. Heights follow 100, 92, 88, 80, 76, 71, 64, 60, 55, 34, 30, 27, 24, 21, 18, 15 (×1.5px). Caption: "Drop-off after page 9 — consider moving the CTA earlier."

**Devices** (`flex:1 1 260px`) — three labeled 5px bars: Mobile 54% `#17150F`, Desktop 38% `#1B45D6`, Tablet 8% `#C98A15`.
**Top countries** — rows with `1px solid #F4F1EA` dividers: Brazil 4,182 · United States 3,014 · Portugal 1,806 · Germany 942 · Spain 711.

### 7. Billing

Max-width 900px.

**Plan hero** — `#17150F`, radius 18px, `padding:28px 30px`, wrapping flex: mono `CURRENT PLAN`, Instrument Serif 40px "Lifetime Deal", body "Paid once via Paddle on Feb 14, 2026. Entitlement `LIFETIME`, no expiry." (the token in mono); right column: `Manage in Paddle` (light) and `Download invoices` (outline `#3B382E`).

**Entitlements card** — "Limits are enforced server-side on every request."; `repeat(auto-fit,minmax(210px,1fr))` of usage meters (label + mono value on a wrapping row, 5px track): Storage 2.4 / 20 GB (12%) · Pages processed 412 / 3,000 (14%) · Monthly views 48k / 250k (19%) · Bandwidth 86 / 500 GB (17%, `#C98A15`). Below, feature pills with green dots: Canvas editor · Remove branding · Custom slug · Analytics · Embed anywhere.

### 8. Auth (full-bleed)

Two 50/50 panels that stack below ~840px (`flex:1 1 420px` each).

**Left** — `#F3F1EC`, centered 360px column: logo block; serif H1; 13px sub; Google button (full width, 1px border, radius 10px, official 4-color G mark); `OR` divider (mono, flanked by 1px rules); fields (Name for register only, Email — shown focused with 1px `#17150F` border and a caret, Password with "Forgot?" link on login); full-width ink submit; switch line (flex, baseline-aligned, accent link); legal footnote 11px `#A5A091`.

| Mode | H1 | Sub | CTA | Switch |
|---|---|---|---|---|
| login | Welcome back | Log in to your workspace and pick up where you left off. | Log in | New here? → Create an account |
| register | Start your first flipbook | Free to try. The Lifetime Deal unlocks the canvas editor and analytics. | Create account | Already have an account? → Log in |
| forgot | Reset your password | Enter your email and we will send a reset link. It expires in 30 minutes. | Send reset link | Remembered it? → Back to log in |

Forgot mode hides both the password field and the Google button.

**Right** — `#17150F`: two overlapping page mockups (`aspect-ratio:3/4`, rotated `-4deg` and `3deg` + 14px offset, `0 20px 44px rgba(0,0,0,.5)`), then serif 28px pull-quote "Every PDF deserves a better reading experience." and 12.5px `#8F8A7C` support line.

### 9. Marketing landing (full-bleed)

- **Header** 66px, sticky, blurred `rgba(243,241,236,.9)`, 1px bottom border, `padding:0 clamp(18px,4vw,56px)`: logo, nav (Features / Pricing / Templates), `Log in` text button, `Get the Lifetime Deal` ink button.
- **Hero** (max-width 1180px, two wrapping columns `flex:1 1 380px`): mono pill `● LIFETIME DEAL · FIRST 500 SEATS` (nowrap); H1 "Create stunning / flipbooks."; sub "Upload a PDF or design from scratch. Publish a link, embed it anywhere, and measure every page."; `Create your first flipbook` + `See a live example`; footnote "One payment · no subscription · 20 GB storage". Right: `#17150F` radius-18px block holding two 3/4 pages (text page + gradient image page).
- **Features** — `repeat(auto-fit,minmax(230px,1fr))` white cards, radius 16px, `padding:22px`, numbered `01`–`04` in mono:
  01 PDF in, flipbook out — "Pages, thumbnails and a public URL rendered automatically — usually under a minute."
  02 Design from scratch — "A canvas editor with text, images and shapes. Autosave, undo/redo, templates."
  03 Publish and embed — "A clean public link plus an iframe snippet that fits any site or LMS."
  04 Know what they read — "Views, reading time, per-page drop-off, devices and countries."
- **Pricing** — `#17150F` block, radius 20px: mono `LAUNCH PRICING`, serif `$79` with struck `$348/yr`, "Pay once. Keep it forever.", light CTA `Buy the Lifetime Deal`, "Secure checkout via Paddle · 30-day refund"; right column is a checklist (16px `#243B8E` circles with ✓): Unlimited flipbooks · 20 GB storage · 3,000 pages processed · Canvas editor + templates · Remove Flipbook branding · Analytics and embeds · All future MVP updates.
- **Footer** — 1px top border, © 2026 Flipbook + Features / Pricing / Templates / Privacy / Terms.

---

## Interactions & Behavior

**Navigation (prototype-level):** sidebar nav switches screens; `Create flipbook` → Create; `Edit` / template card / `Open editor` → Editor; eye icon / `Preview` / `See a live example` → Viewer; `Publish` → Viewer; `Share` → Settings with the Share tab preselected; `Site` → Marketing; `Sign out` → Auth; back arrows → Dashboard. In production these are routes: `/dashboard`, `/dashboard/flipbooks/new`, `/dashboard/flipbooks/[id]/editor`, `/f/[slug]`, `/dashboard/flipbooks/[id]/settings|analytics`, `/dashboard/billing`, `/login`, `/`.

**Editor:** clicking an element selects it (outline + handles) and swaps the properties panel; clicking the artboard selects the page; tool rail switches the tool panel; filmstrip selects the active page; `+` appends a page. Adding text or a page flips the save indicator to "Saving…" and back to "Saved" after ~900ms — a stand-in for the real debounced autosave (500–1000ms → `PATCH` document → local snapshot for crash recovery). Undo/redo are wired to selection changes only in the prototype; implement as `past[] / present / future[]` in Zustand covering add, delete, move, resize, rotate, text edit, style change, reorder, duplicate, page create/delete, entirely client-side.

**Viewer:** prev/next step two pages, clamped 2…62. Thumbnails jump to a spread. Real implementation adds keyboard nav (←/→), zoom, fullscreen, deep linking (`/f/slug?page=12`), lazy loading with current+next preload, and a loading state.

**Settings:** tabs, visibility cards, accent/ground swatches and the six switches all write to component state and the preview re-renders immediately. Slug availability should debounce-check server-side.

**Hover states:** secondary buttons and cards → `border-color:#17150F`; primary → `#2C2920`; accent → `#122F93`; table rows → `#FBFAF7`; dashed dropzones and tool-panel items → `#1B45D6`; analytics bars → `#1B45D6`; dark-surface outline buttons → `border-color:#F6F4EF`.

**Motion:** only two — the `fbfade` content entrance (250ms) and a `fbspin` keyframe reserved for processing spinners. Everything else is instant. Keep it that way.

**Layout rules that must survive re-implementation** (each fixed a real overflow bug): all buttons `white-space:nowrap` with `line-height:1.3`; text cells `min-width` + truncation rather than `min-width:0` alone; meter label rows `flex-wrap:wrap` so the bar never collides with wrapped labels; pills and chips `nowrap`; the viewer spread height-driven.

## State Management

Prototype state (all local): `screen`, `tool`, `sel` (`hero|image|shape|none`), `page`, `vpage`, `saved`, `tab`, `auth` (`login|register|forgot`), `accent`, `ground`, `vis`, `sw` (the six branding booleans). Props: `initialScreen` (enum), `emptyState` (boolean), `showQueue` (boolean).

Production mapping per the spec: routes replace `screen`; Zustand holds editor document state (pages, elements, selection, history) separate from server state; branding lives in `Flipbook.settings` JSONB; entitlements resolve server-side (`canUseCanvasEditor`, `canRemoveBranding`, `maxStorage`…) and drive gating; processing status polls `ProcessingJob`.

## Assets

No binary assets. Everything is CSS or inline SVG:
- **Logo**: 26px `#17150F` rounded tile, a 9×13 `#F3F1EC` left page and an 8×13 `#1B45D6` right page skewed `-8deg` — placeholder for a real mark.
- **Icons**: hand-written 16×16 inline SVGs, 1.4–1.8 stroke, `currentColor`-compatible. Replace with the codebase's icon set (Lucide maps cleanly: home, book, layout-grid, image, bar-chart, credit-card, settings, search, plus, eye, chevron-left/right, undo, redo, type, shapes, upload, layers).
- **Google mark**: the official 4-color G, inline.
- **Imagery**: all `linear-gradient(150deg, …)` placeholders, several labeled `IMAGE PLACEHOLDER` in mono.
- **Fonts**: Instrument Sans, Instrument Serif, JetBrains Mono via Google Fonts — self-host with `next/font` in production.

## Gaps (designed vs. not yet designed)

Not in this handoff, and flagged to the user: assets library page · upload progress / validation error / processing / retry screens · the row `···` overflow menu · image crop & fit controls in the editor · Paddle checkout and the entitlement paywall · account settings (profile, password, email, delete) · the six Resend email templates · ARCHIVED state · mobile viewer (single page + swipe) and narrow-width dashboard.

## Files

- `screenshots/` — reference captures of every screen, taken at a ~924px-wide viewport (so they show the responsive/narrow state, not a 1440px desktop):
  `01-dashboard` · `02-create-flipbook` · `03-editor` · `04-viewer` · `05-settings-general` · `06-settings-branding` · `07-settings-share-embed` · `08-analytics` · `09-billing` · `10-auth-login` · `11-auth-register` · `12-marketing-hero` · `13-marketing-pricing`.
  Note: the editor capture is clipped because the editor is designed desktop-first (fixed 64px rail + 236px panel + 520×690 artboard + 250px properties panel ≈ 1200px minimum); open the HTML at ≥1280px to see it whole. The HTML file, not the PNGs, is the measurement source of truth.
- `Flipbook Studio.dc.html` — the full prototype, all nine screens. Markup is in the `<x-dc>` template; interaction logic in the `class Component` script; tweakable props in `data-props`.
- `support.js` — prototype runtime only. **Do not port.**
- `flipbook-saas-spec-driven-development.md` — the original product spec (architecture, data model, API surface, security, roadmap). The source of truth for behavior; this README is the source of truth for visuals.

Open the HTML file directly in a browser to inspect any screen; switch screens via the sidebar, or set the `initialScreen` prop.
