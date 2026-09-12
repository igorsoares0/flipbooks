import { expect, test } from "./fixtures";

const SETTINGS = "/dashboard/flipbooks/fb_8Kd2/settings";

test.describe("flipbook settings", () => {
  test("tabs switch in place and keep the URL in sync", async ({ page }) => {
    await page.goto(SETTINGS);
    await page.getByRole("tab", { name: "Branding" }).click();
    await expect(page).toHaveURL(/tab=branding/);
    await expect(page.getByText("Viewer controls")).toBeVisible();
  });

  test("a deep-linked tab opens directly", async ({ page }) => {
    await page.goto(`${SETTINGS}?tab=share`);
    await expect(page.getByText("Public link")).toBeVisible();
  });

  test("the live preview follows title, switches and colors", async ({ page }) => {
    await page.goto(SETTINGS);
    const preview = page.getByRole("complementary").filter({ hasText: "LIVE VIEWER PREVIEW" });

    await page.getByRole("textbox").first().fill("Autumn Catalog");
    await expect(preview.getByText("Autumn Catalog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Autumn Catalog" })).toBeVisible();

    await page.getByRole("tab", { name: "Branding" }).click();
    await expect(preview.getByText("Powered by Flipbook")).toBeVisible();
    await page.getByRole("switch", { name: "Powered by Flipbook" }).click();
    await expect(preview.getByText("Powered by Flipbook")).toBeHidden();

    await expect(preview.getByText("PDF", { exact: true })).toBeHidden();
    await page.getByRole("switch", { name: "Allow PDF download" }).click();
    await expect(preview.getByText("PDF", { exact: true })).toBeVisible();

    await page.getByRole("radio", { name: "#F3F1EC" }).click();
    await expect(page.getByRole("radio", { name: "#F3F1EC" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("viewer-preview")).toHaveCSS("background-color", "rgb(243, 241, 236)");
  });

  test("the slug field validates its format", async ({ page }) => {
    await page.goto(SETTINGS);
    const slug = page.getByLabel("Public URL");
    await slug.fill("summer catalog!");
    await expect(page.getByText("Invalid")).toBeVisible();
    await slug.fill("summer-catalog-2026");
    await expect(page.getByText("Available")).toBeVisible();
  });

  test("the description counter tracks length", async ({ page }) => {
    await page.goto(SETTINGS);
    await page.locator("textarea").fill("Short.");
    await expect(page.getByText("6 / 160")).toBeVisible();
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
