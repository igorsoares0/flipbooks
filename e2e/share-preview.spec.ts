import { cloneFlipbook, publishForReaders, readerEventCount } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";

// Share previews and the limits that keep public endpoints from being hammered.

test.describe("share previews", () => {
  test.use(signedOut);

  test("a published book has its own preview image", async ({ page }) => {
    const response = await page.request.get("/f/summer-catalog/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(5_000);

    // The page points at it, so crawlers find it.
    await page.goto("/f/summer-catalog");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  });

  test("the site has one too, and X gets the same picture", async ({ page }) => {
    for (const path of ["/opengraph-image", "/f/summer-catalog/twitter-image"]) {
      const response = await page.request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toContain("image/png");
    }
  });
});

test.describe("public limits", () => {
  test("reader events stop being recorded once a visitor floods them", async ({ page, browser, baseURL }) => {
    const user = await signInAsNewUser(page);
    const book = await cloneFlipbook("fb_2Hc6", user.id);
    await publishForReaders(book.id);

    const reader = await browser.newContext({ ...signedOut, baseURL });
    const post = (session: string) =>
      reader.request.post("/api/analytics/events", {
        data: { flipbookId: book.id, sessionId: session, events: [{ type: "PAGE_VIEW", page: 1 }] },
        headers: { "content-type": "application/json" },
      });

    // Well past the 120-a-minute window; the endpoint keeps answering 204 either way.
    const responses = await Promise.all(Array.from({ length: 150 }, (_, i) => post(`floodsession${i}`)));
    expect(responses.every((r) => r.status() === 204)).toBe(true);
    await reader.close();

    // Well under the 150 sent, and around the 120-a-minute cap.
    const recorded = await readerEventCount(book.id, "PAGE_VIEW");
    expect(recorded).toBeGreaterThan(50);
    expect(recorded).toBeLessThan(150);
  });
});
