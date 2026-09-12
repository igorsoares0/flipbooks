import { expect, test } from "./fixtures";

test.describe("dashboard", () => {
  test("shows stats and the six most recent flipbooks", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("48.2k")).toBeVisible();
    const table = page.locator("section", { has: page.getByRole("heading", { name: "Recent flipbooks" }) });
    await expect(table.getByRole("link", { name: /^Settings for / })).toHaveCount(6);
  });

  test("filters by type", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    const table = page.locator("section", { has: page.getByRole("heading", { name: "Recent flipbooks" }) });
    await expect(table.getByRole("link", { name: /^Settings for / })).toHaveCount(2);
    await expect(table.getByText("Brand Guidelines v4")).toBeVisible();
    await expect(table.getByText("Summer Catalog 2026")).toBeHidden();
  });

  test("row icon buttons render their icons", async ({ page }) => {
    await page.goto("/dashboard");
    // Regression: conflicting padding classes once collapsed these icons to 0px.
    const icon = page.getByRole("link", { name: "Preview Summer Catalog 2026" }).locator("svg");
    expect((await icon.boundingBox())?.width).toBeGreaterThan(8);
  });

  test("row actions open the editor and the viewer", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Preview Summer Catalog 2026" }).click();
    await expect(page).toHaveURL(/\/f\/summer-catalog/);
    await page.goBack();
    await page.getByRole("link", { name: "Edit" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/flipbooks\/fb_8Kd2\/editor$/);
  });

  test("topbar search filters the flipbook list", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByPlaceholder("Search flipbooks").fill("catalog");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/flipbooks\?q=catalog/);
    await expect(page.getByText("2 results for")).toBeVisible();
  });

  test("an empty search explains itself", async ({ page }) => {
    await page.goto("/dashboard/flipbooks?q=zzz");
    await expect(page.getByText("No flipbooks match that search.")).toBeVisible();
  });

  test("sidebar highlights the current section", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("link", { name: "Billing" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("analytics", () => {
  test("switches ranges and highlights the drop-off page", async ({ page }) => {
    await page.goto("/dashboard/flipbooks/fb_8Kd2/analytics");
    await expect(page.getByText("12,480")).toBeVisible();
    await expect(page.getByText("Drop-off after page 9")).toBeVisible();
    await page.getByRole("link", { name: "90d" }).click();
    await expect(page).toHaveURL(/range=90d/);
    await expect(page.getByText("12,480")).toBeHidden();
  });

  test("unpublished books have no analytics yet", async ({ page }) => {
    await page.goto("/dashboard/flipbooks/fb_9Rw4/analytics");
    await expect(page.getByText("No analytics for Lookbook SS26 yet")).toBeVisible();
  });
});

test.describe("create", () => {
  test("templates open an unsaved draft with the template's pages", async ({ page }) => {
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("tab", { name: "Business" }).click();
    await page.getByRole("link", { name: /Menu/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/flipbooks\/draft\/editor\?template=tpl_menu/);
    await expect(page.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(8);
  });

  test("open editor starts from a blank page", async ({ page }) => {
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("link", { name: "Open editor" }).click();
    // exact: Next's route announcer also reads out "Editing Untitled flipbook".
    await expect(page.getByText("Untitled flipbook", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(1);
  });
});
