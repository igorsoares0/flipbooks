# Flipbook

A SaaS for turning PDFs into flipbooks, or designing them from scratch, then publishing, embedding and measuring them.

- Product spec: [`docs/flipbook-saas-spec-driven-development.md`](docs/flipbook-saas-spec-driven-development.md)
- Design handoff: [`docs/design_handoff_flipbook_saas/`](docs/design_handoff_flipbook_saas/README.md)

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Better Auth · Prisma 7 on Postgres (Neon in production) · S3-compatible storage (MinIO locally, Cloudflare R2 in production) · a PDF worker (pdf.js + sharp) · Zustand · Resend.

## Local setup

You need Node 24 and Docker.

```bash
npm install                 # also generates the Prisma client
cp .env.example .env.local  # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up               # Postgres on :5433 and MinIO on :9000 (console :9001), with buckets
npm run db:migrate          # apply migrations
npm run db:seed             # demo workspace
npm run dev:all             # app on http://localhost:3000 + the PDF worker
```

`npm run dev:all` runs `next dev` and `npm run worker` together. Without the worker, uploaded PDFs stay on "Processing". The MinIO console at http://localhost:9001 (flipbook / flipbook-secret) shows the stored files.

Log in as **marina@studio.co / flipbook-demo**. She is on Pro and has 12 demo flipbooks with seeded readers.

**Emails without Resend.** When `RESEND_API_KEY` is empty, verification and password-reset emails are printed to the dev-server console and appended to `.emails/outbox.jsonl`. Open the link from there.

**Google sign-in.** The "Continue with Google" button appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Use `http://localhost:3000/api/auth/callback/google` as the redirect URI.

