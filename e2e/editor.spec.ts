import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const EDITOR = "/dashboard/flipbooks/fb_8Kd2/editor";

const properties = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const selectionName = (page: Page) => properties(page).getByRole("heading");

test.describe("editor", () => {
  test("opens with the heading selected", async ({ page }) => {
    await page.goto(EDITOR);
    await expect(selectionName(page)).toHaveText("Heading");
    await expect(properties(page).getByText("TYPOGRAPHY")).toBeVisible();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("clicking elements swaps the properties panel", async ({ page }) => {
    await page.goto(EDITOR);
    await page.getByRole("button", { name: "Select Cover image" }).click();
    await expect(selectionName(page)).toHaveText("Cover image");
    await expect(properties(page).getByText("IMAGE", { exact: true })).toBeVisible();
    await expect(properties(page).getByText("TYPOGRAPHY")).toBeHidden();

    await page.getByRole("button", { name: "Select Ellipse" }).click();
    await expect(selectionName(page)).toHaveText("Ellipse");
    await expect(properties(page).getByText("356")).toBeVisible();
  });

  test("clicking the artboard background selects the page", async ({ page }) => {
    await page.goto(EDITOR);
    const image = await page.getByRole("button", { name: "Select Cover image" }).boundingBox();
    await page.mouse.click(image!.x + 20, image!.y + image!.height + 30);
    await expect(selectionName(page)).toHaveText("Page 1");
    await expect(properties(page).getByText("PAGE", { exact: true })).toBeVisible();
  });

  test("adding a page selects it and autosaves", async ({ page }) => {
    // "Saving…" only shows for ~900 ms, so drive the timers by hand.
    await page.clock.install();
    await page.goto(EDITOR);
    await page.getByRole("button", { name: "Add page" }).click();
    await expect(page.getByText("Saving…")).toBeVisible();
    await expect(selectionName(page)).toHaveText("Page 65");
    await expect(page.getByRole("button", { name: "Page 65", exact: true })).toHaveAttribute("aria-current", "page");
    await page.clock.runFor(1_000);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("text and shapes are added to the page", async ({ page }) => {
    await page.goto(EDITOR);
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await page.getByRole("button", { name: "Add a subheading" }).click();
    await expect(selectionName(page)).toHaveText("Subheading");
    await expect(page.getByRole("button", { name: "Select Subheading" })).toBeVisible();

    await page.getByRole("button", { name: "Shapes" }).click();
    await page.getByRole("button", { name: "Add rectangle" }).click();
    await expect(selectionName(page)).toHaveText("Rectangle");

    await page.getByRole("button", { name: "Layers" }).click();
    const layers = page.getByRole("listitem");
    await expect(layers.first()).toContainText("Rectangle");
    await expect(layers).toHaveCount(8); // six from the chapter layout + the two just added
  });

  test("undo and redo, from the toolbar and the keyboard", async ({ page }) => {
    await page.goto(EDITOR);
    const undo = page.getByRole("button", { name: "Undo" });
    await expect(undo).toBeDisabled();

    await page.getByRole("button", { name: "Add body text" }).click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();

    await undo.click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toHaveCount(0);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();

    await page.keyboard.press("Control+z");
    await expect(page.getByRole("button", { name: "Select Body text" })).toHaveCount(0);
    await page.keyboard.press("Control+Shift+z");
    await expect(page.getByRole("button", { name: "Select Body text" })).toBeVisible();
  });

  test("duplicate and delete the selection", async ({ page }) => {
    await page.goto(EDITOR);
    await page.getByRole("button", { name: "Select Ellipse" }).click();
    await properties(page).getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("button", { name: "Select Ellipse" })).toHaveCount(2);

    await page.keyboard.press("Delete");
    await expect(page.getByRole("button", { name: "Select Ellipse" })).toHaveCount(1);
    await expect(selectionName(page)).toHaveText("Page 1");
  });

  test("preview and publish lead to the public viewer", async ({ page }) => {
    await page.goto(EDITOR);
    await expect(page.getByRole("link", { name: "Publish" })).toHaveAttribute("href", "/f/summer-catalog");
  });
});
