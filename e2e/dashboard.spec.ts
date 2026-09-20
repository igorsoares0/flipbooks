import { cloneFlipbook } from "./db";
import { expect, signInAsNewUser, test } from "./fixtures";

const recentTable = (page: import("@playwright/test").Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Recent flipbooks" }) });

// Read-only checks run as the seeded demo user; anything that writes uses a fresh account.

test.describe("dashboard", () => {
  test("shows stats and the six most recent flipbooks", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("4.8k")).toBeVisible(); // the seeded reader visits
    await expect(recentTable(page).getByRole("button", { name: /^More actions for / })).toHaveCount(6);
    await expect(page.getByRole("link", { name: "Flipbooks" })).toContainText("12");
  });

  test("filters by type", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    const table = recentTable(page);
    await expect(table.getByRole("button", { name: /^More actions for / })).toHaveCount(2);
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
    const row = recentTable(page).locator(":scope > div").filter({ hasText: "Summer Catalog 2026" });
    await expect(row.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/dashboard/flipbooks/fb_8Kd2/editor");
    await page.getByRole("link", { name: "Preview Summer Catalog 2026" }).click();
    await expect(page).toHaveURL(/\/f\/summer-catalog/);
  });

  test("processing and failed books can't be opened yet", async ({ page }) => {
    await page.goto("/dashboard");
    const row = recentTable(page).locator(":scope > div").filter({ hasText: "Annual Report 2026" });
    await expect(row.getByText("Processing")).toBeVisible();
    await expect(row.getByRole("link", { name: "Edit" })).toHaveCount(0);
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

  test("sidebar shows the signed-in account and current section", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page.getByText("marina@studio.co")).toBeVisible();
    await expect(page.getByRole("link", { name: "Billing" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("analytics", () => {
  test("switches ranges and highlights the drop-off page", async ({ page }) => {
    const views = page.getByRole("group", { name: "VIEWS", exact: true });
    const count = async () => Number((await views.textContent())!.match(/VIEWS([\d,]+)/)![1].replaceAll(",", ""));
    await page.goto("/dashboard/flipbooks/fb_8Kd2/analytics?range=all");
    // The 1,248 seeded visits, plus any signed-out reader other specs sent to this book.
    await expect.poll(count).toBeGreaterThanOrEqual(1_248);
    const allTime = await count();
    await expect(page.getByText(/Drop-off after page \d+/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible();
    await expect(page.getByText("Mobile")).toBeVisible();

    await page.getByRole("link", { name: "30d" }).click();
    await expect(page).toHaveURL(/range=30d/);
    await expect.poll(count).toBeLessThan(allTime);
  });

  test("unpublished books have no analytics yet", async ({ page }) => {
    await page.goto("/dashboard/flipbooks/fb_2Hc6/analytics");
    await expect(page.getByText("No analytics for Investor Deck yet")).toBeVisible();
  });
});

test.describe("creating flipbooks", () => {
  test("a template creates a saved draft with the template's pages", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("tab", { name: "Business" }).click();
    await page.getByRole("button", { name: "Use the Menu template" }).click();
    await expect(page).toHaveURL(/\/dashboard\/flipbooks\/[^/]+\/editor$/);
    await expect(page.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(8);
    // Designed pages, not blank ones: the cover and an interior layout.
    await expect(page.getByRole("button", { name: "Select Heading", exact: true })).toHaveText("The Menu");
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await expect(page.getByRole("button", { name: "Select Item 1", exact: true })).toHaveText("Burrata, peach, basil");

    await page.goto("/dashboard");
    await expect(page.getByText("Menu (from template)")).toBeVisible();
  });

  test("open editor starts from one blank page", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("button", { name: "Open editor" }).click();
    await expect(page.getByRole("link", { name: "Untitled flipbook", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Page \d+$/ })).toHaveCount(1);
  });

  test("the free plan can use the editor, up to three flipbooks", async ({ page }) => {
    const user = await signInAsNewUser(page, { plan: "FREE" });
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("button", { name: "Open editor" }).click();
    await expect(page).toHaveURL(/\/editor$/);

    await cloneFlipbook("fb_2Hc6", user.id);
    await cloneFlipbook("fb_2Hc6", user.id);
    await page.goto("/dashboard/flipbooks/new");
    await expect(page.getByText("You've used all 3 flipbooks on the Free plan.")).toBeVisible();
    await page.getByRole("button", { name: "Open editor" }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing\?upgrade=flipbooks$/);
    await expect(page.getByText("You've reached your plan's flipbook limit.")).toBeVisible();
  });
});

test.describe("row menu", () => {
  test("duplicates and deletes a flipbook", async ({ page }) => {
    const user = await signInAsNewUser(page);
    await cloneFlipbook("fb_2Hc6", user.id);
    await page.goto("/dashboard/flipbooks");

    await page.getByRole("button", { name: "More actions for Investor Deck" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByText("Investor Deck (copy)")).toBeVisible();

    await page.getByRole("button", { name: "More actions for Investor Deck (copy)" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("menuitem", { name: "Confirm delete" }).click();
    await expect(page.getByText("Investor Deck (copy)")).toBeHidden();
    await expect(page.getByText("Investor Deck", { exact: true })).toBeVisible();
  });
});

test.describe("pagination", () => {
  test("pages through a long list, keeping the search", async ({ page }) => {
    const user = await signInAsNewUser(page);
    for (let i = 0; i < 22; i++) await cloneFlipbook("fb_2Hc6", user.id);

    await page.goto("/dashboard/flipbooks");
    const rows = page.getByRole("button", { name: /^More actions for / });
    await expect(rows).toHaveCount(20);
    await expect(page.getByText("1–20 of 22")).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Next" })).toHaveAttribute("aria-disabled", "true");

    await page.goto("/dashboard/flipbooks?q=investor");
    await expect(page.getByText("22 results for")).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/q=investor&page=2/);
  });
});
