import { expect, signedOut, test } from "./fixtures";

test.describe("public viewer", () => {
  test("opens on the cover and pages through spreads", async ({ page }) => {
    await page.goto("/f/summer-catalog");
    const counter = page.getByText(/^\d+(–\d+)? \/ 64$/);
    await expect(counter).toHaveText("1 / 64");
    await expect(page.getByRole("button", { name: "Previous pages" })).toBeDisabled();

    await page.getByRole("button", { name: "Next pages" }).click();
    await expect(counter).toHaveText("2–3 / 64");
    await page.getByRole("button", { name: "Next pages" }).click();
    await expect(counter).toHaveText("4–5 / 64");
  });

  test("keyboard navigation", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    const counter = page.getByText(/^\d+(–\d+)? \/ 64$/);
    await expect(counter).toHaveText("4–5 / 64");
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText("6–7 / 64");
    await page.keyboard.press("ArrowLeft");
    await expect(counter).toHaveText("4–5 / 64");
    await page.keyboard.press("End");
    await expect(counter).toHaveText("64 / 64");
    await expect(page.getByRole("button", { name: "Next pages" })).toBeDisabled();
    await page.keyboard.press("Home");
    await expect(counter).toHaveText("1 / 64");
  });

  test("deep links open a spread and stay in sync", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=5");
    await expect(page.getByText("4–5 / 64")).toBeVisible();
    await expect(page.getByText("CHAPTER TWO")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/page=6$/);
  });

  test("out-of-range deep links clamp to the book", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=999");
    await expect(page.getByText("64 / 64")).toBeVisible();
  });

  test("thumbnails jump and can be hidden", async ({ page }) => {
    await page.goto("/f/summer-catalog");
    await page.getByRole("button", { name: "Go to page 10" }).click();
    await expect(page.getByText("10–11 / 64")).toBeVisible();
    await page.getByRole("button", { name: "Thumbnails" }).click();
    await expect(page.getByRole("button", { name: "Go to page 10" })).toBeHidden();
  });

  test("share copies a link to the current page", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://flipbook.co/f/summer-catalog?page=4");
  });
});

test.describe("page turn", () => {
  const counter = (page: import("@playwright/test").Page) => page.getByText(/^\d+(–\d+)? \/ 64$/);

  test("the sheet turns over the next spread before the page lands", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    await page.getByRole("button", { name: "Next pages" }).click();
    // The leaf is on screen while it rotates, and gone once the spread has landed.
    await expect(page.getByTestId("turning-leaf")).toBeVisible();
    await expect(counter(page)).toHaveText("6–7 / 64");
    await expect(page.getByTestId("turning-leaf")).toHaveCount(0);
  });

  test("the spread being left stays put until the sheet lifts", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    // Record what the book shows every frame: the next spread must not flash into place
    // before the leaf is in the air.
    await page.evaluate(() => {
      const frames: string[] = [];
      Object.assign(window, { __frames: frames });
      const tick = () => {
        const book = document.querySelector('[data-testid="book"]');
        if (book) {
          const leaf = book.querySelector('[data-testid="turning-leaf"]') ? "leaf" : "flat";
          frames.push(`${leaf} ${[...book.querySelectorAll("span.font-mono")].map((n) => n.textContent).join(",")}`);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.getByRole("button", { name: "Next pages" }).click();
    await expect(counter(page)).toHaveText("6–7 / 64");

    const frames = await page.evaluate(() => (window as unknown as { __frames: string[] }).__frames);
    const lift = frames.findIndex((frame) => frame.startsWith("leaf"));
    expect(lift).toBeGreaterThan(-1);
    expect(frames.slice(0, lift).filter((frame) => /0[67]/.test(frame))).toEqual([]);
  });

  test("clicking twice in a row turns two pages", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    const next = page.getByRole("button", { name: "Next pages" });
    // The second click lands while the first sheet is still in the air.
    await next.click();
    await next.click();
    await expect(counter(page)).toHaveText("8–9 / 64");
  });

  test("dragging the outer edge turns the page", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    const book = (await page.getByTestId("book").boundingBox())!;
    const y = book.y + book.height / 2;
    await page.mouse.move(book.x + book.width - 12, y);
    await page.mouse.down();
    await page.mouse.move(book.x + book.width * 0.3, y, { steps: 12 });
    await expect(page.getByTestId("turning-leaf")).toBeVisible();
    await page.mouse.up();
    await expect(counter(page)).toHaveText("6–7 / 64");
    // The page the reader carried over stays over; nothing turns back on its own.
    await page.waitForTimeout(900);
    await expect(page.getByTestId("turning-leaf")).toHaveCount(0);
    await expect(counter(page)).toHaveText("6–7 / 64");
  });

  test("the corner the reader grabs decides which way the fold slants", async ({ page }) => {
    // The flap's rotation carries the sign of the slant, so the two corners must disagree.
    const slant = async (from: "top" | "bottom") => {
      await page.goto("/f/summer-catalog?page=4");
      const book = (await page.getByTestId("book").boundingBox())!;
      await page.mouse.move(book.x + book.width - 10, from === "top" ? book.y + 14 : book.y + book.height - 14);
      await page.mouse.down();
      // Both drags head for the middle of the book, so each one pulls its corner inwards.
      await page.mouse.move(book.x + book.width * 0.62, book.y + book.height / 2, { steps: 10 });
      await expect(page.getByTestId("turning-leaf")).toBeVisible();
      const transform = await page.getByTestId("turning-leaf").evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.up();
      return Number(transform.match(/matrix\(\s*[^,]+,\s*([^,]+)/)![1]);
    };

    expect(await slant("bottom")).toBeGreaterThan(0.02);
    expect(await slant("top")).toBeLessThan(-0.02);
  });

  test("a short drag springs back to the same spread", async ({ page }) => {
    await page.goto("/f/summer-catalog?page=4");
    const book = (await page.getByTestId("book").boundingBox())!;
    const y = book.y + book.height / 2;
    await page.mouse.move(book.x + book.width - 12, y);
    await page.mouse.down();
    await page.mouse.move(book.x + book.width - 60, y, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByTestId("turning-leaf")).toHaveCount(0);
    await expect(counter(page)).toHaveText("4–5 / 64");
  });

  test("readers who ask for less motion get no animation", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...signedOut, baseURL, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/f/summer-catalog?page=4");
    await page.getByRole("button", { name: "Next pages" }).click();
    await expect(counter(page)).toHaveText("6–7 / 64");
    await expect(page.getByTestId("turning-leaf")).toHaveCount(0);
    await context.close();
  });

  test("a phone reads one page at a time and keeps the reader's place", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...signedOut, baseURL, viewport: { width: 390, height: 780 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/f/summer-catalog?page=5");
    await expect(counter(page)).toHaveText("5 / 64");
    await page.getByRole("button", { name: "Next pages" }).click();
    await expect(counter(page)).toHaveText("6 / 64");
    await expect(page).toHaveURL(/page=6/);

    // Widening the window pairs the pages again, around the page being read.
    await page.setViewportSize({ width: 1280, height: 860 });
    await expect(counter(page)).toHaveText("6–7 / 64");
    await context.close();
  });
});

