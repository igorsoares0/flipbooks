import type { Page } from "@playwright/test";
import { cloneFlipbook, getFlipbookRow } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";

/** A fresh user with their own copy of the Summer Catalog, opened on its settings page. */
async function ownCopy(page: Page, options?: Parameters<typeof signInAsNewUser>[1]) {
  const user = await signInAsNewUser(page, options);
  const book = await cloneFlipbook("fb_8Kd2", user.id);
  await page.goto(`/dashboard/flipbooks/${book.id}/settings`);
  return book;
}

const saved = (page: Page) => expect(page.getByText("Saved", { exact: true })).toBeVisible();

test.describe("flipbook settings (read-only)", () => {
  const SETTINGS = "/dashboard/flipbooks/fb_8Kd2/settings";

  test("tabs switch in place and keep the URL in sync", async ({ page }) => {
    await page.goto(SETTINGS);
    await page.getByRole("tab", { name: "Branding" }).click();
    await expect(page).toHaveURL(/tab=branding/);
    await expect(page.getByText("Viewer controls")).toBeVisible();
  });

  test("header Share jumps to the share tab and copies the link", async ({ page }) => {
    await page.goto(SETTINGS);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page).toHaveURL(/tab=share/);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://flipbook.co/f/summer-catalog");
  });

  test("the embed snippet points at the embed route", async ({ page }) => {
    await page.goto(`${SETTINGS}?tab=share`);
    await expect(page.locator("pre")).toContainText('src="https://flipbook.co/embed/fb_8Kd2"');
    await page.getByRole("button", { name: "Copy code" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("<iframe");
  });
});

test.describe("flipbook settings (saving)", () => {
  test("title, description, visibility and branding save as you edit", async ({ page }) => {
    const book = await ownCopy(page);
    const preview = page.getByRole("complementary").filter({ hasText: "LIVE VIEWER PREVIEW" });

    await page.getByRole("textbox").first().fill("Autumn Catalog");
    await expect(preview.getByText("Autumn Catalog")).toBeVisible();
    await page.locator("textarea").fill("Short.");
    await expect(page.getByText("6 / 160")).toBeVisible();
    await page.getByRole("radio", { name: /Unlisted/ }).click();
    await saved(page);

    await page.getByRole("tab", { name: "Branding" }).click();
    await page.getByRole("switch", { name: "Powered by Flipbook" }).click();
    await expect(preview.getByText("Powered by Flipbook")).toBeHidden();
    await page.getByRole("radio", { name: "#F3F1EC" }).click();
    await expect(page.getByTestId("viewer-preview")).toHaveCSS("background-color", "rgb(243, 241, 236)");
    await saved(page);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Autumn Catalog" })).toBeVisible();
    await expect(page.getByTestId("viewer-preview")).toHaveCSS("background-color", "rgb(243, 241, 236)");
    const row = await getFlipbookRow(book.id);
    expect(row).toMatchObject({ title: "Autumn Catalog", description: "Short.", visibility: "UNLISTED" });
    expect(row?.settings).toMatchObject({ showBranding: false, backgroundColor: "#F3F1EC" });
  });

  test("an empty title is flagged and not saved", async ({ page }) => {
    const book = await ownCopy(page);
    await page.getByRole("textbox").first().fill("   ");
    await expect(page.getByText("Give it a title.")).toBeVisible();
    await page.waitForTimeout(1_000);
    expect((await getFlipbookRow(book.id))?.title).toBe("Summer Catalog 2026");
  });

  test("the address checks format and availability, then saves on blur", async ({ page }) => {
    const book = await ownCopy(page);
    const slug = page.getByLabel("Public URL");

    await slug.fill("summer catalog!");
    await expect(page.getByText("Use lowercase letters, numbers and single hyphens.")).toBeVisible();

    await slug.fill("summer-catalog");
    await expect(page.getByText("That address is taken.")).toBeVisible();

    const fresh = `autumn-${book.id.slice(-6)}`;
    await slug.fill(fresh);
    await expect(page.getByText("Available")).toBeVisible();
    await slug.blur();
    await saved(page);
    expect((await getFlipbookRow(book.id))?.slug).toBe(fresh);

    await page.getByRole("tab", { name: "Share & embed" }).click();
    await expect(page.getByText(`https://flipbook.co/f/${fresh}`)).toBeVisible();
  });

  test("the free plan can't hide the badge or pick an address", async ({ page }) => {
    await ownCopy(page, { plan: "FREE" });
    await expect(page.getByLabel("Public URL")).toBeDisabled();
    await page.getByRole("tab", { name: "Branding" }).click();
    await expect(page.getByRole("switch", { name: "Powered by Flipbook" })).toBeDisabled();
  });

  test("publishing makes the book public", async ({ page, browser }) => {
    const book = await ownCopy(page);
    await page.getByRole("radio", { name: /Public/ }).click();
    await saved(page);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(new RegExp(`/f/${book.slug}`));

    const reader = await browser.newPage({ ...signedOut, baseURL: new URL(page.url()).origin });
    const response = await reader.goto(`/f/${book.slug}`);
    expect(response?.status()).toBe(200);
    await expect(reader.getByRole("heading", { name: "Summer Catalog 2026" })).toBeVisible();
    await reader.close();
  });

  test("publishing needs a verified email", async ({ page }) => {
    await ownCopy(page, { verified: false });
    await expect(page.getByText("Verify your email to publish.")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Verify your email before publishing" })).toBeVisible();
  });

  test("delete asks for confirmation and removes the book", async ({ page }) => {
    const book = await ownCopy(page);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page).toHaveURL(/\/dashboard\/flipbooks$/);
    await expect(page.getByText("No flipbooks yet")).toBeVisible();
    expect(await getFlipbookRow(book.id)).toBeNull();
  });
});
