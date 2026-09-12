import type { Page } from "@playwright/test";
import { cloneFlipbook, getFlipbookRow } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";

const properties = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const selectionName = (page: Page) => properties(page).getByRole("heading");
const saved = (page: Page) => expect(page.getByText("Saved", { exact: true })).toBeVisible();

/** Every editor test edits its own copy of the Summer Catalog, owned by a fresh user. */
async function openOwnCopy(page: Page) {
  const user = await signInAsNewUser(page);
  const book = await cloneFlipbook("fb_8Kd2", user.id);
  await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
  return book;
}

test.describe("editor", () => {
  test("opens with the heading selected", async ({ page }) => {
    await openOwnCopy(page);
    await expect(selectionName(page)).toHaveText("Heading");
    await expect(properties(page).getByText("TYPOGRAPHY")).toBeVisible();
    await saved(page);
  });

  test("clicking elements swaps the properties panel", async ({ page }) => {
    await openOwnCopy(page);
    await page.getByRole("button", { name: "Select Cover image" }).click();
    await expect(selectionName(page)).toHaveText("Cover image");
    await expect(properties(page).getByText("IMAGE", { exact: true })).toBeVisible();
    await expect(properties(page).getByText("TYPOGRAPHY")).toBeHidden();

    await page.getByRole("button", { name: "Select Ellipse" }).click();
    await expect(selectionName(page)).toHaveText("Ellipse");
    await expect(properties(page).getByText("356")).toBeVisible();
  });

  test("clicking the artboard background selects the page", async ({ page }) => {
    await openOwnCopy(page);
    const image = await page.getByRole("button", { name: "Select Cover image" }).boundingBox();
    await page.mouse.click(image!.x + 20, image!.y + image!.height + 30);
    await expect(selectionName(page)).toHaveText("Page 1");
    await expect(properties(page).getByText("PAGE", { exact: true })).toBeVisible();
  });

  test("new pages autosave and survive a reload", async ({ page }) => {
    const book = await openOwnCopy(page);
    await page.getByRole("button", { name: "Add page" }).click();
    await expect(page.getByText("Saving…")).toBeVisible();
    await expect(selectionName(page)).toHaveText("Page 65");
    await saved(page);
    expect((await getFlipbookRow(book.id))?._count.pages).toBe(65);

    await page.reload();
    await expect(page.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(65);
  });

  test("text and shapes are added to the page and persist", async ({ page }) => {
    await openOwnCopy(page);
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await page.getByRole("button", { name: "Add a subheading" }).click();
    await expect(selectionName(page)).toHaveText("Subheading");

    await page.getByRole("button", { name: "Shapes" }).click();
    await page.getByRole("button", { name: "Add rectangle" }).click();
    await expect(selectionName(page)).toHaveText("Rectangle");

    await page.getByRole("button", { name: "Layers" }).click();
    const layers = page.getByRole("listitem");
    await expect(layers.first()).toContainText("Rectangle");
    await expect(layers).toHaveCount(8); // six from the chapter layout + the two just added
    await saved(page);

    await page.reload();
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await expect(page.getByRole("button", { name: "Select Subheading" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Rectangle" })).toBeVisible();
  });

  test("undo and redo, from the toolbar and the keyboard", async ({ page }) => {
    await openOwnCopy(page);
    const undo = page.getByRole("button", { name: "Undo" });
    await expect(undo).toBeDisabled();

    await page.getByRole("button", { name: "Add body text" }).click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();

    await undo.click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toHaveCount(0);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();

    await page.keyboard.press("Control+z");
    await expect(page.getByRole("button", { name: "Select Body text" })).toHaveCount(0);
    await page.keyboard.press("Control+Shift+z");
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();
  });

  test("duplicate and delete the selection", async ({ page }) => {
    await openOwnCopy(page);
    await page.getByRole("button", { name: "Select Ellipse" }).click();
    await properties(page).getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("button", { name: "Select Ellipse" })).toHaveCount(2);

    await page.keyboard.press("Delete");
    await expect(page.getByRole("button", { name: "Select Ellipse" })).toHaveCount(1);
    await expect(selectionName(page)).toHaveText("Page 1");
  });

  test("publish opens the live book, readable when signed out", async ({ page, browser }) => {
    const book = await openOwnCopy(page);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(new RegExp(`/f/${book.slug}`));

    // The copy is private by default, so it stays hidden from readers until made public.
    const reader = await browser.newPage({ ...signedOut, baseURL: new URL(page.url()).origin });
    expect((await reader.goto(`/f/${book.slug}`))?.status()).toBe(404);
    await reader.close();

    await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
    await expect(page.getByRole("link", { name: "View live" })).toHaveAttribute("href", `/f/${book.slug}`);
  });

  test("the free plan sees an upgrade page instead of the editor", async ({ page }) => {
    const user = await signInAsNewUser(page, { plan: "FREE" });
    const book = await cloneFlipbook("fb_2Hc6", user.id);
    await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
    await expect(page.getByText("The canvas editor is part of the Lifetime Deal")).toBeVisible();
  });
});