test.describe("embed", () => {
  test("shows only the reader, without dashboard chrome", async ({ page }) => {
    await page.goto("/embed/fb_8Kd2?page=4");
    await expect(page.getByText("4–5 / 64")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thumbnails" })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("works inside an iframe", async ({ page, baseURL }) => {
    await page.setContent(`<iframe src="${baseURL}/embed/fb_8Kd2" width="800" height="600"></iframe>`);
    const frame = page.frameLocator("iframe");
    await expect(frame.getByText("1 / 64")).toBeVisible();
    await frame.getByRole("button", { name: "Next pages" }).click();
    await expect(frame.getByText("2–3 / 64")).toBeVisible();
  });
});

test.describe("who can read what", () => {
  test.describe("signed out", () => {
    test.use({ ...signedOut, allowedConsoleErrors: [/status of 404/] });

    test("published books are public", async ({ page }) => {
      expect((await page.goto("/f/summer-catalog"))?.status()).toBe(200);
      expect((await page.goto("/embed/fb_theo_pub"))?.status()).toBe(200);
    });

    test("drafts, ready and private books are not", async ({ page }) => {
      expect((await page.goto("/f/investor-deck"))?.status()).toBe(404); // draft, private
      expect((await page.goto("/f/lookbook-ss26"))?.status()).toBe(404); // ready, not published
      expect((await page.goto("/embed/fb_theo_priv"))?.status()).toBe(404);
    });
  });

  test.describe("as the owner", () => {
    test("drafts can be previewed", async ({ page }) => {
      expect((await page.goto("/f/investor-deck"))?.status()).toBe(200);
      expect((await page.goto("/f/lookbook-ss26"))?.status()).toBe(200);
    });
  });

  test.describe("someone else's books", () => {
    test.use({ allowedConsoleErrors: [/status of 404/] });

    for (const path of [
      "/dashboard/flipbooks/fb_theo_pub/settings",
      "/dashboard/flipbooks/fb_theo_pub/editor",
      "/dashboard/flipbooks/fb_theo_pub/analytics",
      "/dashboard/flipbooks/fb_theo_priv/settings",
      "/embed/fb_theo_priv",
      "/f/theo-private-notes",
    ]) {
      test(`${path} is a 404 for the demo user`, async ({ page }) => {
        expect((await page.goto(path))?.status()).toBe(404);
      });
    }
  });
});
