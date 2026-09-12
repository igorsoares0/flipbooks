# Flipbook

A SaaS for turning PDFs into flipbooks, or designing them from scratch, then publishing, embedding and measuring them.

- Product spec: [`docs/flipbook-saas-spec-driven-development.md`](docs/flipbook-saas-spec-driven-development.md)
- Design handoff: [`docs/design_handoff_flipbook_saas/`](docs/design_handoff_flipbook_saas/README.md)

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Better Auth · Prisma 7 on Postgres (Neon in production) · Zustand · Resend.

## Local setup

You need Node 24 and Docker.

```bash
npm install                 # also generates the Prisma client
cp .env.example .env.local  # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up               # Postgres 17 in Docker on localhost:5433
npm run db:migrate          # apply migrations
npm run db:seed             # demo workspace
npm run dev                 # http://localhost:3000
```

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
| `npm run lint` | ESLint |
| `npm run db:up` / `db:down` | Start or stop the local Postgres container |
| `npm run db:migrate` | Create and apply migrations (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Replace the demo accounts and their data |
| `npm run db:reset` | Drop and re-create the dev database (destructive) |
| `npm run db:studio` | Browse the data in Prisma Studio |

## Tests

| Command | Needs | Covers |
|---|---|---|
| `npm test` | nothing | Unit and component tests (Vitest + Testing Library) |
| `npm run test:integration` | `npm run db:up` | Repositories, ownership and autosave against a real Postgres |
| `npm run test:e2e` | `npm run db:up` | Playwright against a production build |
| `npm run test:all` | `npm run db:up` | Lint, types, then all of the above |

The integration and e2e suites **reset the `flipbook_test` database** before each run. It is separate from the dev database `flipbook`. To aim them elsewhere, set `TEST_DATABASE_URL`, but never at a database you care about.

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
- `prisma/`: schema, migrations, seed and demo content.

## Deploying (Neon)

Set `DATABASE_URL` to Neon's **pooled** connection string and `DIRECT_URL` to the **direct** one (used by migrations). Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public origin, plus `RESEND_API_KEY` and `EMAIL_FROM`. Run `npm run db:deploy` on release.