**Plans.** New accounts start on Free. See [Billing](#billing) to test checkout, or grant Pro by hand (comps, support):

```bash
npm run grant-pro -- someone@example.com
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | The PDF worker: renders uploaded PDFs into page images |
| `npm run dev:all` | `next dev` and the worker in one terminal |
| `npm run lint` | ESLint |
| `npm run db:up` / `db:down` | Start or stop local Postgres and MinIO |
| `npm run db:migrate` | Create and apply migrations (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Replace the demo accounts and their data |
| `npm run db:reset` | Drop and re-create the dev database (destructive) |
| `npm run db:studio` | Browse the data in Prisma Studio |

## Tests

| Command | Needs | Covers |
|---|---|---|
| `npm test` | nothing | Unit and component tests (Vitest + Testing Library) |
| `npm run test:integration` | `npm run db:up` | Repositories, ownership, autosave and the PDF pipeline against real Postgres and MinIO |
| `npm run test:e2e` | `npm run db:up` | Playwright against a production build, with the worker running |
| `npm run test:all` | `npm run db:up` | Lint, types, then all of the above |

The integration and e2e suites **reset the `flipbook_test` database and empty the `flipbook-test` bucket** before each run. Both are separate from the dev database `flipbook` and bucket `flipbook`. To aim them elsewhere, set `TEST_DATABASE_URL` / `TEST_S3_ENDPOINT` / `TEST_S3_BUCKET`, but never at anything you care about.

The e2e suite builds the app and starts its own server on port 3100, pointed at the test database. It never reuses a running server. Useful switches:
- `E2E_DEV=1` runs against `next dev` instead of a production build.
- `E2E_WORKERS=n` sets the number of parallel browsers (4 by default).

## How the code is organized

- `src/app`: routes. `(marketing)`, `(auth)`, `dashboard/(shell)` (sidebar layout), `dashboard/(editor)` (full-bleed), `f/[slug]` (public viewer), `embed/[id]`, `api/auth`.
- `src/lib/data`: the only place pages read data from. `index.ts` resolves the signed-in user; `flipbooks.ts` and `flipbook-mutations.ts` take an explicit owner id and scope every query to it.
- `src/lib/actions`: server actions. Each one authenticates, validates with zod (`src/lib/validation.ts`), then checks ownership and the plan.
- `src/lib/auth`: Better Auth config, session helpers, safe post-login redirects. `src/proxy.ts` does only an optimistic cookie check.
- `src/lib/entitlements`: what each plan can do. Code checks capabilities (`canUseCanvasEditor`…), never plan names.
- `src/editor`: the canvas editor (see [Editor](#editor)).
- `src/components/flipbook/page-canvas.tsx`: renders any page at any size (editor, viewer, thumbnails).
- `src/lib/storage`: the S3 client (presigned uploads and downloads, object keys). Files stay private; pages get short-lived signed URLs after the access check.
- `worker/`: the PDF worker. It claims jobs from the `processing_jobs` table (`FOR UPDATE SKIP LOCKED`), renders pages and thumbnails, retries transient failures with backoff, and sweeps stuck jobs, abandoned uploads and image files that never made it into a library.
- `prisma/`: schema, migrations, seed and demo content.

## Editor

The canvas editor renders pages with HTML, not Konva as the spec first suggested. It uses `PageCanvas`, the same component as the viewer, embeds and thumbnails, so what you see while editing is exactly what readers get, down to where text wraps. Konva draws text on a canvas with its own line breaking, which would never quite match the reader's HTML. Inline text editing with `contentEditable` also comes for free.

- `state/editor-store.ts`: the document, selection, zoom and upload progress in one Zustand store per editor. A drag is one undo step (`beginGesture`/`endGesture`). Typing in a property field merges into one step. Every change is autosaved after 800 ms. Saves are versioned, so a slow response never marks newer edits as saved.
- `state/recovery.ts`: every edit is also kept in `localStorage` until the server confirms it. If a tab closes or saves keep failing, the next visit offers to restore the edits.
- `geometry.ts`: pure resize, rotate and snap math, in page units and independent of zoom.
- `components/transform-layer.tsx`: the selection frame, handles and snap guides, drawn over the page.
- `text/runs.ts`: converts between stored text runs and the editing HTML. Only text, italic and line breaks survive, so no HTML is ever stored.

Pictures come from the user's library (`/dashboard/assets`). The browser uploads them straight to storage under `assets/{userId}/`. The server then checks the key's owner, the real file type from its first bytes, the size and the pixel dimensions. Autosave refuses any picture that isn't in the caller's own library.

Keyboard shortcuts:

| Keys | Action |
| --- | --- |
| Double-click, or Enter | Edit the selected text |
| Ctrl+I (while editing) | Italic |
| Esc | Stop editing, then clear the selection |
| Arrows / Shift+arrows | Nudge 1 / 10 units |
| Shift+click | Add to or remove from the selection |
| Ctrl+C / Ctrl+V / Ctrl+D | Copy / paste / duplicate |
| Delete | Delete the selection |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Ctrl+= / Ctrl+- / Ctrl+0 | Zoom in / out / fit |
| Shift while resizing / rotating | Toggle keeping proportions (on by default for pictures) / 15° steps |
| Alt while dragging | Don't snap |
| Alt+←/→ on a page thumbnail | Move the page |

## Billing

Two plans (`src/lib/entitlements/index.ts`, prices in `src/lib/billing/catalog.ts`):

| | Free | Pro |
|---|---|---|
| Price | $0 | US$22/month or US$180/year |
| Flipbooks | 3 | 100 |
| Pages per flipbook | 15 | 300 |
| PDF size | 20 MB | 100 MB |
| Storage | 500 MB | 20 GB |
| Views a month (soft, never blocked) | 1,000 | 250,000 |
| Editor, templates, image uploads | ✓ | ✓ |
| No badge, custom address, analytics, reader PDF download | — | ✓ |

Paddle is the merchant of record: it runs checkout, taxes, receipts and the customer portal.
- **Checkout.** The server creates the transaction with the account's id (`startCheckout` in `src/lib/actions/billing.ts`), and Paddle.js opens it.
- **Plan changes.** They arrive by webhook at `/api/paddle/webhook`. Each one is signature-checked, applied once (`paddle_events`), and never over a newer event.
- **Downgrades.** Content is kept. Paid-only settings (badge, downloads) fall back to Free defaults, and books over the page limit stay editable but can't grow.

To test locally with the sandbox:

1. Fill the `PADDLE_*` variables in `.env.local` (see `.env.example`; the sandbox product "Flipbook Pro" and its two prices already exist).
2. Expose the app: `cloudflared tunnel --url http://localhost:3000`.
3. In the sandbox dashboard, add a notification destination at `<tunnel URL>/api/paddle/webhook` for the `subscription.*` events, and put its secret in `PADDLE_WEBHOOK_SECRET`.
4. Upgrade from `/dashboard/billing` with a [test card](https://developer.paddle.com/concepts/payment-methods/credit-debit-card#test-payment-method) (4242 4242 4242 4242, any future date, CVC 100).

The legal pages (`/terms`, `/privacy`, `/refunds`) are drafts. Fill in the `[PLACEHOLDERS]` in `src/components/marketing/legal-page.tsx` and have them reviewed before launch; Paddle checks them when approving the domain.

## Accounts

`/dashboard/settings` covers the profile, how people sign in, and closing an account.
- **Email changes** take two steps for verified accounts: confirm from the current address, then verify the new one. Unverified accounts just verify the new address.
- **Password changes** sign the account out everywhere else. Accounts created through Google are offered a link to set a password instead.
- **Deleting an account** is confirmed by an emailed link. `purgeAccount` (`src/lib/data/account.ts`) then cancels any Paddle subscription and deletes the flipbooks' files and the image library from storage; the database cascade removes the rows. Public links and embeds stop working, and it can't be undone.

## Share previews

Every public flipbook renders its own preview image at `/f/<slug>/opengraph-image` (also used for X), and the site has one at `/opengraph-image`. The card shows the title, description, address and page count, plus the rendered cover for books made from a PDF. Books that aren't published and public fall back to the generic card, so nothing private leaks. The heading uses `public/fonts/InstrumentSerif-Regular.ttf` (OFL); without that file the built-in font is used.

## Limits

Beyond the plan limits, public endpoints are rate limited in memory (`src/lib/rate-limit.ts`): reader events 120 a minute per IP, PDF downloads 60 a minute per IP, and uploads 30 an hour per account. Sign-in has its own limiter inside Better Auth. These counters live in the process, which suits the single-container deployment; several instances would need the Redis step from the spec (§5.5).

## Analytics

The public viewer and embeds send reader events to `/api/analytics/events`: a view per visit, each page seen with the time spent on it, shares and downloads.
- **Collected on every plan**, so upgrading to Pro shows past readers.
- **Not counted:** owners previewing their own books, bots, and a second view from the same tab within 30 minutes.
- **No cookies, no IP addresses.** A random id per tab groups a visit, and unique readers come from a daily salted hash (`ANALYTICS_SALT`).
- **Countries** appear when the app runs behind Cloudflare or Vercel, which send the visitor's country in a header.

## Deploying

**Database (Neon).** Set `DATABASE_URL` to Neon's **pooled** connection string and `DIRECT_URL` to the **direct** one (used by migrations). Run `npm run db:deploy` on release.

**App.** Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public origin, plus `RESEND_API_KEY` and `EMAIL_FROM`.

**Storage (Cloudflare R2).**
1. Create a bucket, and an R2 API token with read and write access to it.
2. Set `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=false`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, for both the app and the worker.
3. Add a CORS rule to the bucket so browsers can upload: allow `PUT` and `GET` from your app origin, with the `Content-Type` header.

**Worker.** Build and run the container with the same environment as the app:

```bash
docker build -f worker/Dockerfile -t flipbook-worker .
docker run --env-file .env.production --memory=1g flipbook-worker
```

It needs `DATABASE_URL`, the `S3_*` variables, `BETTER_AUTH_URL` (for links in emails) and the email settings. `WORKER_CONCURRENCY` sets how many PDFs one container renders at once. To scale, run more containers; they never pick the same job.
