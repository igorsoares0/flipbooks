# Handoff: Flipbook — Editorial Redesign

## Overview
This is a full visual redesign of the Flipbook web app (repo `igorsoares0/flipbooks`, Next.js, Tailwind). It replaces the current look, which reads as AI-generated: beige paper, Instrument Serif everywhere, mono uppercase labels, rounded cards with thin borders on everything. The new look is **modern editorial**: white paper, one ultramarine accent, sharp serif headings, and hairline rules instead of cards.

**Information architecture and behavior do not change.** Routes, data, editor structure (rail → tool panel → canvas + page strip → properties), billing logic and analytics metrics all stay as they are in the repo. This is a re-skin plus a few layout changes, listed in "Structural changes" below.

## About the Design Files
The file in this bundle is a **design reference built in HTML**. It is a mockup showing the intended look, not production code. The task is to **recreate these designs in the existing codebase** (`src/`, Next.js App Router + Tailwind v4 + `globals.css` tokens), using its components (`src/components/ui/*`, `app-shell.tsx`, the editor under `src/editor/*`). Do not ship the HTML.

Open `Flipbook Editorial.dc.html` in a browser. It is a pan/zoom canvas, and every screen is a 1440×900 artboard labelled with its number.

## Fidelity
**High-fidelity.** Colors, type, spacing and radii are final. Copy and sample data (book names, numbers, "−35% after page 9", landing headline) are **placeholders**. Use real data and existing copy wherever the app already has it.

---

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `ink` | `#111111` | Primary text, primary dark button, 1px section rules |
| `ink-2` | `#3A3A3A` | Body / secondary paragraph text |
| `muted` | `#6B6B6B` | Meta text, labels, captions |
| `faint` | `#9A9A9A` | Placeholders, tertiary numbers |
| `line` | `#E6E6E6` | Row dividers, panel borders |
| `line-2` | `#D6D6D6` | Inactive input underlines, outline pill borders |
| `paper` | `#FFFFFF` | App background |
| `canvas` | `#F1F2F4` | Editor canvas background |
| `accent` | `#2B3AE8` | Primary action, active nav, selection, chart highlight |
| `accent-tint` | `#EEF0FF` | Active nav background, selected row, avatar |
| `accent-wash` | `#FAFAFF` | Dropzone background, row hover |
| `success` | `#1F7A4D` | Saved dot, positive deltas, "Live" status |
| `warning` | `#B86E00` | Rendering / saving states |
| `danger` | `#C0392B` | Delete, errors, negative deltas |
| `danger-line` | `#E8C4BF` | Danger outline button border |
| `danger-bg` | `#FDECEA` | Error banner background (text `#8A2A1F`) |
| `reader-bg` | `#1C1C1E` | Public reader background (text `#F2F2F0`, controls border `#3A3A3D`) |

Rule: **only one accent.** No gradients and no tinted cards. Status is shown with a 7px dot, never with a filled badge.

### Typography
Google Fonts: **Newsreader** (opsz 6..72, 400/500, italic 400) and **Schibsted Grotesk** (400/500/600/700).

- **Newsreader**: page titles, book titles, section titles ("Contents", "Usage"), headline numbers, the logo. Nothing interactive.
- **Schibsted Grotesk**: all UI, including nav, buttons, labels, inputs, tables and meta.
- **No mono, no uppercase labels, no letter-spaced eyebrows.**

| Role | Font | Size / line-height / tracking / weight |
|---|---|---|
| Logo | Newsreader italic | 30px / 1 / −0.8px |
| Display (landing H1) | Newsreader | 96px / 0.94 / −3.4px |
| Page title (H1) | Newsreader | 52px / 1 / −1.6px (Billing plan name 64–72px, −2 to −2.4px) |
| Section title | Newsreader | 30px / 1 / −0.8px |
| Panel title (editor, settings) | Newsreader | 24–26px / −0.5 to −0.6px |
| Headline number | Newsreader | 34–40px / 1 / −1 to −1.2px |
| Book title in list | Newsreader | 21px / −0.3px |
| Body large | Grotesk | 15–17px / 1.55 |
| UI default | Grotesk | 13.5–14px |
| Label / accent label | Grotesk 600 | 12.5–13px (accent labels in `#2B3AE8`) |
| Meta | Grotesk | 12–12.5px `#6B6B6B` |

