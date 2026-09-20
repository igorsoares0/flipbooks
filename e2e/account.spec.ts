import { randomUUID } from "node:crypto";
import { cloneFlipbook, latestEmail, publishForReaders, TEST_PASSWORD } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";

// The account settings page: profile, email, password and deletion. Everything that sends
// an email is confirmed through the outbox the dev mailer writes.

test.describe("account settings", () => {
  test("renames the account", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/dashboard/settings");
    await page.getByLabel("Name").fill("Marina R.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("Name saved.");

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Marina R.");
  });

  test("changes the password and signs in with the new one", async ({ page }) => {
    const user = await signInAsNewUser(page);
    await page.goto("/dashboard/settings");
    await page.getByLabel("Current password").fill(TEST_PASSWORD);
    await page.getByLabel("New password").fill("a-brand-new-password");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("status")).toContainText("Password changed");

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("a-brand-new-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("asks the current address to confirm an email change", async ({ page }) => {
    const user = await signInAsNewUser(page);
    await page.goto("/dashboard/settings");
    await page.getByLabel(/New email/).fill(`changed-${user.id}@e2e.test`);
    await page.getByRole("button", { name: "Change email" }).click();
    await expect(page.getByRole("status")).toContainText(`Check ${user.email}`);

    const confirmation = await latestEmail(user.email, /Confirm changing your email/);
    expect(confirmation.text).toContain(`changed-${user.id}@e2e.test`);
  });

  // The last step tries to log in with the deleted account, which answers 401 on purpose.
  test.describe("deletion", () => {
    test.use({ allowedConsoleErrors: [/status of 401/] });

    test("deletes the account from the emailed link, and its public links stop working", async ({ page, browser }) => {
      const user = await signInAsNewUser(page);
      const book = await cloneFlipbook("fb_8Kd2", user.id);
      await publishForReaders(book.id);

      await page.goto("/dashboard/settings");
      await page.getByLabel("Type DELETE to confirm").fill("DELETE");
      await page.getByRole("button", { name: "Delete my account" }).click();
      await expect(page.getByRole("status")).toContainText(`Check ${user.email}`);

      const confirmation = await latestEmail(user.email, /Confirm deleting your Flipbook account/);
      await page.goto(confirmation.url);
      await expect(page).toHaveURL(/\/login\?deleted=1$/);
      await expect(page.getByText("Your account and everything in it was deleted")).toBeVisible();

      // The account is gone: its book 404s, and the old password no longer signs in.
      const reader = await browser.newPage({ ...signedOut, baseURL: new URL(page.url()).origin });
      expect((await reader.goto(`/f/${book.slug}`))?.status()).toBe(404);
      await reader.close();

      await page.getByLabel("Email").fill(user.email);
      await page.getByLabel("Password").fill(user.password);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page.getByText("That email and password don't match.")).toBeVisible();
    });
  });
});

test.describe("welcome email", () => {
  // Signing up needs a signed-out browser; the default state is the demo user.
  test.use(signedOut);

  test("a new sign-up gets one", async ({ page }) => {
    // Signed up through the form, since the welcome email hangs off account creation.
    const email = `welcome-${randomUUID().slice(0, 8)}@e2e.test`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("Ana Souza");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const welcome = await latestEmail(email, /Welcome to Flipbook/);
    expect(welcome.url).toContain("/dashboard");
  });
});
