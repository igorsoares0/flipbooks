import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { head, keys, putObject } from "@/lib/storage";
import type { ImageElement, Page } from "@/lib/types";
import { documentSchema } from "@/lib/validation";
import * as assets from "./assets";
import * as mutations from "./flipbook-mutations";
import * as repo from "./flipbooks";

// Runs against flipbook_test and the test bucket (tests/integration-setup.ts), with its own
// accounts so the demo data other suites count stays untouched.
const PRO = "usr_assets_ltd"; // Lifetime Deal
const FREE_USER = "usr_assets_free"; // free plan

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [PRO, FREE_USER] } } });
  await prisma.user.create({
    data: { id: PRO, name: "Assets Pro", email: "assets-ltd@test.local", subscriptions: { create: { plan: "LIFETIME" } } },
  });
  await prisma.user.create({ data: { id: FREE_USER, name: "Assets Free", email: "assets-free@test.local" } });
});

afterAll(() => prisma.$disconnect());

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();

/** Asks for an upload, then "uploads" the bytes the way the browser would. */
async function uploaded(userId: string, body: Buffer, contentType: assets.ImageType = "image/png") {
  const created = await assets.createAssetUpload(userId, await repo.getEntitlements(PRO), { size: body.length, contentType });
  if (!created.ok) throw new Error(created.error);
  await putObject(created.key, body, contentType);
  return created.key;
}

async function registered(userId: string, width = 400, height = 200) {
  const key = await uploaded(userId, await png(width, height));
  const result = await assets.registerAsset(userId, await repo.getEntitlements(PRO), { key, filename: "photo.png" });
  if (!result.ok) throw new Error(result.error);
  return result.asset;
}

function imageElement(pageId: string, assetKey: string): ImageElement {
  return {
    id: `el_img_${Math.random().toString(36).slice(2, 8)}`,
    pageId,
    name: "Photo",
    x: 10,
    y: 10,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 9,
    locked: false,
    visible: true,
    type: "IMAGE",
    properties: { assetKey, fit: "cover", placeholder: { from: "#D9D3C5", to: "#C3BCAA", label: "IMAGE", labelPosition: "center" } },
  };
}

const withImage = (pages: Page[], assetKey: string) =>
  documentSchema.parse([{ ...pages[0], elements: [...pages[0].elements, imageElement(pages[0].id, assetKey)] }, ...pages.slice(1)]);

describe("starting an image upload", () => {
  it("hands out a key under the user's own folder", async () => {
    const result = await assets.createAssetUpload(PRO, await repo.getEntitlements(PRO), { size: 1000, contentType: "image/webp" });
    expect(result.ok && result.key).toMatch(new RegExp(`^assets/${PRO}/[0-9a-f]{32}\\.webp$`));
  });

  it("refuses the free plan and files over 15 MB", async () => {
    const free = await assets.createAssetUpload(FREE_USER, await repo.getEntitlements(FREE_USER), { size: 1000, contentType: "image/png" });
    expect(free).toEqual({ ok: false, error: "Image uploads are part of the Lifetime Deal." });
    const huge = await assets.createAssetUpload(PRO, await repo.getEntitlements(PRO), { size: 16 * 1024 * 1024, contentType: "image/png" });
    expect(huge.ok).toBe(false);
  });
});

