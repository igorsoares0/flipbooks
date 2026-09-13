<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

The product spec is `docs/flipbook-saas-spec-driven-development.md` (in Portuguese) and the design handoff is `docs/design_handoff_flipbook_saas/`. `README.md` covers setup, scripts, code layout and the editor.

- **Don't commit.** The maintainer reviews and commits every change. Report what changed and stop.
- **Language:** code, comments, UI copy, docs and commit messages are in English. The spec stays in Portuguese.
- **Ask before running `npm run test:integration` or `npm run test:e2e`.** Both reset the `flipbook_test` database and empty the `flipbook-test` bucket. Never point them at the dev database `flipbook`. `npm test` (unit) is safe to run anytime.
- **WSL:** the repo lives on `/mnt/c`, where `next dev` misses file changes. Restart the dev server before checking an edit. Run `rm -rf .next/dev` first after anything that touches `.next` (a `next build`, `next typegen`, deleting `.next/dev/types`). A stale `.next/dev` makes existing routes return 404.
- **Data access:** pages read through `src/lib/data`, and every query is scoped to the owner's id. Server actions authenticate, validate with zod (`src/lib/validation.ts`), then check ownership and entitlements. Check capabilities (`canUseCanvasEditor`…), never plan names.
- **Editor:** pages render with HTML through `PageCanvas` (`src/components/flipbook/page-canvas.tsx`), the same component as the viewer. Don't reintroduce Konva; see the Editor section of the README.
- **Files:** storage stays private, and readers get short-lived signed URLs after the access check. Signed URLs (`backgroundImageUrl`, `imageUrl`) are never stored.
