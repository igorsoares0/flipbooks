import { expect, signedOut, test } from "./fixtures";

const OK_ROUTES = [
  "/",
  "/dashboard",
  "/dashboard/flipbooks",
  "/dashboard/flipbooks/new",
  "/dashboard/templates",
  "/dashboard/assets",
  "/dashboard/settings",
  "/dashboard/billing",
  "/dashboard/flipbooks/fb_8Kd2/settings",
  "/dashboard/flipbooks/fb_8Kd2/analytics",
  "/dashboard/flipbooks/fb_8Kd2/editor",
  "/f/summer-catalog",
  "/embed/fb_8Kd2",
];

const MISSING_ROUTES = [
  "/f/nope",
  "/f/annual-report-2026", // still processing
  "/embed/nope",
  "/dashboard/flipbooks/nope/settings",
  "/dashboard/flipbooks/fb_7Pm3/editor", // failed upload, no pages
];

test.describe("routes", () => {
  for (const path of OK_ROUTES) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/[/]/g, "\\/")}(\\?.*)?$`));
    });
  }

  test.describe("missing", () => {
    // The browser logs the 404 document itself as a console error.
    test.use({ allowedConsoleErrors: [/status of 404/] });

    for (const path of MISSING_ROUTES) {
      test(`${path} is a 404`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
        await expect(page.getByRole("heading", { name: "This page turned out blank" })).toBeVisible();
      });
    }
  });

  test("the analytics nav entry opens the most-read flipbook", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await expect(page).toHaveURL(/\/dashboard\/flipbooks\/fb_8Kd2\/analytics$/);
  });

  test("public viewer has SEO metadata", async ({ page }) => {
    await page.goto("/f/summer-catalog");
    await expect(page).toHaveTitle("Summer Catalog 2026 · Flipbook");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Summer Catalog 2026");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/f\/summer-catalog$/);
  });
});

test.describe("signed out", () => {
  test.use(signedOut);

  test("the dashboard sends you to log in and back", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fbilling$/);
  });

  test("public pages stay public", async ({ page }) => {
    for (const path of ["/", "/f/summer-catalog", "/embed/fb_8Kd2", "/login", "/register"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }
  });
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 400, height: 800 } });

  for (const path of ["/", "/dashboard", "/dashboard/billing", "/dashboard/flipbooks/fb_8Kd2/settings", "/f/summer-catalog"]) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the sidebar becomes a drawer", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Billing" })).not.toBeInViewport();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Billing" }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing$/);
  });
});

test.describe("signed out, phone width", () => {
  test.use({ ...signedOut, viewport: { width: 400, height: 800 } });

  test("/login does not scroll sideways", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
