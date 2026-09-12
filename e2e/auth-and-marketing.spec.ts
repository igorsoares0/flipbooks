import { randomUUID } from "node:crypto";
import { DEMO_PASSWORD, DEMO_USERS } from "../prisma/seed/users";
import { createTestUser, latestEmail, TEST_PASSWORD } from "./db";
import { expect, signedOut, test } from "./fixtures";

test.use(signedOut);

/** The form's own error message (Next's route announcer is also role="alert"). */
const formAlert = (page: import("@playwright/test").Page) => page.locator('p[role="alert"]');

// Failed sign-ins and duplicate sign-ups answer 401/422; the browser logs those responses.
const expectedAuthErrors = { allowedConsoleErrors: [/Failed to load resource: the server responded with a status of (401|422)/] };

test.describe("auth pages", () => {
  test("login links to reset and register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.getByRole("link", { name: "Forgot?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.locator("input[type=password]")).toHaveCount(0);

    await page.getByRole("link", { name: "Back to log in" }).click();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { name: "Start your first flipbook" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
  });

  test("Google sign-in is hidden until it is configured", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  });

  test("the form validates before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.getByLabel("Email").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });
});

test.describe("logging in", () => {
  test.use(expectedAuthErrors);

  test("a wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_USERS.marina.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formAlert(page)).toHaveText("That email and password don't match.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("credentials never end up in the URL", async ({ page }) => {
    // Regression: a submit before hydration used to be a native GET with the password in the query.
    await page.goto("/login", { waitUntil: "commit" });
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await page.getByLabel("Email").fill(DEMO_USERS.marina.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formAlert(page)).toBeVisible();
    expect(page.url()).not.toContain("password");
  });

  test("logging in returns to the page you asked for", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Email").fill(DEMO_USERS.marina.email);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing$/);
    await expect(page.getByRole("heading", { name: "Lifetime Deal" })).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    const user = await createTestUser();
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});

test.describe("signing up", () => {
  test.use(expectedAuthErrors);

  test("new accounts start free, unverified, and verify from the email link", async ({ page }) => {
    const email = `new-${randomUUID().slice(0, 8)}@e2e.test`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("Ana Souza");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("No flipbooks yet")).toBeVisible();
    await expect(page.getByText("Verify your email to publish.")).toBeVisible();
    await expect(page.getByText("FREE", { exact: true })).toBeVisible();

    const verification = await latestEmail(email, /Verify your email/);
    await page.goto(verification.url);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Verify your email to publish.")).toBeHidden();
  });

  test("an email that already has an account is refused", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Someone");
    await page.getByLabel("Email").fill(DEMO_USERS.marina.email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(formAlert(page)).toContainText("already exists");
  });
});

test.describe("password reset", () => {
  test.use(expectedAuthErrors);

  test("reset by email, then log in with the new password", async ({ page }) => {
    const user = await createTestUser();
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    const reset = await latestEmail(user.email, /Reset your Flipbook password/);
    await page.goto(reset.url);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await page.getByLabel("New password").fill("brand-new-password-1");
    await page.getByRole("button", { name: "Save new password" }).click();

    await expect(page).toHaveURL(/\/login\?reset=1$/);
    await expect(page.getByText("Password updated.")).toBeVisible();
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(formAlert(page)).toBeVisible(); // the old password no longer works

    await page.getByLabel("Password").fill("brand-new-password-1");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("unknown emails get the same answer", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("nobody@e2e.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  });

  test("a bad reset link explains itself", async ({ page }) => {
    await page.goto("/reset-password?error=INVALID_TOKEN");
    await expect(formAlert(page)).toContainText("incomplete");
    await expect(page.getByRole("button", { name: "Save new password" })).toBeDisabled();
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
