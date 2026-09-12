import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "better-auth/crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { createScriptClient } from "../prisma/client";
import { TEST_DATABASE_URL } from "../tests/reset-test-db";

// Test data helpers: arrange state straight in the test database, act through the UI.

export const EMAIL_OUTBOX_DIR = ".emails-test";
export const TEST_PASSWORD = "e2e-password-123";

const prisma = createScriptClient(TEST_DATABASE_URL);

export type TestUser = { id: string; email: string; password: string; name: string };

/** A brand-new account, isolated from every other test. */
export async function createTestUser({
  plan = "LIFETIME",
  verified = true,
}: { plan?: "FREE" | "LIFETIME"; verified?: boolean } = {}): Promise<TestUser> {
  const id = `usr_e2e_${randomUUID().slice(0, 8)}`;
  const user = { id, name: "Test Author", email: `${id}@e2e.test`, password: TEST_PASSWORD };
  await prisma.user.create({
    data: {
      id,
      name: user.name,
      email: user.email,
      emailVerified: verified,
      accounts: { create: { id: `acc_${id}`, accountId: id, providerId: "credential", password: await hashPassword(TEST_PASSWORD) } },
      ...(plan === "LIFETIME" ? { subscriptions: { create: { plan: "LIFETIME", status: "ACTIVE" } } } : {}),
    },
  });
  return user;
}

/** Copies a seeded flipbook (pages and elements) into the user's account as a private draft. */
export async function cloneFlipbook(sourceId: string, userId: string) {
  const source = await prisma.flipbook.findUniqueOrThrow({
    where: { id: sourceId },
    include: { pages: { include: { elements: true }, orderBy: { pageNumber: "asc" } } },
  });
  const suffix = randomUUID().slice(0, 6);
  const copy = await prisma.flipbook.create({
    data: {
      userId,
      title: source.title,
      slug: `${source.slug}-${suffix}`,
      type: source.type,
      status: "DRAFT",
      visibility: "PRIVATE",
      description: source.description,
      settings: source.settings as Prisma.InputJsonValue,
      thumbnailTint: source.thumbnailTint,
      fileSize: source.fileSize,
      pageCount: source.pageCount,
    },
  });
  for (const page of source.pages) {
    await prisma.page.create({
      data: {
        flipbookId: copy.id,
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        background: page.background as Prisma.InputJsonValue,
        elements: {
          create: page.elements.map((el) => ({
            type: el.type,
            name: el.name,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            opacity: el.opacity,
            zIndex: el.zIndex,
            locked: el.locked,
            visible: el.visible,
            properties: el.properties as Prisma.InputJsonValue,
          })),
        },
      },
    });
  }
  return { id: copy.id, slug: copy.slug };
}

/** Processing jobs queued for a user's flipbook, found by title. */
export async function jobCountFor(userId: string, title: string) {
  return prisma.processingJob.count({ where: { flipbook: { userId, title } } });
}

export async function getFlipbookRow(id: string) {
  return prisma.flipbook.findUnique({ where: { id }, include: { _count: { select: { pages: true } } } });
}

/** Latest email sent to an address (written by src/lib/email when there's no Resend key). */
export async function latestEmail(to: string, subject: RegExp): Promise<{ subject: string; text: string; url: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const raw = await readFile(path.join(EMAIL_OUTBOX_DIR, "outbox.jsonl"), "utf8").catch(() => "");
    const match = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { to: string; subject: string; text: string })
      .reverse()
      .find((email) => email.to === to && subject.test(email.subject));
    if (match) {
      const url = match.text.match(/https?:\/\/\S+/)?.[0];
      if (!url) throw new Error(`No link in email "${match.subject}"`);
      return { ...match, url };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email to ${to} matching ${subject}`);
}
