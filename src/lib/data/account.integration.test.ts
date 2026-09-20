import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { head, keys, putObject } from "@/lib/storage";
import { purgeAccount } from "./account";
import * as mutations from "./flipbook-mutations";
import * as repo from "./flipbooks";

// Closing an account, against the test database and bucket. Paddle isn't configured here,
// so cancelling is skipped; the webhook suite covers the subscription side.

const LEAVING = "usr_account_leaving";
const STAYING = "usr_account_staying";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [LEAVING, STAYING] } } });
  await prisma.user.create({ data: { id: LEAVING, name: "Leaving", email: "leaving@test.local" } });
  await prisma.user.create({ data: { id: STAYING, name: "Staying", email: "staying@test.local" } });
});

afterAll(() => prisma.$disconnect());

describe("purging an account", () => {
  it("removes the files of every flipbook and the image library, and leaves other accounts alone", async () => {
    const mine = await mutations.createFlipbook(LEAVING);
    const other = await mutations.createFlipbook(STAYING);
    const myPage = keys.page(mine.id, 1);
    const myAsset = keys.asset(LEAVING, "a".repeat(32), "png");
    const theirPage = keys.page(other.id, 1);
    await Promise.all([
      putObject(myPage, Buffer.from("page"), "image/webp"),
      putObject(myAsset, Buffer.from("image"), "image/png"),
      putObject(theirPage, Buffer.from("page"), "image/webp"),
    ]);

    expect(await purgeAccount(LEAVING)).toEqual({ flipbooks: 1 });
    expect(await head(myPage)).toBeNull();
    expect(await head(myAsset)).toBeNull();
    expect(await head(theirPage)).not.toBeNull();

    // The rows go when Better Auth deletes the user; the cascade takes everything with it.
    await prisma.user.delete({ where: { id: LEAVING } });
    expect(await repo.getOwnedFlipbook(LEAVING, mine.id)).toBeNull();
    expect(await prisma.page.count({ where: { flipbookId: mine.id } })).toBe(0);
    expect(await prisma.asset.count({ where: { userId: LEAVING } })).toBe(0);
    expect(await repo.getOwnedFlipbook(STAYING, other.id)).not.toBeNull();
  });

  it("works for an account with nothing in it", async () => {
    expect(await purgeAccount(STAYING + "_missing")).toEqual({ flipbooks: 0 });
  });
});

describe("listing pages of flipbooks", () => {
  it("returns the right slice and total, and counts only matching titles", async () => {
    const owner = "usr_account_pager";
    await prisma.user.deleteMany({ where: { id: owner } });
    await prisma.user.create({ data: { id: owner, name: "Pager", email: "pager@test.local" } });
    for (let i = 0; i < 5; i++) await mutations.createFlipbook(owner);

    const [firstPage, secondPage] = await Promise.all([
      repo.listFlipbooks(owner, { take: 3 }),
      repo.listFlipbooks(owner, { take: 3, skip: 3 }),
    ]);
    expect(firstPage).toHaveLength(3);
    expect(secondPage).toHaveLength(2);
    expect(new Set([...firstPage, ...secondPage].map((fb) => fb.id)).size).toBe(5);
    expect(await repo.countFlipbooks(owner)).toBe(5);
    expect(await repo.countFlipbooks(owner, "untitled")).toBe(5);
    expect(await repo.countFlipbooks(owner, "nothing here")).toBe(0);
  });
});
