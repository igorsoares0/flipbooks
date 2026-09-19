import { hashPassword } from "better-auth/crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/flipbook-rules";
import { createScriptClient } from "./client";
import { demoEvents } from "./seed/analytics";
import { demoFlipbooks, type DemoFlipbook } from "./seed/flipbooks";
import { buildMockPages } from "./seed/pages";
import { DEMO_PASSWORD, DEMO_USERS } from "./seed/users";

// Idempotent demo data: re-running replaces the two demo accounts and everything they own.

const prisma = createScriptClient();

async function createUser(user: { id: string; name: string; email: string }, passwordHash: string) {
  await prisma.user.create({
    data: {
      ...user,
      emailVerified: true,
      accounts: { create: { id: `acc_${user.id}`, accountId: user.id, providerId: "credential", password: passwordHash } },
    },
  });
}

async function createFlipbook(userId: string, fb: DemoFlipbook) {
  const readable = ["DRAFT", "READY", "PUBLISHED"].includes(fb.status) && fb.pageCount > 0;
  const pages = readable ? buildMockPages(fb) : [];

  await prisma.flipbook.create({
    data: {
      id: fb.id,
      userId,
      title: fb.title,
      slug: fb.slug,
      type: fb.type,
      status: fb.status,
      visibility: fb.visibility,
      description: fb.description,
      settings: fb.settings as unknown as Prisma.InputJsonValue,
      thumbnailTint: fb.thumbnailTint,
      fileSize: fb.fileSize,
      error: fb.error,
      pageCount: fb.pageCount,
      viewCount: fb.views ?? 0,
      createdAt: new Date(fb.createdAt),
      updatedAt: new Date(fb.updatedAt),
      publishedAt: fb.publishedAt ? new Date(fb.publishedAt) : null,
    },
  });
  if (pages.length === 0) return;

  await prisma.page.createMany({
    data: pages.map(({ elements: _elements, ...page }) => ({ ...page, background: { ...page.background } })),
  });
  await prisma.element.createMany({
    data: pages.flatMap((page) =>
      page.elements.map((el) => ({ ...el, properties: el.properties as unknown as Prisma.InputJsonValue })),
    ),
  });

  // Readers for published books; viewCount above matches the VIEW events.
  if (fb.status === "PUBLISHED" && fb.views) {
    const events = demoEvents({ id: fb.id, views: fb.views, pageIds: pages.map((p) => p.id) });
    for (let i = 0; i < events.length; i += 5_000) await prisma.analyticsEvent.createMany({ data: events.slice(i, i + 5_000) });
  }
}

async function main() {
  const emails = Object.values(DEMO_USERS).map((u) => u.email);
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await createUser(DEMO_USERS.marina, passwordHash);
  await createUser(DEMO_USERS.other, passwordHash);

  await prisma.subscription.create({
    data: { userId: DEMO_USERS.marina.id, plan: "PRO", status: "ACTIVE", createdAt: new Date("2026-02-14T12:00:00Z") },
  });

  for (const fb of demoFlipbooks) await createFlipbook(DEMO_USERS.marina.id, fb);

  // A second account, for ownership checks: one public book, one private draft.
  const base = { ...demoFlipbooks[7], settings: DEFAULT_SETTINGS, cover: undefined };
  await createFlipbook(DEMO_USERS.other.id, { ...base, id: "fb_theo_pub", slug: "studio-handbook", title: "Studio Handbook" });
  await createFlipbook(DEMO_USERS.other.id, {
    ...base,
    id: "fb_theo_priv",
    slug: "theo-private-notes",
    title: "Private Notes",
    status: "DRAFT",
    visibility: "PRIVATE",
    publishedAt: null,
    views: null,
  });

  const [users, flipbooks, pages, elements, events] = await Promise.all([
    prisma.user.count(),
    prisma.flipbook.count(),
    prisma.page.count(),
    prisma.element.count(),
    prisma.analyticsEvent.count(),
  ]);
  console.info(`Seeded ${users} users, ${flipbooks} flipbooks, ${pages} pages, ${elements} elements, ${events} reader events.`);
  console.info(`Demo login: ${DEMO_USERS.marina.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
