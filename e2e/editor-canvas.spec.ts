import { artboardScale, dragBy, element, openOwnCopy, properties, saved, selectionName, testImage } from "./editor-helpers";
import { expect, test } from "./fixtures";

// Direct manipulation on the artboard: moving, resizing, rotating, snapping, inline text,
// property inputs, pages and zoom. Each test edits its own copy of the Summer Catalog.

const field = (page: Parameters<typeof properties>[0], label: string) => properties(page).getByLabel(label, { exact: true });

test.describe("canvas editing", () => {
  test("dragging an element moves it, and the move survives a reload", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    await expect(field(page, "X")).toHaveValue("356");

    await dragBy(page, element(page, "Ellipse"), -120, 60);
    const x = Number(await field(page, "X").inputValue());
    const y = Number(await field(page, "Y").inputValue());
    expect(x).toBeLessThan(300);
    expect(y).toBeGreaterThan(330);

    // One drag is one undo step.
    await page.keyboard.press("Control+z");
    await expect(field(page, "X")).toHaveValue("356");
    await page.keyboard.press("Control+Shift+z");
    await saved(page);

    await page.reload();
    await element(page, "Ellipse").click();
    await expect(field(page, "X")).toHaveValue(String(x));
    await expect(field(page, "Y")).toHaveValue(String(y));
  });

  test("a corner handle resizes, a side handle only changes the width", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Cover image").click();
    const scale = await artboardScale(page);

    const value = async (label: string) => Number(await field(page, label).inputValue());

    await dragBy(page, page.getByRole("slider", { name: "Resize from bottom-right" }), 50 * scale, 20 * scale);
    // Pictures keep their proportions from a corner: 270×290 grows to about 320×344.
    expect(Math.abs((await value("Width")) - 320)).toBeLessThanOrEqual(2);
    expect(Math.abs((await value("Height")) / (await value("Width")) - 290 / 270)).toBeLessThan(0.01);
    await expect(field(page, "X")).toHaveValue("44");

    const width = await value("Width");
    const height = await value("Height");
    await dragBy(page, page.getByRole("slider", { name: "Resize from left" }), 20 * scale, 0);
    expect(Math.abs((await value("Width")) - (width - 20))).toBeLessThanOrEqual(2);
    expect(Math.abs((await value("X")) - 64)).toBeLessThanOrEqual(2);
    await expect(field(page, "Height")).toHaveValue(String(height));
    await saved(page);
  });

  test("the rotate handle turns the element, snapping with Shift", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    const target = (await element(page, "Ellipse").boundingBox())!;
    const handle = (await page.getByRole("slider", { name: "Rotate" }).boundingBox())!;

    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.keyboard.down("Shift");
    // Straight to the right of the center is a quarter turn.
    await page.mouse.move(target.x + target.width + 80, target.y + target.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up("Shift");

    await expect(properties(page).getByLabel("Rotation")).toHaveValue("90");
    await expect(element(page, "Ellipse")).toHaveAttribute("style", /rotate\(90deg\)/);
  });

  test("snap guides appear when an element lines up with the page center", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    const scale = await artboardScale(page);
    // The ellipse's center is at x=416; the page center is 260.
    await dragBy(page, element(page, "Ellipse"), -154 * scale, 0, { release: false });
    await expect(page.getByTestId("snap-guide").first()).toBeVisible();
    await page.mouse.up();
    await expect(page.getByTestId("snap-guide")).toHaveCount(0);
    await expect(field(page, "X")).toHaveValue("200"); // 260 - 120 / 2
  });

  test("double-click edits text inline; Ctrl+I makes a word italic", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Caption").dblclick();
    const editor = page.getByRole("textbox", { name: "Edit Caption" });
    await expect(editor).toBeFocused();

    await page.keyboard.type("Made by the sea");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Control+i");
    await page.keyboard.press("Escape");

    await expect(editor).toHaveCount(0);
    await expect(element(page, "Caption")).toHaveText("Made by the sea");
    await expect(element(page, "Caption").locator("em")).toHaveText("sea");

    // The whole editing session is one undo step.
    await page.keyboard.press("Control+z");
    await expect(element(page, "Caption")).not.toContainText("Made by the sea");
    await page.keyboard.press("Control+Shift+z");
    await saved(page);

    await page.reload();
    await expect(element(page, "Caption").locator("em")).toHaveText("sea");
  });

  test("clicking another element ends text editing and keeps the text", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Caption").dblclick();
    await page.keyboard.type("Kept");
    await element(page, "Ellipse").click();
    await expect(selectionName(page)).toHaveText("Ellipse");
    await expect(element(page, "Caption")).toHaveText("Kept");
  });

  test("property inputs change the element", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    await field(page, "Width").fill("200");
    await field(page, "Width").press("Enter");
    await properties(page).getByLabel("Fill color", { exact: true }).fill("#C0392B");
    await expect(element(page, "Ellipse").locator("div")).toHaveCSS("background-color", "rgb(192, 57, 43)");
    await saved(page);

    await page.reload();
    await element(page, "Ellipse").click();
    await expect(field(page, "Width")).toHaveValue("200");
    await expect(properties(page).getByLabel("Fill color", { exact: true })).toHaveValue("#C0392B");

    await element(page, "Heading").click();
    await properties(page).getByLabel("Font size").fill("30");
    await properties(page).getByRole("button", { name: "Center", exact: true }).click();
    await expect(element(page, "Heading").locator("div")).toHaveCSS("text-align", "center");
  });

  test("arrow keys nudge, Escape clears, Enter starts editing", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(field(page, "X")).toHaveValue("357");
    await expect(field(page, "Y")).toHaveValue("310");

    await page.keyboard.press("Escape");
    await expect(selectionName(page)).toHaveText("Page 1");

    await element(page, "Caption").click();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Edit Caption" })).toBeFocused();
  });

  test("copy and paste duplicates the selection", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await expect(element(page, "Ellipse")).toHaveCount(2);
    await expect(field(page, "X")).toHaveValue("372");
  });

  test("locked elements can be selected but not moved", async ({ page }) => {
    await openOwnCopy(page);
    await element(page, "Ellipse").click();
    await properties(page).getByRole("button", { name: "Lock" }).click();
    await dragBy(page, element(page, "Ellipse"), -100, 0);
    await expect(field(page, "X")).toHaveValue("356");
    await expect(page.getByRole("slider", { name: "Rotate" })).toHaveCount(0);
  });

  test("pages reorder by dragging and from the page menu", async ({ page }) => {
    await openOwnCopy(page);
    const thumb = (n: number) => page.getByRole("button", { name: `Page ${n}`, exact: true });
    const third = (await thumb(3).boundingBox())!;

    // Drag the cover past page 3.
    await dragBy(page, thumb(1), third.x + third.width - (await thumb(1).boundingBox())!.x - 10, 0, { release: false });
    await expect(page.getByTestId("page-drop-indicator")).toBeVisible();
    await page.mouse.up();
    await saved(page);

    await thumb(3).click();
    await expect(element(page, "Cover image")).toBeVisible();
    await page.reload();
    await thumb(3).click();
    await expect(element(page, "Cover image")).toBeVisible();

    // And back, with the context menu.
    await thumb(3).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Move left" }).click();
    await thumb(2).click();
    await expect(element(page, "Cover image")).toBeVisible();
  });

  test("zoom in, out and back to fit", async ({ page }) => {
    await openOwnCopy(page);
    const artboardPage = page.getByTestId("artboard-page");
    const fitted = (await artboardPage.boundingBox())!.width;

    await page.getByRole("button", { name: "Zoom level" }).click();
    await page.getByRole("option", { name: "200%" }).click();
    await expect(page.getByRole("button", { name: "Zoom level" })).toHaveText("200%");
    expect((await artboardPage.boundingBox())!.width).toBeCloseTo(1040, 0);

    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.getByRole("button", { name: "Zoom level" })).toHaveText("150%");

    await page.keyboard.press("Control+0");
    await expect.poll(async () => (await artboardPage.boundingBox())!.width).toBeCloseTo(fitted, 0);
  });

  test("images upload, land on the page and show in the viewer", async ({ page }) => {
    const book = await openOwnCopy(page);
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.getByLabel("Upload images").setInputFiles(await testImage("harbour.png", 400, 200));

    await page.getByRole("button", { name: "Add harbour.png" }).click();
    await expect(selectionName(page)).toHaveText("harbour");
    // 60% of the page width, keeping the 2:1 proportions.
    await expect(field(page, "Width")).toHaveValue("312");
    await expect(field(page, "Height")).toHaveValue("156");
    await expect(element(page, "harbour").locator("img")).toHaveJSProperty("complete", true);
    await saved(page);

    await page.goto(`/f/${book.slug}`);
    await expect(page.locator('img[alt="harbour"]').first()).toBeVisible();
  });
});

test.describe("unsaved work", () => {
  // The aborted saves make the browser log failed requests.
  test.use({ allowedConsoleErrors: [/Failed to load resource|ERR_FAILED|Failed to fetch/] });

  test("edits made while saves fail can be restored after a reload", async ({ page }) => {
    const book = await openOwnCopy(page);
    await saved(page);
    // Server actions POST to the page's own URL.
    const offline = (url: URL) => url.pathname === `/dashboard/flipbooks/${book.id}/editor`;
    await page.route(offline, (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()));

    await page.getByRole("button", { name: "Add body text" }).click();
    await expect(page.getByText("Couldn't save")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept()); // "Leave site?" on reload
    await page.unroute(offline);
    await page.reload();
    await expect(element(page, "Body text")).toHaveCount(0);

    await page.getByRole("button", { name: "Restore unsaved changes" }).click();
    await expect(element(page, "Body text")).toBeVisible();
    await saved(page);

    await page.reload();
    await expect(element(page, "Body text")).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore unsaved changes" })).toHaveCount(0);
  });
});
