import { element, openOwnCopy, saved, testImage } from "./editor-helpers";
import { expect, signInAsNewUser, test } from "./fixtures";

test.describe("asset library", () => {
  test("uploads and deletes images in the editor, warning where they are used", async ({ page }) => {
    const book = await openOwnCopy(page);
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.getByLabel("Upload images").setInputFiles(await testImage("pier.png", 300, 300));
    await page.getByRole("button", { name: "Add pier.png" }).click();
    await saved(page);

    await page.getByLabel("Upload images").setInputFiles(await testImage("dock.png", 200, 100));
    const images = page.getByRole("list", { name: "Your images" });
    await expect(images.getByRole("button", { name: "Add dock.png" })).toBeVisible();

    await images.getByRole("button", { name: "Delete pier.png" }).click();
    await expect(page.getByText("Used in 1 flipbook; it will show as missing there.")).toBeVisible();
    await page.getByRole("button", { name: "Delete image" }).click();
    await expect(images.getByRole("button", { name: "Add pier.png" })).toHaveCount(0);

    // The page keeps the frame, says the picture is gone, and still saves.
    await expect(element(page, "pier")).toContainText("Image missing");
    await page.getByRole("button", { name: "Add dock.png" }).click();
    await saved(page);

    await page.goto(`/dashboard/flipbooks/${book.id}/editor`);
    await expect(element(page, "pier")).toContainText("Image missing");
    await expect(element(page, "dock")).toBeVisible();
  });

  test("rejects files that aren't images", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/dashboard/flipbooks/new");
    await page.getByRole("button", { name: "Open editor" }).click();
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.getByLabel("Upload images").setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });
    await expect(page.getByText("That file isn't a JPG, PNG or WebP image.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Your images" })).toHaveCount(0);
  });
});
