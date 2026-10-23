import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTemplatePages, templatePhotoFiles, TEMPLATES } from "./templates";
import { documentSchema } from "./validation";

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.name, t]))("%s builds a valid, designed document", (_name, template) => {
    const pages = buildTemplatePages(template.id, "fb_test");
    expect(pages).toHaveLength(template.pageCount);
    expect(documentSchema.safeParse(pages).success).toBe(true);
    expect(pages.every((p) => p.elements.length > 0)).toBe(true);
    expect(pages[0].elements.map((el) => el.name)).toContain("Heading");
  });

  it("gives every page and element a unique id", () => {
    const pages = buildTemplatePages("tpl_report", "fb_x");
    const ids = [...pages.map((p) => p.id), ...pages.flatMap((p) => p.elements.map((el) => el.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places bundled pictures only when asked", () => {
    const placeholders = buildTemplatePages("tpl_kpi_report", "fb_x");
    const images = placeholders.flatMap((p) => p.elements.filter((el) => el.type === "IMAGE"));
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((el) => el.type === "IMAGE" && el.properties.assetKey === null)).toBe(true);

    const placed = buildTemplatePages("tpl_kpi_report", "fb_x", undefined, (file) => ({ assetKey: `assets/u1/${file}` }));
    const cover = placed[0].elements.find((el) => el.name === "Cover photo");
    expect(cover?.type === "IMAGE" && cover.properties.assetKey).toBe("assets/u1/kpi-report/cover.webp");
  });

  it("lists the bundled pictures on the pages a plan keeps", () => {
    expect(templatePhotoFiles("tpl_kpi_report")).toHaveLength(6);
    expect(templatePhotoFiles("tpl_kpi_report", 2)).toEqual(["kpi-report/cover.webp", "kpi-report/meeting.webp"]);
    expect(templatePhotoFiles("tpl_menu")).toEqual([]);
  });

  it("gives every bundled picture a file in public/templates", () => {
    for (const file of templatePhotoFiles("tpl_kpi_report")) {
      expect(existsSync(join(process.cwd(), "public", "templates", file)), file).toBe(true);
    }
  });

  it("can build just the cover for previews", () => {
    expect(buildTemplatePages("tpl_menu", "preview", 1)).toHaveLength(1);
    expect(buildTemplatePages("nope", "x")).toEqual([]);
  });
});
