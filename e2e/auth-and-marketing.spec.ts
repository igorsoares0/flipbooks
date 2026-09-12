import { expect, test } from "./fixtures";

test.describe("auth", () => {
  test("login links to reset and register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.getByRole("link", { name: "Forgot?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.locator("input[type=password]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to log in" }).click();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { name: "Start your first flipbook" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
  });

  test("the form validates before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.getByLabel("Email").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  // Phase 1 has no Auth.js yet: a valid submit goes straight to the demo workspace.
  test("a valid login reaches the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("marina@studio.co");
    await page.getByLabel("Password").fill("correct-horse");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("marketing", () => {
  test("hero calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Create stunning/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your first flipbook" })).toHaveAttribute("href", "/register");
    await page.getByRole("link", { name: "See a live example" }).click();
    await expect(page).toHaveURL(/\/f\/summer-catalog\?page=4/);
  });

  test("pricing reflects the Lifetime entitlements", async ({ page }) => {
    await page.goto("/#pricing");
    await expect(page.getByText("$79")).toBeVisible();
    const includes = page.getByRole("listitem");
    await expect(includes.filter({ hasText: "20 GB storage" })).toBeVisible();
    await expect(includes.filter({ hasText: "3,000 pages processed" })).toBeVisible();
  });
});
