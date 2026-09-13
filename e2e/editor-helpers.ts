import type { Page } from "@playwright/test";
import sharp from "sharp";
import { cloneFlipbook } from "./db";
import { expect, signInAsNewUser } from "./fixtures";

export const properties = (page: Page) => page.getByRole("complementary", { name: "Properties" });
export const selectionName = (page: Page) => properties(page).getByRole("heading");
export const saved = (page: Page) => expect(page.getByText("Saved", { exact: true })).toBeVisible();
export const element = (page: Page, name: string) => page.getByRole("button", { name: `Select ${name}`, exact: true });

/** Every editor test edits its own copy of the Summer Catalog, owned by a fresh user. */
export async function openOwnCopy(page: Page) {
  const user = await signInAsNewUser(page);
  const book = await cloneFlipbook("fb_8Kd2", user.id);
  await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
  return { ...book, user };
}

/** Page units per screen pixel at the artboard's current zoom. */
export async function artboardScale(page: Page) {
  return Number(await page.getByTestId("artboard-page").getAttribute("data-scale"));
}

/** Drags from the center of a locator by (dx, dy) screen pixels, in small steps like a hand would. */
export async function dragBy(page: Page, target: ReturnType<Page["locator"]>, dx: number, dy: number, { release = true } = {}) {
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  if (release) await page.mouse.up();
}

/** A small real PNG, generated so the test doesn't depend on a binary fixture. */
export async function testImage(name = "harbour.png", width = 400, height = 200) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: { r: 27, g: 69, b: 214 } } })
    .png()
    .toBuffer();
  return { name, mimeType: "image/png", buffer };
}
