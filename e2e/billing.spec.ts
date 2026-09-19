import { cloneFlipbook, publishForReaders, readerEventCount } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";
import { paddleNotification, subscriptionPayload } from "./paddle";

// Billing and reader analytics. Paddle's checkout can't run here, so its webhooks are
// simulated with correctly signed requests.

test.describe("billing", () => {
  test("the free plan sees Pro and is told when checkout isn't set up", async ({ page }) => {
    await signInAsNewUser(page, { plan: "FREE" });
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await expect(page.getByTestId("pro-price")).toHaveText("$15");
    await page.getByRole("button", { name: /Upgrade to Pro · \$180\/year/ }).click();
    await expect(page.getByText("Billing isn't set up on this server yet.")).toBeVisible();
  });

  test("a Paddle subscription turns the account Pro, and cancelling ends it", async ({ page }) => {
    const user = await signInAsNewUser(page, { plan: "FREE" });
    const book = await cloneFlipbook("fb_8Kd2", user.id);
    await publishForReaders(book.id, { showBranding: false });

    const sub = subscriptionPayload(user.id);
    const created = await page.request.post("/api/paddle/webhook", paddleNotification("subscription.created", sub));
    expect(created.status()).toBe(200);

    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.getByText(/\$180 a year\. Renews on Sep 19, 2027\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();
    await expect(page.getByText("PRO", { exact: true })).toBeVisible(); // sidebar badge
    await page.goto(`/f/${book.slug}`);
    await expect(page.getByText("Powered by Flipbook")).toHaveCount(0);

    // Cancelled in Paddle's portal: Pro until the period ends…
    const cancelLater = { ...sub, scheduled_change: { action: "cancel", effective_at: "2027-09-19T12:00:00Z" } };
    await page.request.post("/api/paddle/webhook", paddleNotification("subscription.updated", cancelLater));
    await page.goto("/dashboard/billing");
    await expect(page.getByText(/Pro stays on until Sep 19, 2027/)).toBeVisible();

    // …then the account is back on Free, and the badge returns.
    await page.request.post("/api/paddle/webhook", paddleNotification("subscription.canceled", { ...cancelLater, status: "canceled" }));
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await page.goto(`/f/${book.slug}`);
    await expect(page.getByText("Powered by Flipbook")).toBeVisible();
  });

  test("forged webhooks are refused", async ({ page }) => {
    const user = await signInAsNewUser(page, { plan: "FREE" });
    const forged = paddleNotification("subscription.created", subscriptionPayload(user.id));
    const response = await page.request.post("/api/paddle/webhook", { ...forged, headers: { ...forged.headers, "paddle-signature": "ts=1;h1=00" } });
    expect(response.status()).toBe(401);
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
  });
});

test.describe("reader analytics", () => {
  test("a reader's visit shows up in the owner's analytics, the owner's own doesn't", async ({ page, browser }) => {
    const user = await signInAsNewUser(page);
    const book = await cloneFlipbook("fb_2Hc6", user.id);
    await publishForReaders(book.id);

    // The owner previewing isn't a reader.
    await page.goto(`/f/${book.slug}`);
    await page.getByRole("button", { name: "Next pages" }).click();
    await page.goto("/dashboard");
    expect(await readerEventCount(book.id)).toBe(0);

    const reader = await browser.newPage({ ...signedOut, baseURL: new URL(page.url()).origin });
    await reader.goto(`/f/${book.slug}`);
    await reader.getByRole("button", { name: "Next pages" }).click();
    await reader.getByRole("button", { name: "Next pages" }).click();
    // Events go out in batches every few seconds, and when the tab closes.
    await expect.poll(() => readerEventCount(book.id, "VIEW"), { timeout: 15_000 }).toBe(1);
    await expect.poll(() => readerEventCount(book.id, "PAGE_VIEW"), { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    await reader.close({ runBeforeUnload: true });

    await page.goto(`/dashboard/flipbooks/${book.id}/analytics`);
    await expect(page.getByRole("group", { name: "VIEWS", exact: true })).toContainText(/VIEWS1(?![\d,])/);
    await expect(page.getByText("Desktop")).toBeVisible();
  });
});
