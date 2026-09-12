import { expect, test } from "./fixtures";

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
