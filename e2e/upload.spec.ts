import type { Page } from "@playwright/test";
import { A4_LANDSCAPE, A4_PORTRAIT, corruptPdf, makePdf } from "../tests/pdf-fixtures";
import { getFlipbookRow, jobCountFor } from "./db";
import { expect, signedOut, signInAsNewUser, test } from "./fixtures";

// The real pipeline: browser → presigned PUT to MinIO → confirm → worker → Ready.

const row = (page: Page, title: string) => page.locator("section > div").filter({ hasText: title });

async function uploadFrom(page: Page, file: { name: string; buffer: Buffer; mimeType?: string }) {
  await page.goto("/dashboard/flipbooks/new");
  await page.getByLabel("Choose a PDF").setInputFiles({ mimeType: "application/pdf", ...file });
}

test.describe("PDF upload", () => {
  test("a PDF becomes a readable flipbook without a reload", async ({ page }) => {
    await signInAsNewUser(page);
    await uploadFrom(page, { name: "Spring_lookbook-2027.pdf", buffer: await makePdf([A4_PORTRAIT, A4_LANDSCAPE, A4_PORTRAIT]) });

    await expect(page).toHaveURL(/\/dashboard\/flipbooks$/);
    const book = row(page, "Spring lookbook 2027");
    await expect(book.getByText("Ready")).toBeVisible({ timeout: 60_000 }); // the watcher refreshes the list
    await expect(book.getByText("3 pages")).toBeVisible();
    await expect(book.locator("img")).toHaveJSProperty("complete", true);

    await book.getByRole("link", { name: "Preview Spring lookbook 2027" }).click();
    await expect(page.getByText("1 / 3")).toBeVisible();
    const cover = page.getByRole("img", { name: "Page 1" });
    await expect(cover).toBeVisible();
    // Lazy-loaded from storage: wait until the rendered page has actually arrived.
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15_000 }).toBe(1600);
  });

  test("files that aren't PDFs are refused before uploading", async ({ page }) => {
    await signInAsNewUser(page);
    await uploadFrom(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("alert").filter({ hasText: "isn't a PDF" })).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  // Refusing oversized files is covered by the dropzone unit test (client) and the pipeline
  // integration test (server); pushing 20+ MB through the browser here would only be slow.
  test("the free plan's limits are shown before uploading", async ({ page }) => {
    await signInAsNewUser(page, { plan: "FREE" });
    await page.goto("/dashboard/flipbooks/new");
    await expect(page.getByText("Max 20 MB, up to 50 pages on your Free plan.")).toBeVisible();
  });

  test("an unreadable PDF fails with a reason and can be retried", async ({ page }) => {
    const user = await signInAsNewUser(page);
    await uploadFrom(page, { name: "broken.pdf", buffer: corruptPdf() });
    const book = row(page, "Broken");
    await expect(book.getByText("Upload failed · the file is not a readable PDF")).toBeVisible({ timeout: 60_000 });
    expect(await jobCountFor(user.id, "Broken")).toBe(1);

    await page.getByRole("button", { name: "More actions for Broken" }).click();
    await page.getByRole("menuitem", { name: "Retry processing" }).click();
    // Still broken, so it fails again, but only after a second pass through the worker.
    await expect.poll(() => jobCountFor(user.id, "Broken")).toBe(2);
    await expect(book.getByText("Failed", { exact: true })).toBeVisible({ timeout: 60_000 });
  });

  test("the original can be downloaded only when the owner allows it", async ({ page, browser, baseURL }) => {
    await signInAsNewUser(page);
    await uploadFrom(page, { name: "Menu.pdf", buffer: await makePdf([A4_PORTRAIT]) });
    const book = row(page, "Menu");
    await expect(book.getByText("Ready")).toBeVisible({ timeout: 60_000 });
    const id = (await book.getByRole("link", { name: "Edit" }).getAttribute("href"))!.split("/")[3];

    const reader = await browser.newContext({ ...signedOut, baseURL });
    const download = (path: string) => reader.request.get(path, { maxRedirects: 0 });

    // Not published yet: nobody but the owner can read it.
    expect((await download(`/api/flipbooks/${id}/download`)).status()).toBe(404);

    await page.goto(`/dashboard/flipbooks/${id}/settings`);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/f\//);
    expect((await download(`/api/flipbooks/${id}/download`)).status()).toBe(404); // download off by default

    await page.goto(`/dashboard/flipbooks/${id}/settings?tab=branding`);
    await page.getByRole("switch", { name: "Allow PDF download" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const allowed = await download(`/api/flipbooks/${id}/download`);
    expect(allowed.status()).toBe(302);
    expect(allowed.headers().location).toMatch(/original\.pdf\?.*X-Amz-Signature=/);

    const row_ = await getFlipbookRow(id);
    const viewer = await reader.newPage();
    await viewer.goto(`/f/${row_!.slug}`);
    await expect(viewer.getByRole("link", { name: "Download" })).toHaveAttribute("href", `/api/flipbooks/${id}/download`);
    await reader.close();
  });
});