Use `font-variant-numeric: tabular-nums` on every numeric column. Use `text-wrap: balance` on large headings.

### Shape, spacing, elevation
- **Radius:** buttons and segmented controls are full pills (`height/2`). Everything else is **0**, including inputs, dropzones, cards, thumbnails and modals. The only exceptions are nav items and the editor rail at 10px, menu items at 6px, and avatars and swatches (circles).
- **Buttons:** height 36 (editor and dense UI), 40 (default), 42–48 (hero/auth). Padding is 16–20px horizontal, text is 13–14.5px at weight 600. Variants:
  - primary: `#2B3AE8` background, white text;
  - dark: `#111` background, white text;
  - outline: white background, 1px `#111` border;
  - danger: white background, `#C0392B` text, `#E8C4BF` border.
  - Always `white-space: nowrap`.
- **Inputs:** no box. A bottom border only: 1px `#D6D6D6`, or 1.5px `#111` when focused or filled. Height 44, text 15px. The label sits above at 13px weight 600. Hints go top-right at 12.5px (green for valid, e.g. "Available").
- **Toggles:** 36×20 track (`#2B3AE8` on, `#D6D6D6` off) with a 16px white knob.
- **Segmented control:** 1px `#D6D6D6` border, 2px padding, items 26–30px tall. The active item is `#111` with white text.
- **Rules:** sections are separated by **1px `#111`** (strong) or **1px `#E6E6E6`** (rows). There are no cards. Metrics sit in a row between a `#111` top rule and an `#E6E6E6` bottom rule.
- **Spacing:** page padding is 56px horizontal and 44px top (sidebar screens). Common gaps are 8, 10, 12, 16, 20, 24, 28, 40 and 56px.
- **Shadows:** only on "paper" objects:
  - covers: `0 1px 2px rgba(17,17,17,.12), 0 10px 22px rgba(17,17,17,.08)`;
  - editor page: `0 1px 2px rgba(17,17,17,.1), 0 18px 40px rgba(17,17,17,.1)`;
  - menus: `0 1px 2px rgba(17,17,17,.12), 0 16px 36px rgba(17,17,17,.18)`;
  - modal: `0 30px 80px rgba(0,0,0,.3)` over `rgba(17,17,17,.45)`.
- **Icons:** lucide (`lucide-react` in code), 14–18px, black at 0.55–0.6 opacity when inactive and 1 when active.

---

