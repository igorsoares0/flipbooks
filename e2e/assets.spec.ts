import { element, openOwnCopy, saved, testImage } from "./editor-helpers";
import { expect, signInAsNewUser, test } from "./fixtures";

test.describe("asset library", () => {
  test("uploads, lists and deletes images, warning where they are used", async ({ page }) => {
    const book = await openOwnCopy(page);
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.getByLabel("Upload images").setInputFiles(await testImage("pier.png", 300, 300));
    await page.getByRole("button", { name: "Add pier.png" }).click();
    await saved(page);

    await page.goto("/dashboard/assets");
    const images = page.getByRole("list", { name: "Images" });
    await expect(images.getByText("pier.png")).toBeVisible();
    await expect(images.getByText(/300×300/)).toBeVisible();

    await page.getByLabel("Upload images").setInputFiles(await testImage("dock.png", 200, 100));
    await expect(images.getByText("dock.png")).toBeVisible();

    await page.getByRole("button", { name: "Delete pier.png" }).click();
    await expect(page.getByText("Used in 1 flipbook; it will show as missing there.")).toBeVisible();
    await page.getByRole("button", { name: "Delete image" }).click();
    await expect(images.getByText("pier.png")).toHaveCount(0);

    // The page that placed it keeps the frame and says the picture is gone.
    await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
    await expect(element(page, "pier")).toContainText("Image missing");
  });

  test("rejects files that aren't images", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/dashboard/assets");
    await page.getByLabel("Upload images").setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });
    await expect(page.getByText("That file isn't a JPG, PNG or WebP image.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Images" })).toHaveCount(0);
  });

  test("the free plan has an image library too", async ({ page }) => {
    await signInAsNewUser(page, { plan: "FREE" });
    await page.goto("/dashboard/assets");
    await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
    await expect(page.getByLabel("Upload images")).toHaveCount(1);
  });
});
