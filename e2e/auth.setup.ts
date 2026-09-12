import { expect, test as setup } from "@playwright/test";
import { DEMO_PASSWORD, DEMO_USERS } from "../prisma/seed/users";

export const MARINA_STATE = "e2e/.auth/marina.json";

// Signs in once through the real login form; read-only specs reuse the session.
setup("sign in as the demo user", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(DEMO_USERS.marina.email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: MARINA_STATE });
});