## Structural changes vs. current app
1. **App shell:** a 240px left sidebar replaces the current shell/top nav (see below). Editor and public reader keep a top bar.
2. **Dashboard:** reduced to just the flipbook list. The stat cards grid, the hero and the chart are removed.
3. **Editor:** same structure as today. Only the styling changes, plus new editor states (02b–02j).
4. **Public reader:** keeps the same controls, plus an optional "Contents" dropdown (new and optional; it needs spread titles, which don't exist in the data model yet. Skip it if out of scope).

---

## Screens

### Sidebar (shared by 01, 03, 04, 06, 07, 09–11, 13–15)
- Width 240px, `border-right: 1px #E6E6E6`, padding `26px 16px 20px`, flex column.
- Logo "Flipbook": Newsreader italic 30px, with 10px left inset.
- "New flipbook" button: dark pill, 40px tall, full width, 26px top margin, with a `plus` icon.
- Nav (22px top margin, 2px gap): items are 38px tall, 12px padding, 10px radius, 12px icon gap, 14px text.
  - Order: Dashboard, Flipbooks (count right-aligned, 12px `#9A9A9A`), Templates, Assets, Analytics, Billing, Settings.
  - Active: `#EEF0FF` background, `#2B3AE8` text, weight 600, icon at full opacity.
  - Hover: `#F5F5F7`.
- Bottom block (pushed down with `margin-top:auto`):
  - Storage row: "Storage" and "2.4 of 20 GB", over a 3px bar (`#E6E6E6` track, `#2B3AE8` fill).
  - User row (16px top padding, `#E6E6E6` rule above): 32px avatar circle (`#EEF0FF` background, `#2B3AE8` initials), name at 13.5px weight 600, plan at 12px muted.

### 01 Dashboard — `src/app/dashboard/(shell)/page.tsx`, `flipbook-table.tsx`
- Content padding 44px/56px.
- Header row: "Contents" (section title), then filter tabs at 13.5px with a 16px gap ("All 12", "PDF 7", "Canvas 5", "Drafts 3"). The active tab is `#2B3AE8` weight 600 with a 1.5px underline.
- Table header: 12px muted, `border-bottom: 1px #111`, 8px padding.
- Grid columns: `44px | 1fr | 140px | 90px | 110px`, 18px gap. Columns: cover, title, status, views (right), updated (right).
- Rows: 62px tall, 1px `#E6E6E6` bottom rule, hover `#FAFAFF`.
  - Cover thumbnail: 34×45 with the cover shadow.
  - Title: Newsreader 21px, ellipsized.
  - Status: 7px dot plus 13px label. Live `#1F7A4D`, Draft `#BDBDBD`, Ready `#2B3AE8`, Rendering `#B86E00` ("Rendering 62%").
  - Views: 14px tabular. Updated: 13px muted.
- **Empty / new-account state** (prop `newAccount`):
  - "Welcome, Marina" accent label above H1 "Your first issue *starts here.*" (the italic part in accent).
  - Body 16.5px; buttons "Upload a PDF" (primary) and "Start from a template" (outline).
  - Two dashed placeholder covers (1.5px dashed `#BDBDBD` / `#D6D6D6`) with "Free plan · 3 flipbooks, 15 pages each".

### 02 Editor — `src/editor/components/*`
Full screen, flex column.
- **Top bar** (60px, `border-bottom 1px #111`, 20px padding, 16px gap):
  - Back button: 34px circle outline.
  - Title in Newsreader 24px, then a type tag ("Canvas"/"PDF": 11.5px weight 600, 3×9px padding, `#F1F2F4` background, 10px radius).
  - Menus "File / Edit / View" at 13.5px, then a 1px divider.
  - Undo and redo as 34px circle outlines (redo at 0.3 opacity when unavailable).
  - Right side: save status, "Preview" (outline), "Publish" (primary). Both buttons are 36px.
  - Save status is a 6px dot plus 12.5px text: "Saved" (`#1F7A4D`), "Saving…" (`#B86E00`), "Not saved" (`#C0392B`, weight 600).
- **Tool rail** (72px, right border `#E6E6E6`): items are 60×56 with 10px radius, an 18px icon over an 11px label. Order: Text, Shapes, Uploads, Elements, Photos, Layers. The active item uses `#EEF0FF` and `#2B3AE8`.
- **Tool panel** (260px, padding `20px 20px 0`, 12px gap): title in Newsreader 24px.
  - Text: three boxes ("Add a heading" in Newsreader 26px, "Add a subheading" in Grotesk 16px weight 600, "Add body text" at 13px), each with a 1px `#D6D6D6` border and square corners.
  - Shapes: 3-column grid of 1:1 tiles (1px `#E6E6E6`, 16px padding), black shapes inside.
  - Uploads: dropzone (1.5px dashed `#2B3AE8` on `#FAFAFF`), an in-progress upload row with a 3px progress bar, then a 2-column grid of square thumbnails. The selected thumbnail has a 2px `#2B3AE8` ring.
  - Elements: search (underline input) plus a 4-column icon grid.
  - Photos: search, category chips (26px pills with 1px `#D6D6D6`, wrapping) and a 2-column masonry grid.
  - Layers: "Page 5 · drag to reorder", then rows 44px tall with icon, name (ellipsis) and eye/lock icons. The selected row gets `#EEF0FF` with a 3px inset left bar in `#2B3AE8`.
- **Canvas:** `#F1F2F4` background with the page centred (420×560 at the shown zoom, page shadow).
- **Selection:**
  - 1.5px `#2B3AE8` outline at a 7px offset, with 8×8 square handles at the corners.
  - A floating toolbar sits 58px above: 42px tall, `#111` pill, 21px radius, shadow `0 10px 24px rgba(17,17,17,.25)`.
    - Text: font select (Newsreader 14px on `#2A2A2A`), size box, bold, italic, align, color dot, separated by 1px `#3A3A3A` dividers.
    - Image: Replace, Crop, Duplicate, Delete.
- **Page strip** (under the canvas only; 118px, top border `#E6E6E6`, white): page thumbnails 48×64 with the number below at 11.5px.
  - Active page: 2px `#2B3AE8` ring, number in accent weight 700.
  - The last tile is "+ Add" (1.5px dashed `#BDBDBD`).
  - Right-click or "···" opens the **page menu** (02g): 200px wide, items 36px tall — Duplicate page, Add page after, Move left, Move right, then "Delete page" in red below a divider.
- **Properties** (280px, left border `#E6E6E6`, 13.5px):
  - Header: Newsreader 24px name, subtitle "Text on page 5", and a type tag.
  - Groups have 16×22px padding with an `#E6E6E6` rule. Group titles are 12.5px weight 600 in accent.
  - Fields are label/value pairs on an underline (1px `#D6D6D6`), in a 2-column grid with 12×16px gaps.
  - Text selected: Position & size (X/Y/W/H); Transform (Rotation and Opacity sliders: 2px track, `#111` fill, 14px white knob with a 1.5px `#111` border); Typography (font select with an underline, Size and Leading, Left/Center/Right segmented control, colour swatches 26px with the selected one ringed in accent, plus the hex value).
  - Footer: Duplicate (outline) and Delete (danger), each `flex:1`.
  - Image selected: Position & size, Transform, Image (Replace, Crop, then Fill/Fit/Stretch segmented control), footer.
  - Nothing selected: "Page 5": Background swatches, "Apply to all pages" link, Book (Size, Pages).
  - PDF page: a lock note ("The page is a fixed background. Add text, images, shapes and links on top of it."), "Replace PDF", and the list of overlay elements.
- **02h Save failed:** a 44px banner under the top bar (`#FDECEA` background, `#8A2A1F` text, `cloud-off` icon) reading **"Couldn't save your last changes."** plus explanation and "Retry now" (underlined, bold). The status shows "Not saved".
- **02i Restore:** modal 480px wide, 30×32px padding, square corners, over a `rgba(17,17,17,.45)` scrim. Accent label "Unsaved changes found", Newsreader 34px "Restore your last edits?", 14px body text, buttons "Keep saved version" (outline) and "Restore changes" (primary). Ties to the existing local draft-recovery logic.
- **02j PDF flipbook:** same chrome with the "PDF" tag. Overlay link areas are drawn as a 1.5px dashed `#2B3AE8` box on `rgba(43,58,232,.08)`.

### 03 New flipbook — `flipbooks/new/page.tsx`, `pdf-dropzone.tsx`, `template-gallery.tsx`
- H1 "A new flipbook", with a short line of body text to its right.
- Two equal panels side by side with no gap:
  - Left, "From a PDF": 1.5px dashed `#2B3AE8` on `#FAFAFF`. Title "Drop a PDF anywhere on this box." in Newsreader 30px, the plan limits, and a "Choose file" primary button.
  - Right, "From scratch": 1px `#111` border with the left side removed. "Open a blank book in the editor." and an "Open editor" outline button.
- "Templates" section title with category tabs (All, Magazines, Catalogs, Business, Brochures, Portfolios, Reports, Marketing).
- Template grid: 8 columns of 3:4 covers (cover shadow, hover ring 2px `#2B3AE8`), name at 13.5px weight 600 and "N pages" at 12px muted.

### 04 Analytics — `flipbooks/[id]/analytics/page.tsx`
- Public URL meta, H1 with the book name, and a period segmented control (30 days / 90 days / All time) on the right.
- Metric row: 6 columns between rules. Each has a 12.5px label, the value in Newsreader 40px, and a delta in green or red at weight 600 ("+18% vs previous").
- Left (1.7fr), "Views per page": bars in `#111` with a 260px chart height and the x-axis on a 1px `#111` rule. The biggest drop-off bar is in accent, with an annotation: a 1px accent rule plus "−35% after page 9" in Newsreader 22px accent and a 12.5px suggestion. The annotation is computed from the largest drop between consecutive pages.
- Right: Devices as one 10px stacked bar (desktop `#111`, mobile `#2B3AE8`, tablet `#BDBDBD`) with a legend; Top countries as a ruled list with tabular numbers.

### 05 Public reader — `src/components/viewer/viewer.tsx`
- Dark `#1C1C1E` background.
- Top bar (60px): brand logo (20px), title in Newsreader 18px, author at 11.5px, the optional "Contents ▾" pill. Right side: Zoom, PDF, Fullscreen as ghost pills with icons, and "Share" as a light pill (`#F2F2F0` on `#111`).
- Spread centred with shadow `0 30px 80px rgba(0,0,0,.55)`. Prev/next are 46px circle outlines.
- Bottom (84px): a progress strip with one 6px tick per spread (current one taller and light), then "4–5 of 64" and "Made with *Flipbook*" (hidden on Pro).

### 06 / 09 / 10 Flipbook settings — `flipbook-settings.tsx`
- Breadcrumb "Flipbooks / Settings", H1 with the book name, "Preview" and "Open editor" buttons.
- Tabs: General, Branding, Share & embed. The active tab is accent with a 2px inset bottom bar; "Saved" status sits on the right.
- Two columns: form (1fr) plus a 400px "What readers see" live preview (a mini reader on the reader background).
  - **General:**
    - Fields: Title; Public address (prefix `flipbook.co/f/` in faint grey, availability hint); Description (62 / 200 counter).
    - "Who can read it": three option tiles (Public / Unlisted / Private), selected tile with a 1.5px `#111` border.
    - Danger row: "Delete flipbook" with a danger button.
  - **Branding:**
    - Accent colour and Reader background swatches (32px).
    - "Reader controls" toggles: logo, share, PDF download, fullscreen, thumbnail strip, "Made with Flipbook" (Pro).
  - **Share & embed:**
    - Public link field with a "Copy link" primary button, and share target chips.
    - Embed code block (`#111` background, mono 12.5px; this is the only place mono is allowed) with "Copy code" and "WordPress shortcode".
    - Link preview card.

### 07 / 11 Billing — `billing/page.tsx`, `plan-picker.tsx`, `lib/billing/catalog.ts`
- **Pro:**
  - Accent label "Current plan", H1 "Pro, *yearly*" at 72px, "$180 a year. Renews on …".
  - "Switch to monthly" and "Manage subscription" buttons.
  - Usage: 3 meters (value in Newsreader 36px, "of X" at 18px muted, 3px accent bar).
  - "Included": feature list in a 3-column ruled grid with check icons.
  - Paddle note.
- **Free:**
  - H1 "Free" with a usage line, and a Monthly/Yearly segmented control ("save 32%").
  - Two columns under a `#111` rule: Free (white) and Pro (solid `#2B3AE8`, white text, rows ruled with `rgba(255,255,255,.18)`).
  - "Upgrade to Pro · $180/year" as a white pill with accent text.
  - Prices and limits must come from `catalog.ts`.

### 08 / 12 Log in / Register — `(auth)/layout.tsx`, `auth-form.tsx`
- 50/50 split.
- Left: logo top, form block max-width 380px centred vertically, terms note at the bottom.
  - Form: H1 52px, "Continue with Google" (outline with `#D6D6D6`), an "or" divider, underline inputs, a full-width dark pill (48px), and a switch link in accent.
- Right: solid `#2B3AE8` panel showing a rotated (−2°) open-book mock and a Newsreader 38px statement in white.

### 13 Assets — `assets/page.tsx`, `asset-library.tsx`
- H1 plus a one-line description, with the count/size on the right.
- 92px dropzone strip (dashed accent) with "Choose files".
- 5-column grid of 4:3 images, each with filename (ellipsis), "W×H · size" meta and a trash icon at 0.4 opacity.

### 14 Templates — `templates/page.tsx`
- H1, category tabs, then a 5-column grid of 3:4 covers (same pattern as 03).

### 15 Account settings — `account-settings.tsx`
- H1 "Settings", then sections in a two-column layout (280px description | fields), separated by a 1px `#E6E6E6` top rule:
  - Profile (Name, "Save" dark button);
  - Email (two-step note, "currently …" hint);
  - Password ("signs you out everywhere else");
  - Delete account: red title, `#E8C4BF` rule, "Type DELETE to confirm" field, danger button.

### 16 Landing — `(marketing)/page.tsx`, `site-chrome.tsx`
- Header (76px, `#111` rule): logo, Features / Pricing / Templates, "Log in", and a "Start free" dark pill.
- Hero (two columns):
  - Accent label "Free plan · no card needed".
  - Display H1 "Your PDF, *turned into* a book people finish." (placeholder copy).
  - Body 19px, two 52px CTAs, and a pricing note.
  - Right: a reader mock on `#1C1C1E`.
- Features: 4 columns, each with a `#111` top rule, a "01" number, a Newsreader 30px title and 15px body.
- Analytics section: a 60px H2 and a bar chart with the drop-off highlighted.
- Pricing: same two-column Free/Pro block as Billing.
- Footer with links (Features, Pricing, Templates, Terms, Privacy, Refunds).

---

## Interactions & Behavior
- **Hover:** table rows go to `#FAFAFF`; nav items to `#F5F5F7`; cover tiles get a 2px `#2B3AE8` ring. Buttons darken about 6% (not shown in mocks; use `color-mix(in oklch, <bg>, black 6%)`).
- **Focus:** 2px `#2B3AE8` outline with a 2px offset on all interactive elements. Inputs switch their underline to 1.5px `#111`.
- **Transitions:** 120–160ms ease-out on background, color and box-shadow. No bouncy motion, no fades on layout.
- **Editor:**
  - The floating toolbar follows the selection and flips below it if there is no room above.
  - The save status cycles Saved → Saving… → Saved, or Not saved plus the banner after a failed retry.
  - The restore modal appears on load when a local draft is newer than the server version.
- **Analytics:** the drop-off annotation goes on the largest negative step between consecutive pages. Hide it if the drop is under 15%.
- **Dashboard:** the filter tabs filter the list client-side. The new-account state shows when the user has 0 flipbooks.

## State
Nothing new beyond existing app state, except:
- the editor's `saveStatus: 'saved' | 'saving' | 'error'`;
- `hasLocalDraft` for the restore modal;
- the selected page index for the page menu;
- the optional `spreadTitle` per spread, only if the reader "Contents" dropdown is implemented.

## Assets
- Icons: lucide (`lucide-react`). Fonts: Google Fonts, Newsreader and Schibsted Grotesk.
- Cover colors, photos and page contents in the mocks are placeholders. There are no image assets to ship.
- The mocks contain no brand logos besides the "Flipbook" wordmark, which is just Newsreader italic text.

## Files
- `Flipbook Editorial.dc.html`: all screens (01–16 plus editor states 02b–02j). Open it in a browser and pan/zoom.