describe("finishing an image upload", () => {
  it("reads the real size and stores the asset", async () => {
    const asset = await registered(PRO, 400, 200);
    expect(asset).toMatchObject({ width: 400, height: 200, mimeType: "image/png", filename: "photo.png" });
    expect(asset.url).toContain(asset.key.split("/").pop());
    expect(await prisma.asset.count({ where: { key: asset.key, userId: PRO } })).toBe(1);
    expect((await assets.listAssets(PRO)).some((a) => a.key === asset.key)).toBe(true);
    expect((await assets.listAssets(FREE_USER)).some((a) => a.key === asset.key)).toBe(false);
  });

  it("counts the stored image against storage", async () => {
    const before = (await repo.getUsage(PRO)).storageBytes;
    const asset = await registered(PRO);
    expect((await repo.getUsage(PRO)).storageBytes).toBe(before + asset.size);
  });

  it("reports photos taken sideways the way browsers show them", async () => {
    const photo = await sharp({ create: { width: 300, height: 100, channels: 3, background: "#336699" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const key = await uploaded(PRO, photo, "image/jpeg");
    const result = await assets.registerAsset(PRO, await repo.getEntitlements(PRO), { key, filename: "side.jpg" });
    expect(result.ok && [result.asset.width, result.asset.height]).toEqual([100, 300]);
  });

  it("only accepts keys handed out to the same user", async () => {
    const key = await uploaded(PRO, await png(10, 10));
    const ent = await repo.getEntitlements(PRO);
    expect(await assets.registerAsset(FREE_USER, ent, { key, filename: "x.png" })).toEqual({ ok: false, error: "This upload isn't yours." });
    expect(await assets.registerAsset(PRO, ent, { key: `${keys.assetPrefix(PRO)}../../flipbooks/x.png`, filename: "x.png" })).toMatchObject({
      ok: false,
    });
    expect(await assets.registerAsset(PRO, ent, { key: keys.asset(PRO, "0".repeat(32), "png"), filename: "x.png" })).toEqual({
      ok: false,
      error: "The upload did not reach storage.",
    });
  });

  it("rejects and deletes files that aren't what they claim", async () => {
    const key = await uploaded(PRO, Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"));
    const result = await assets.registerAsset(PRO, await repo.getEntitlements(PRO), { key, filename: "sneaky.png" });
    expect(result).toEqual({ ok: false, error: "That file isn't a JPG, PNG or WebP image." });
    expect(await head(key)).toBeNull();
    expect(await prisma.asset.count({ where: { key } })).toBe(0);

    // A real JPEG uploaded under a .png key is refused too.
    const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).jpeg().toBuffer();
    const mismatched = await uploaded(PRO, jpeg, "image/png");
    expect((await assets.registerAsset(PRO, await repo.getEntitlements(PRO), { key: mismatched, filename: "a.png" })).ok).toBe(false);
  });

  it("handles each upload once", async () => {
    const asset = await registered(PRO);
    expect(await assets.registerAsset(PRO, await repo.getEntitlements(PRO), { key: asset.key, filename: "again.png" })).toEqual({
      ok: false,
      error: "This upload was already handled.",
    });
  });
});

describe("placing images", () => {
  it("saves pictures from the user's own library only", async () => {
    const book = await mutations.createFlipbook(PRO);
    const pages = await repo.getPages(book.id);
    const mine = await registered(PRO);
    expect(await mutations.saveDocument(PRO, book.id, withImage(pages, mine.key))).toBe("ok");

    // The free account can't place the other account's picture in its own book, not even by guessing its key.
    const theirs = await mutations.createFlipbook(FREE_USER);
    expect(await mutations.saveDocument(FREE_USER, theirs.id, withImage(await repo.getPages(theirs.id), mine.key))).toBe("foreign-file");
    expect(await mutations.saveDocument(PRO, book.id, withImage(pages, keys.asset(PRO, "f".repeat(32), "png")))).toBe("foreign-file");
  });

  it("signs placed pictures when pages are read, and stops once the file is deleted", async () => {
    const book = await mutations.createFlipbook(PRO);
    const asset = await registered(PRO);
    await mutations.saveDocument(PRO, book.id, withImage(await repo.getPages(book.id), asset.key));

    const image = () => repo.getPages(book.id).then((pages) => pages[0].elements.find((el) => el.type === "IMAGE") as ImageElement);
    expect((await image()).properties.imageUrl).toContain("X-Amz-Signature");
    // The signed URL is never stored.
    const row = await prisma.element.findFirstOrThrow({ where: { page: { flipbookId: book.id }, type: "IMAGE" } });
    expect(row.properties).not.toHaveProperty("imageUrl");

    expect(await assets.assetUsage(PRO, asset.key)).toBe(1);
    expect(await assets.getAssetUsage(FREE_USER, asset.id)).toBeNull();
    expect(await assets.deleteAsset(FREE_USER, asset.id)).toBe(false);
    expect(await assets.deleteAsset(PRO, asset.id)).toBe(true);
    expect(await head(asset.key)).toBeNull();

    const missing = await image();
    expect(missing.properties.assetKey).toBe(asset.key);
    expect(missing.properties.imageUrl).toBeUndefined();
  });
});
