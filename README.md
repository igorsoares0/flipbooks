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

Log in as **marina@studio.co / flipbook-demo**. She has the Lifetime Deal and 12 demo flipbooks.

**Emails without Resend.** When `RESEND_API_KEY` is empty, verification and password-reset emails are printed to the dev-server console and appended to `.emails/outbox.jsonl`. Open the link from there.

**Google sign-in.** The "Continue with Google" button appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Use `http://localhost:3000/api/auth/callback/google` as the redirect URI.

**Plans.** New accounts start on the free plan. Paddle checkout comes later; until then, grant the Lifetime Deal with:

```bash
npm run grant-ltd -- someone@example.com
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
- `src/editor`: the canvas editor (Zustand store with undo/redo and debounced autosave).
- `src/components/flipbook/page-canvas.tsx`: renders any page at any size (editor, viewer, thumbnails).
- `src/lib/storage`: the S3 client (presigned uploads and downloads, object keys). Files stay private; pages get short-lived signed URLs after the access check.
- `worker/`: the PDF worker. It claims jobs from the `processing_jobs` table (`FOR UPDATE SKIP LOCKED`), renders pages and thumbnails, retries transient failures with backoff, and sweeps stuck jobs and abandoned uploads.
- `prisma/`: schema, migrations, seed and demo content.

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
